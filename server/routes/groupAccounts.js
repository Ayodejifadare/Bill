import express from 'express';

const router = express.Router();

const groupAccounts = {};

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
];

const US_BANKS = [
  { code: '021000021', name: 'Chase Bank' },
  { code: '026009593', name: 'Bank of America' },
  { code: '121000248', name: 'Wells Fargo' }
];

const MOBILE_MONEY_PROVIDERS = [
  { code: 'opay', name: 'Opay' },
  { code: 'palmpay', name: 'PalmPay' },
  { code: 'kuda', name: 'Kuda Bank' },
  { code: 'moniepoint', name: 'Moniepoint' }
];

const isValidBank = (bank) => {
  return [...NIGERIAN_BANKS, ...US_BANKS].some(b => b.name === bank);
};

const isValidProvider = (provider) => {
  return MOBILE_MONEY_PROVIDERS.some(p => p.name === provider);
};

router.get('/:groupId/accounts', (req, res) => {
  const accounts = groupAccounts[req.params.groupId] || [];
  res.json({ accounts });
});

router.post('/:groupId/accounts', (req, res) => {
  const { type } = req.body;
  if (type === 'bank') {
    const { bank, accountNumber, accountName } = req.body;
    if (!bank || !accountNumber || !accountName || !isValidBank(bank)) {
      return res.status(400).json({ error: 'Invalid bank details' });
    }
  } else if (type === 'mobile_money') {
    const { provider, phoneNumber } = req.body;
    if (!provider || !phoneNumber || !isValidProvider(provider)) {
      return res.status(400).json({ error: 'Invalid provider details' });
    }
  } else {
    return res.status(400).json({ error: 'Invalid account type' });
  }

  const list = groupAccounts[req.params.groupId] || [];
  const newAccount = {
    id: Date.now().toString(),
    name:
      type === 'bank'
        ? `${req.body.accountName} - ${req.body.bank}`
        : `${req.body.phoneNumber} - ${req.body.provider}`,
    isDefault: list.length === 0,
    createdBy: 'Server',
    createdDate: new Date().toISOString(),
    ...req.body
  };
  list.push(newAccount);
  groupAccounts[req.params.groupId] = list;
  res.status(201).json({ account: newAccount });
});

router.put('/:groupId/accounts/:accountId', (req, res) => {
  const list = groupAccounts[req.params.groupId] || [];
  const idx = list.findIndex(a => a.id === req.params.accountId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Account not found' });
  }
  if (req.body.isDefault) {
    list.forEach(a => {
      a.isDefault = false;
    });
    list[idx].isDefault = true;
  } else {
    list[idx] = { ...list[idx], ...req.body };
  }
  res.json({ account: list[idx] });
});

router.delete('/:groupId/accounts/:accountId', (req, res) => {
  const list = groupAccounts[req.params.groupId] || [];
  const idx = list.findIndex(a => a.id === req.params.accountId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Account not found' });
  }
  const [removed] = list.splice(idx, 1);
  if (removed.isDefault && list.length > 0) {
    list[0].isDefault = true;
  }
  groupAccounts[req.params.groupId] = list;
  res.json({ message: 'Deleted' });
});

export default router;

