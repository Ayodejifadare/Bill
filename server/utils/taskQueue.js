import Queue from 'bull'

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

export const recurringRequestQueue = new Queue('recurringRequestQueue', REDIS_URL)
export const recurringBillSplitQueue = new Queue('recurringBillSplitQueue', REDIS_URL)
