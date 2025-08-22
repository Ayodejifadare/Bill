export default function generateInsights(transactions, userId) {
  const totalSent = transactions
    .filter(t => t.senderId === userId)
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  const insights = []

  if (totalSent === 0) {
    insights.push({ type: 'neutral', message: 'No spending recorded in this period.' })
  } else if (totalSent > 500) {
    insights.push({
      type: 'warning',
      message: `You\u2019ve spent $${totalSent.toFixed(2)} this period. Consider reviewing your expenses.`
    })
  } else if (totalSent < 100) {
    insights.push({
      type: 'positive',
      message: `Great job keeping your spending to $${totalSent.toFixed(2)}.`
    })
  } else {
    insights.push({ type: 'neutral', message: `You\u2019ve spent $${totalSent.toFixed(2)}.` })
  }

  return insights
}
