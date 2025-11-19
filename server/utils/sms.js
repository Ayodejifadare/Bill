// Optional Twilio integration. Avoid hard dependency when not configured.
const TWILIO_ACCOUNT_SID = (process.env.TWILIO_ACCOUNT_SID || "").trim();
const TWILIO_AUTH_TOKEN = (process.env.TWILIO_AUTH_TOKEN || "").trim();
const TWILIO_FROM_NUMBER = (process.env.TWILIO_FROM_NUMBER || "").trim();
const TWILIO_MESSAGING_SERVICE_SID = (
  process.env.TWILIO_MESSAGING_SERVICE_SID || ""
).trim();

let twilioClientPromise = null;

const hasProgrammableSms =
  TWILIO_ACCOUNT_SID &&
  TWILIO_AUTH_TOKEN &&
  (TWILIO_FROM_NUMBER || TWILIO_MESSAGING_SERVICE_SID);

if (hasProgrammableSms) {
  // Dynamically import only when credentials are present to avoid startup crashes
  twilioClientPromise = import("twilio")
    .then((mod) => mod.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    .catch((err) => {
      console.warn(
        "Twilio package not available; falling back to console logging. Error:",
        err?.message,
      );
      return null;
    });
} else if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  console.warn(
    "Twilio credentials detected but no phone number or messaging service is configured; SMS will be logged to console",
  );
} else {
  console.warn("Twilio credentials not set; SMS will be logged to console");
}

export async function sendSms(to, body) {
  try {
    if (!twilioClientPromise) {
      console.log(`SMS to ${to}: ${body}`);
      return;
    }
    const client = await twilioClientPromise;
    if (!client) {
      console.log(`SMS to ${to}: ${body}`);
      return;
    }
    const payload = { to, body };
    if (TWILIO_MESSAGING_SERVICE_SID) {
      payload.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else if (TWILIO_FROM_NUMBER) {
      payload.from = TWILIO_FROM_NUMBER;
    } else {
      console.log(`SMS to ${to}: ${body}`);
      return;
    }
    await client.messages.create(payload);
  } catch (error) {
    console.error("Failed to send SMS:", error);
    // Do not crash the app in MVP; log and continue
  }
}
