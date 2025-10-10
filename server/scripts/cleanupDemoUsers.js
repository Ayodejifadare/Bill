// Cleanup demo users and all dependent records.
// SAFETY: Defaults to dry-run. Set CONFIRM=1 to actually delete.
// Target users via one of:
//  - DEMO_EMAILS: comma-separated exact emails
//  - DEMO_EMAIL_DOMAIN: e.g. example.com (matches endsWith)
//  - DEMO_EMAIL_PATTERN: substring to match (case-insensitive), e.g. demo
// If none provided, defaults to DEMO_EMAIL_PATTERN=demo

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function buildUserWhere() {
  const emailsCsv = process.env.DEMO_EMAILS?.trim()
  const domain = process.env.DEMO_EMAIL_DOMAIN?.trim()
  const pattern = (process.env.DEMO_EMAIL_PATTERN ?? 'demo').trim()

  if (emailsCsv) {
    const list = emailsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length) return { email: { in: list } }
  }
  if (domain) return { email: { endsWith: `@${domain}` } }
  if (pattern) return { email: { contains: pattern, mode: 'insensitive' } }
  return {}
}

async function main() {
  const confirm = ['1', 'true', 'yes'].includes(String(process.env.CONFIRM ?? '').toLowerCase())
  const where = buildUserWhere()

  const demoUsers = await prisma.user.findMany({ where, select: { id: true, email: true } })
  if (!demoUsers.length) {
    console.log('No matching demo users found with filter:', where)
    return
  }
  const ids = demoUsers.map((u) => u.id)
  console.log(`Matched ${ids.length} user(s):`)
  demoUsers.forEach((u) => console.log(` - ${u.email} (${u.id})`))

  // Collect related IDs to avoid FK issues
  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
    select: { id: true }
  })
  const transactionIds = transactions.map((t) => t.id)

  const billSplitsCreated = await prisma.billSplit.findMany({
    where: { createdBy: { in: ids } },
    select: { id: true }
  })
  const billSplitIds = billSplitsCreated.map((b) => b.id)

  console.log(`Related counts:`)
  console.log(` - transactions (sender/receiver): ${transactionIds.length}`)
  console.log(` - billSplits created: ${billSplitIds.length}`)

  if (!confirm) {
    console.log('\nDry run only. Set CONFIRM=1 to delete.')
    return
  }

  await prisma.$transaction(async (tx) => {
    // Remove dependent rows that can block deletes (order matters)
    await tx.verificationCode.deleteMany({ where: { userId: { in: ids } } })
    await tx.notificationPreference.deleteMany({ where: { userId: { in: ids } } })
    await tx.notification.deleteMany({
      where: { OR: [{ recipientId: { in: ids } }, { actorId: { in: ids } }] }
    })

    await tx.paymentReference.deleteMany({
      where: {
        OR: [
          { userId: { in: ids } },
          { transactionId: { in: transactionIds } },
          { billSplitId: { in: billSplitIds } }
        ]
      }
    })

    await tx.paymentMethod.deleteMany({ where: { userId: { in: ids } } })
    await tx.paymentRequest.deleteMany({
      where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] }
    })

    await tx.groupMember.deleteMany({ where: { userId: { in: ids } } })
    await tx.groupAccount.deleteMany({ where: { createdById: { in: ids } } })

    await tx.friendship.deleteMany({
      where: { OR: [{ user1Id: { in: ids } }, { user2Id: { in: ids } }] }
    })
    await tx.friendRequest.deleteMany({
      where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] }
    })

    await tx.billSplitParticipant.deleteMany({ where: { userId: { in: ids } } })

    // Any reminders tied to these users or their created bill splits
    await tx.billSplitReminder.deleteMany({
      where: {
        OR: [
          { senderId: { in: ids } },
          { recipientId: { in: ids } },
          { billSplitId: { in: billSplitIds } }
        ]
      }
    })

    // Receipts/Invoices referencing transactions or bill splits
    if (transactionIds.length || billSplitIds.length) {
      await tx.receipt.deleteMany({
        where: {
          OR: [
            { transactionId: { in: transactionIds } },
            { billSplitId: { in: billSplitIds } }
          ]
        }
      })
      await tx.invoice.deleteMany({
        where: {
          OR: [
            { transactionId: { in: transactionIds } },
            { billSplitId: { in: billSplitIds } }
          ]
        }
      })
    }

    // Transactions by/with these users
    await tx.transaction.deleteMany({
      where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] }
    })

    // BillSplits created by these users (do not delete ones merely participated in)
    if (billSplitIds.length) {
      await tx.billSplit.deleteMany({ where: { id: { in: billSplitIds } } })
    }

    await tx.securityLog.deleteMany({ where: { userId: { in: ids } } })

    // Finally, delete users
    await tx.user.deleteMany({ where: { id: { in: ids } } })
  })

  console.log('Cleanup complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

