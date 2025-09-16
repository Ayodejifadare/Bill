// Optional Twilio integration. Avoid hard dependency when not configured.
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env

let twilioClientPromise = null

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  // Dynamically import only when credentials are present to avoid startup crashes
  twilioClientPromise = import('twilio')
    .then(mod => mod.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    .catch(err => {
      console.warn('Twilio package not available; falling back to console logging. Error:', err?.message)
      return null
    })
} else {
  console.warn('Twilio credentials not set; SMS will be logged to console')
}

export async function sendSms (to, body) {
  try {
    if (!twilioClientPromise) {
      console.log(`SMS to ${to}: ${body}`)
      return
    }
    const client = await twilioClientPromise
    if (!client) {
      console.log(`SMS to ${to}: ${body}`)
      return
    }
    await client.messages.create({ to, from: TWILIO_FROM_NUMBER, body })
  } catch (error) {
    console.error('Failed to send SMS:', error)
    // Do not crash the app in MVP; log and continue
  }
}
