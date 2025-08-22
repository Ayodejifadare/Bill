/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import generateInsights from './insights.js'

describe('generateInsights', () => {
  const userId = 'u1'

  it('returns positive insight for low spending', () => {
    const transactions = [{ senderId: userId, amount: 50 }]
    const insights = generateInsights(transactions, userId)
    expect(insights).toHaveLength(1)
    expect(insights[0].type).toBe('positive')
  })

  it('returns warning insight for high spending', () => {
    const transactions = [{ senderId: userId, amount: 600 }]
    const insights = generateInsights(transactions, userId)
    expect(insights).toHaveLength(1)
    expect(insights[0].type).toBe('warning')
  })

  it('returns neutral insight when no spending', () => {
    const transactions = []
    const insights = generateInsights(transactions, userId)
    expect(insights).toHaveLength(1)
    expect(insights[0].type).toBe('neutral')
  })
})
