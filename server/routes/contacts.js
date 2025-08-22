import express from 'express'
import authenticate from '../middleware/auth.js'

const router = express.Router()

// Ensure all routes require authentication
router.use(authenticate)

// Match provided contacts against existing users
router.post('/match', async (req, res) => {
  try {
    const { contacts } = req.body
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Invalid contacts format' })
    }

    const emails = new Set()
    const phones = new Set()

    contacts.forEach(c => {
      if (Array.isArray(c.emails)) {
        c.emails.forEach(e => {
          if (typeof e === 'string' && e.trim()) {
            emails.add(e.trim().toLowerCase())
          }
        })
      } else if (typeof c.email === 'string' && c.email.trim()) {
        emails.add(c.email.trim().toLowerCase())
      }

      if (Array.isArray(c.phoneNumbers)) {
        c.phoneNumbers.forEach(p => {
          if (typeof p === 'string' && p.trim()) {
            phones.add(p.replace(/[^0-9+]/g, ''))
          }
        })
      } else if (typeof c.phone === 'string' && c.phone.trim()) {
        phones.add(c.phone.replace(/[^0-9+]/g, ''))
      } else if (typeof c.phoneNumber === 'string' && c.phoneNumber.trim()) {
        phones.add(c.phoneNumber.replace(/[^0-9+]/g, ''))
      }
    })

    const whereClauses = []
    if (emails.size > 0) {
      whereClauses.push({ email: { in: Array.from(emails) } })
    }
    if (phones.size > 0) {
      whereClauses.push({ phone: { in: Array.from(phones) } })
    }

    if (whereClauses.length === 0) {
      return res.json({ contacts: [] })
    }

    const users = await req.prisma.user.findMany({
      where: { OR: whereClauses },
      select: { id: true, name: true, email: true, phone: true, avatar: true }
    })

    const matched = users.map(u => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      username: u.email,
      avatar: u.avatar,
      status: 'existing_user'
    }))

    res.json({ contacts: matched })
  } catch (error) {
    console.error('Match contacts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

