import express from 'express'
import authenticate from '../middleware/auth.js'

// Use mergeParams to access groupId from parent router
const router = express.Router({ mergeParams: true })
router.use(authenticate)

const requireGroupAdmin = async (req, res, next) => {
  try {
    const membership = await req.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.user.id
        }
      }
    })
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  } catch (err) {
    console.error('Group admin check error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '023', name: 'Citi Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'GTBank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '057', name: 'Zenith Bank' }
]

const US_BANKS = [
  { code: '021000021', name: 'Chase Bank' },
  { code: '026009593', name: 'Bank of America' },
  { code: '121000248', name: 'Wells Fargo' }
]

const MOBILE_MONEY_PROVIDERS = [
  { code: 'opay', name: 'Opay' },
  { code: 'palmpay', name: 'PalmPay' },
  { code: 'kuda', name: 'Kuda Bank' },
  { code: 'moniepoint', name: 'Moniepoint' }
]

const isValidBank = (bank) => {
  return [...NIGERIAN_BANKS, ...US_BANKS].some((b) => b.name === bank)
}

const isValidProvider = (provider) => {
  return MOBILE_MONEY_PROVIDERS.some((p) => p.name === provider)
}

const formatAccount = (account) => ({
  id: account.id,
  groupId: account.groupId,
  createdById: account.createdById,
  name: account.name,
  type: account.type === 'BANK' ? 'bank' : 'mobile_money',
  bankName: account.bank,
  accountNumber: account.accountNumber,
  accountHolderName: account.accountName,
  sortCode: account.sortCode,
  routingNumber: account.routingNumber,
  provider: account.provider,
  phoneNumber: account.phoneNumber,
  isDefault: account.isDefault,
  createdAt: account.createdAt
})

// List all accounts for a specific group
router.get('/', async (req, res) => {
  try {
    const accounts = await req.prisma.groupAccount.findMany({
      where: { groupId: req.params.groupId }
    })
    res.json({ accounts: accounts.map(formatAccount) })
  } catch (error) {
    console.error('List group accounts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new account for a group
router.post('/', requireGroupAdmin, async (req, res) => {
  try {
    const { type } = req.body
    if (type === 'bank') {
      const { bank, accountNumber, accountName } = req.body
      if (!bank || !accountNumber || !accountName || !isValidBank(bank)) {
        return res.status(400).json({ error: 'Invalid bank details' })
      }
    } else if (type === 'mobile_money') {
      const { provider, phoneNumber } = req.body
      if (!provider || !phoneNumber || !isValidProvider(provider)) {
        return res.status(400).json({ error: 'Invalid provider details' })
      }
    } else {
      return res.status(400).json({ error: 'Invalid account type' })
    }

    const groupId = req.params.groupId
    const userId = req.user.id
    const count = await req.prisma.groupAccount.count({ where: { groupId } })

    const account = await req.prisma.groupAccount.create({
      data: {
        groupId,
        createdById: userId,
        type: type === 'bank' ? 'BANK' : 'MOBILE_MONEY',
        bank: req.body.bank,
        accountNumber: req.body.accountNumber,
        accountName: req.body.accountName,
        sortCode: req.body.sortCode,
        routingNumber: req.body.routingNumber,
        provider: req.body.provider,
        phoneNumber: req.body.phoneNumber,
        isDefault: count === 0,
        name:
          type === 'bank'
            ? `${req.body.accountName} - ${req.body.bank}`
            : `${req.body.phoneNumber} - ${req.body.provider}`
      }
    })

    res.status(201).json({ account: formatAccount(account) })
  } catch (error) {
    console.error('Create group account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update a specific account
router.put('/:accountId', requireGroupAdmin, async (req, res) => {
  try {
    const account = await req.prisma.groupAccount.findFirst({
      where: { id: req.params.accountId, groupId: req.params.groupId }
    })
    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    if (req.body.isDefault) {
      await req.prisma.groupAccount.updateMany({
        where: { groupId: req.params.groupId },
        data: { isDefault: false }
      })
    }

    const updated = await req.prisma.groupAccount.update({
      where: { id: account.id },
      data: { ...req.body }
    })

    res.json({ account: formatAccount(updated) })
  } catch (error) {
    console.error('Update group account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete an account from a group
router.delete('/:accountId', requireGroupAdmin, async (req, res) => {
  try {
    const account = await req.prisma.groupAccount.findFirst({
      where: { id: req.params.accountId, groupId: req.params.groupId }
    })
    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    await req.prisma.groupAccount.delete({ where: { id: account.id } })

    if (account.isDefault) {
      const first = await req.prisma.groupAccount.findFirst({
        where: { groupId: req.params.groupId },
        orderBy: { createdAt: 'asc' }
      })
      if (first) {
        await req.prisma.groupAccount.update({
          where: { id: first.id },
          data: { isDefault: true }
        })
      }
    }

    res.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Delete group account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

