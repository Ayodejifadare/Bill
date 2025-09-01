import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const prisma = new PrismaClient()

try {
  const users = await prisma.user.findMany({ select: { id: true, email: true, phone: true } })
  console.log('Users:', users)
  console.log('Count:', users.length)
} catch (e) {
  console.error('Error inspecting users:', e)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}

