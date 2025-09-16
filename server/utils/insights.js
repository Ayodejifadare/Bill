function getLocaleForRegion(region) {
  const r = String(region || '').toUpperCase()
  if (r === 'NG') return 'en-NG'
  if (r === 'US') return 'en-US'
  if (r === 'GB') return 'en-GB'
  if (r === 'CA') return 'en-CA'
  if (r === 'AU') return 'en-AU'
  if (r === 'EU') return 'en-IE'
  return 'en-US'
}

function currencyFromRegion(region) {
  const r = String(region || '').toUpperCase()
  if (r === 'NG') return 'NGN'
  if (r === 'US') return 'USD'
  if (r === 'GB') return 'GBP'
  if (r === 'CA') return 'CAD'
  if (r === 'AU') return 'AUD'
  if (r === 'EU') return 'EUR'
  return 'USD'
}

function symbolFallback(currency) {
  const c = String(currency || '').toUpperCase()
  if (c === 'NGN') return '₦'
  if (c === 'USD') return '$'
  if (c === 'GBP') return '£'
  if (c === 'CAD') return '$'
  if (c === 'AUD') return '$'
  if (c === 'EUR') return '€'
  return '$'
}

function formatCurrencyServer(amount, { region, currency } = {}) {
  const cur = currency || currencyFromRegion(region)
  const locale = getLocaleForRegion(region)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, currencyDisplay: 'symbol', maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${symbolFallback(cur)}${Number(amount || 0).toFixed(2)}`
  }
}

export default function generateInsights(transactions, userId, opts = {}) {
  const totalSent = transactions
    .filter(t => t.senderId === userId)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const insights = []

  if (totalSent === 0) {
    insights.push({ type: 'neutral', message: 'No spending recorded in this period.' })
  } else if (totalSent > 500) {
    insights.push({
      type: 'warning',
      message: `You\u2019ve spent ${formatCurrencyServer(totalSent, opts)} this period. Consider reviewing your expenses.`
    })
  } else if (totalSent < 100) {
    insights.push({
      type: 'positive',
      message: `Great job keeping your spending to ${formatCurrencyServer(totalSent, opts)}.`
    })
  } else {
    insights.push({ type: 'neutral', message: `You\u2019ve spent ${formatCurrencyServer(totalSent, opts)}.` })
  }

  return insights
}
