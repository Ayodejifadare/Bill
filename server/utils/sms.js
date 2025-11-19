// Optional Twilio integration. Avoid hard dependency when not configured.
const TWILIO_ACCOUNT_SID = (process.env.TWILIO_ACCOUNT_SID || "").trim();
const TWILIO_AUTH_TOKEN = (process.env.TWILIO_AUTH_TOKEN || "").trim();
const TWILIO_FROM_NUMBER = (process.env.TWILIO_FROM_NUMBER || "").trim();
const TWILIO_MESSAGING_SERVICE_SID = (
  process.env.TWILIO_MESSAGING_SERVICE_SID || ""
).trim();
const TWILIO_VERIFY_SERVICE_SID = (
  process.env.TWILIO_VERIFY_SERVICE_SID || ""
).trim();

let twilioClientPromise = null;

const hasTwilioCredentials = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN;
const hasProgrammableSms =
  hasTwilioCredentials &&
  (TWILIO_FROM_NUMBER || TWILIO_MESSAGING_SERVICE_SID);
const hasVerifyService = hasTwilioCredentials && TWILIO_VERIFY_SERVICE_SID;

if (hasTwilioCredentials && (hasProgrammableSms || hasVerifyService)) {
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
} else if (hasTwilioCredentials) {
  console.warn(
    "Twilio credentials detected but no messaging sender or Verify service is configured; SMS will be logged to console",
  );
} else {
  console.warn("Twilio credentials not set; SMS will be logged to console");
}

export function isTwilioVerifyEnabled() {
  return Boolean(hasVerifyService);
}

export async function sendSms(to, body) {
  try {
    if (!twilioClientPromise || !hasProgrammableSms) {
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

export async function startPhoneVerification(to) {
  if (!hasVerifyService || !twilioClientPromise) {
    return false;
  }
  const client = await twilioClientPromise;
  if (!client) {
    return false;
  }
  await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to, channel: "sms" });
  return true;
}

export async function checkPhoneVerification(to, code) {
  if (!hasVerifyService || !twilioClientPromise) {
    return { success: false, status: "unavailable" };
  }
  const client = await twilioClientPromise;
  if (!client) {
    return { success: false, status: "client_unavailable" };
  }
  const response = await client.verify.v2
    .services(TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to, code });
  const approved = response?.status === "approved";
  return { success: approved, status: response?.status ?? "unknown" };
}
