// Backfill existing users' region and currency based on phone country code
// Usage: node scripts/backfill-region-currency.js [--dry-run]

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true'

function normalizePhone(input = '') {
  const digits = String(input).replace(/\D/g, '')
  const national = digits.replace(/^0+/, '')
  return national ? `+${national}` : ''
}

function deriveRegionCurrencyFromPhone(key = '') {
  const p = String(key)
  if (p.startsWith('+234')) return { region: 'NG', currency: 'NGN' }
  if (p.startsWith('+44')) return { region: 'GB', currency: 'GBP' }
  if (p.startsWith('+61')) return { region: 'AU', currency: 'AUD' }
  if (p.startsWith('+353')) return { region: 'EU', currency: 'EUR' }
  if (p.startsWith('+1')) return { region: 'US', currency: 'USD' }
  // Default to Nigeria if unknown to avoid USD fallback for new markets
  return { region: 'NG', currency: 'NGN' }
}

async function main() {
  let updated = 0
  let inspected = 0
  const pageSize = 200
  let cursor = null

  console.log(`[backfill] Starting backfill (dryRun=${DRY_RUN})`)

  while (true) {
    const users = await prisma.user.findMany({
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, phone: true, region: true, currency: true }
    })
    if (users.length === 0) break

    for (const u of users) {
      inspected++
      const phone = normalizePhone(u.phone || '')
      if (!phone) continue
      const { region, currency } = deriveRegionCurrencyFromPhone(phone)

      const needsUpdate =
        (u.region !== region) ||
        (u.currency !== currency)

      if (needsUpdate) {
        console.log(`[backfill] user=${u.id} phone=${phone} ${u.region}/${u.currency} -> ${region}/${currency}`)
        if (!DRY_RUN) {
          await prisma.user.update({
            where: { id: u.id },
            data: { region, currency }
          })
        }
        updated++
      }
    }

    cursor = users[users.length - 1].id
  }

  console.log(`[backfill] Done. inspected=${inspected} updated=${updated} dryRun=${DRY_RUN}`)
}

main().catch((e) => {
  console.error('[backfill] Error:', e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})

