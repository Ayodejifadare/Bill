import express from 'express'

// Use mergeParams to access groupId from parent router
const router = express.Router({ mergeParams: true })

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

// List all accounts for a specific group
router.get('/', async (req, res) => {
  try {
    const accounts = await req.prisma.groupAccount.findMany({
      where: { groupId: req.params.groupId }
    })
    res.json({ accounts })
  } catch (error) {
    console.error('List group accounts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new account for a group
router.post('/', async (req, res) => {
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
    const userId = req.headers['x-user-id'] || 'current-user'
    const count = await req.prisma.groupAccount.count({ where: { groupId } })

    const account = await req.prisma.groupAccount.create({
      data: {
        groupId,
        createdById: userId,
        type: type === 'bank' ? 'BANK' : 'MOBILE_MONEY',
        bank: req.body.bank,
        accountNumber: req.body.accountNumber,
        accountName: req.body.accountName,
        provider: req.body.provider,
        phoneNumber: req.body.phoneNumber,
        isDefault: count === 0,
        name:
          type === 'bank'
            ? `${req.body.accountName} - ${req.body.bank}`
            : `${req.body.phoneNumber} - ${req.body.provider}`
      }
    })

    res.status(201).json({ account })
  } catch (error) {
    console.error('Create group account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update a specific account
router.put('/:accountId', async (req, res) => {
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

    res.json({ account: updated })
  } catch (error) {
    console.error('Update group account error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete an account from a group
router.delete('/:accountId', async (req, res) => {
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

