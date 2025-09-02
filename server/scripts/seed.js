import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { defaultSettings as defaultNotificationSettings } from '../routes/notifications.js'
import bcrypt from 'bcryptjs'

dotenv.config()

const prisma = new PrismaClient()

async function upsertUser({ email, name, phone, region = 'US', currency = 'USD' }) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12)
  const defaultPassword = 'password123'
  const hashed = await bcrypt.hash(defaultPassword, rounds)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, phone, region, currency, onboardingCompleted: true, password: hashed },
    create: {
      email,
      name,
      phone,
      region,
      currency,
      onboardingCompleted: true,
      password: hashed,
      tokenVersion: 0,
    },
    select: { id: true, email: true, name: true, phone: true }
  })
  // Ensure a notification preference row exists
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, preferences: JSON.stringify(defaultNotificationSettings) }
  })
  return user
}

async function ensureFriendship(user1Id, user2Id) {
  const [a, b] = [user1Id, user2Id].sort()
  await prisma.friendship.upsert({
    where: { user1Id_user2Id: { user1Id: a, user2Id: b } },
    update: {},
    create: { user1Id: a, user2Id: b }
  })
}

async function ensureGroup({ name, description, color }, memberIds, adminId) {
  let group = await prisma.group.findFirst({ where: { name } })
  if (!group) {
    group = await prisma.group.create({ data: { name, description, color } })
  }
  // Add admin
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: adminId } },
    update: { role: 'ADMIN' },
    create: { groupId: group.id, userId: adminId, role: 'ADMIN' }
  })
  // Add others as members
  for (const id of memberIds.filter(id => id !== adminId)) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: id } },
      update: { role: 'MEMBER' },
      create: { groupId: group.id, userId: id, role: 'MEMBER' }
    })
  }
  return group
}

async function ensureGroupAccounts(groupId, creatorId) {
  const count = await prisma.groupAccount.count({ where: { groupId } })
  if (count > 0) return
  await prisma.groupAccount.create({
    data: {
      groupId,
      createdById: creatorId,
      type: 'BANK',
      bank: 'Access Bank',
      accountNumber: '0123456789',
      accountName: 'Demo Account',
      sortCode: '044',
      isDefault: true,
      name: 'Demo Account - Access Bank'
    }
  })
  await prisma.groupAccount.create({
    data: {
      groupId,
      createdById: creatorId,
      type: 'MOBILE_MONEY',
      provider: 'Opay',
      phoneNumber: '+2348012345678',
      isDefault: false,
      name: 'Opay Mobile Money'
    }
  })
}

async function main() {
  console.log('Seeding database...')

  const alice = await upsertUser({ email: 'alice@example.com', name: 'Alice Johnson', phone: '+15550000001' })
  const bob   = await upsertUser({ email: 'bob@example.com',   name: 'Bob Smith',     phone: '+15550000002' })
  const carol = await upsertUser({ email: 'carol@example.com', name: 'Carol Davis',   phone: '+234800000003', region: 'NG', currency: 'NGN' })

  await ensureFriendship(alice.id, bob.id)
  await ensureFriendship(alice.id, carol.id)
  await ensureFriendship(bob.id, carol.id)

  const group = await ensureGroup(
    { name: 'Weekend Trip', description: 'Demo group for SplitBill', color: 'blue' },
    [alice.id, bob.id, carol.id],
    alice.id
  )

  await ensureGroupAccounts(group.id, alice.id)

  console.log('Seed complete.')
  console.log('Users:')
  console.log({ alice, bob, carol })
  console.log('Group:', group)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
