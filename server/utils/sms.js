import twilio from 'twilio'

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env

let client
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
} else {
  console.warn('Twilio credentials not set; SMS will be logged')
}

export async function sendSms (to, body) {
  if (!client) {
    console.log(`SMS to ${to}: ${body}`)
    return
  }
  try {
    await client.messages.create({ to, from: TWILIO_FROM_NUMBER, body })
  } catch (error) {
    console.error('Failed to send SMS via Twilio:', error)
    throw error
  }
}
