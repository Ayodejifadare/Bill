import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { OAuth2Client } from "google-auth-library";
import authenticate from "../middleware/auth.js";
import { defaultSettings as defaultNotificationSettings } from "./notifications.js";
import {
  generateCode,
  cleanupExpiredCodes,
} from "../utils/verificationCodes.js";
import { sendSms } from "../utils/sms.js";

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not defined");
}

const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
const additionalGoogleAudiences = [
  ...(process.env.GOOGLE_ADDITIONAL_CLIENT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  ...(process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
];
const googleAudiences = Array.from(
  new Set(
    [
      googleClientId,
      ...additionalGoogleAudiences,
    ].filter(Boolean),
  ),
);

const getGoogleOAuthClient = () => {
  if (!googleClientId || !googleClientSecret) {
    return null;
  }
  return new OAuth2Client(googleClientId, googleClientSecret);
};

const REGION_CURRENCY_MAP = {
  NG: { region: "NG", currency: "NGN" },
  US: { region: "US", currency: "USD" },
  GB: { region: "GB", currency: "GBP" },
  CA: { region: "CA", currency: "CAD" },
  AU: { region: "AU", currency: "AUD" },
  EU: { region: "EU", currency: "EUR" },
};

const FALLBACK_REGION_CURRENCY = REGION_CURRENCY_MAP.NG;

function normalizeRegionCurrency(regionInput, currencyInput) {
  const regionKey =
    typeof regionInput === "string" ? regionInput.trim().toUpperCase() : "";
  if (regionKey && REGION_CURRENCY_MAP[regionKey]) {
    return REGION_CURRENCY_MAP[regionKey];
  }

  const currencyKey =
    typeof currencyInput === "string" ? currencyInput.trim().toUpperCase() : "";
  if (currencyKey) {
    const entry = Object.values(REGION_CURRENCY_MAP).find(
      (item) => item.currency === currencyKey,
    );
    if (entry) {
      return entry;
    }
  }

  return FALLBACK_REGION_CURRENCY;
}

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  balance: true,
  region: true,
  currency: true,
  onboardingCompleted: true,
  phoneVerified: true,
  emailVerified: true,
  idVerified: true,
  documentsSubmitted: true,
  tokenVersion: true,
  googleId: true,
};

const router = express.Router();

// Normalize phone to a consistent E.164-like key for OTP store and DB lookup
function normalizePhone(input = "") {
  const digits = String(input).replace(/\D/g, "");
  // We assume the client includes country code; we only strip formatting/leading zeros
  const national = digits.replace(/^0+/, "");
  return `+${national}`;
}

function deriveRegionCurrencyFromPhone(key = "") {
  const p = String(key);
  if (p.startsWith("+234")) return { region: "NG", currency: "NGN" };
  if (p.startsWith("+44")) return { region: "GB", currency: "GBP" };
  if (p.startsWith("+61")) return { region: "AU", currency: "AUD" };
  if (p.startsWith("+353")) return { region: "EU", currency: "EUR" };
  if (p.startsWith("+1")) return { region: "US", currency: "USD" };
  // Default to Nigeria if unknown to avoid USD fallback for new markets
  return { region: "NG", currency: "NGN" };
}

// Request OTP
router.post(
  "/request-otp",
  [body("phone").matches(/^\+?[1-9]\d{7,14}$/)],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone } = req.body;
      const key = normalizePhone(phone);
      await cleanupExpiredCodes(req.prisma);
      const otp = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await req.prisma.verificationCode.upsert({
        where: { target_type: { target: key, type: "auth" } },
        update: { code: otp, expiresAt },
        create: { target: key, type: "auth", code: otp, expiresAt },
      });
      await sendSms(key, `Your verification code is ${otp}`);

      // In development, include OTP in response to simplify local testing
      const payload = { message: "OTP sent" };
      if (process.env.NODE_ENV === "development") {
        payload.otp = otp;
      }
      res.json(payload);
    } catch (error) {
      console.error("OTP request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Verify OTP
router.post(
  "/verify-otp",
  [
    body("phone").matches(/^\+?[1-9]\d{7,14}$/),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be exactly 6 digits")
      .isNumeric()
      .withMessage("OTP must contain only numbers"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, otp } = req.body;
      const key = normalizePhone(phone);
      await cleanupExpiredCodes(req.prisma);
      const entry = await req.prisma.verificationCode.findUnique({
        where: { target_type: { target: key, type: "auth" } },
      });
      if (!entry || entry.code !== otp || entry.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      await req.prisma.verificationCode.delete({ where: { id: entry.id } });

      let user = await req.prisma.user.findFirst({ where: { phone: key } });
      if (!user) {
        if (
          process.env.NODE_ENV === "development" ||
          process.env.AUTO_CREATE_USER_ON_OTP === "true"
        ) {
          const { region, currency } = deriveRegionCurrencyFromPhone(key);
          const email = `otp_${key.replace(/\D/g, "")}@demo.local`;
          try {
            user = await req.prisma.user.create({
              data: {
                email,
                name: "Demo User",
                phone: key,
                region,
                currency,
                onboardingCompleted: true,
                password: "",
                tokenVersion: 0,
              },
            });
            // Ensure default notification preferences
            await req.prisma.notificationPreference.upsert({
              where: { userId: user.id },
              update: {},
              create: {
                userId: user.id,
                preferences: JSON.stringify(defaultNotificationSettings),
              },
            });
          } catch (e) {
            console.error("Auto-create user on OTP failed:", e);
            return res.status(404).json({ error: "User not found" });
          }
        } else {
          return res.status(404).json({ error: "User not found" });
        }
      }

      const token = jwt.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "OTP verified",
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Register user
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().isLength({ min: 2 }),
    body("lastName").trim().isLength({ min: 2 }),
    body("phone").matches(/^\+?[1-9]\d{7,14}$/),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, phone } = req.body;
      const normalizedPhone = normalizePhone(phone);

      const name = `${firstName} ${lastName}`.trim();

      // Check if user already exists
      const existingUser = await req.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const existingPhoneUser = await req.prisma.user.findFirst({
        where: { phone: normalizedPhone },
      });

      if (existingPhoneUser) {
        return res.status(400).json({ error: "Phone already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const { region, currency } =
        deriveRegionCurrencyFromPhone(normalizedPhone);
      const user = await req.prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          firstName,
          lastName,
          phone: normalizedPhone,
          region,
          currency,
          // Ensure new accounts pass onboarding gate until full onboarding flow exists
          onboardingCompleted: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          balance: true,
          createdAt: true,
          phoneVerified: true,
          emailVerified: true,
          idVerified: true,
          documentsSubmitted: true,
          onboardingCompleted: true,
        },
      });

      // Generate JWT token including token version
      const token = jwt.sign({ userId: user.id, tokenVersion: 0 }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "User created successfully",
        user,
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Google OAuth sign-in/sign-up
router.post(
  "/google",
  [
    body("code")
      .isString()
      .notEmpty()
      .withMessage("Authorization code is required"),
    body("region").optional().isString(),
    body("currency").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const oauthClient = getGoogleOAuthClient();
      if (!oauthClient) {
        return res
          .status(503)
          .json({ error: "Google sign-in is not configured" });
      }

      const { code, region, currency } = req.body;
      let tokens;
      try {
        const tokenResponse = await oauthClient.getToken({
          code,
          redirect_uri: "postmessage",
        });
        tokens = tokenResponse.tokens;
      } catch (tokenError) {
        console.error("Google token exchange failed:", tokenError);
        return res
          .status(400)
          .json({ error: "Invalid Google authorization code" });
      }

      if (!tokens?.id_token) {
        return res.status(400).json({ error: "Missing Google ID token" });
      }

      const audienceSetting =
        googleAudiences.length === 1 ? googleAudiences[0] : googleAudiences;
      let payload;
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: googleAudiences.length ? audienceSetting : undefined,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.error("Google ID token verification failed:", verifyError);
        return res
          .status(400)
          .json({ error: "Unable to verify Google credentials" });
      }

      if (!payload) {
        return res.status(400).json({ error: "Google profile is unavailable" });
      }

      const googleSub = payload.sub;
      const email = (payload.email || "").toLowerCase();
      if (!googleSub || !email) {
        return res
          .status(400)
          .json({ error: "Google account is missing required data" });
      }

      const nameFromPayload = String(payload.name || "").trim();
      const derivedName = [payload.given_name, payload.family_name]
        .map((part) => (part ? String(part).trim() : ""))
        .filter(Boolean)
        .join(" ")
        .trim();
      const displayName =
        nameFromPayload || derivedName || email.split("@")[0] || "Google User";
      const normalizedRegion = normalizeRegionCurrency(region, currency);
      const givenName =
        typeof payload.given_name === "string"
          ? payload.given_name.trim()
          : null;
      const familyName =
        typeof payload.family_name === "string"
          ? payload.family_name.trim()
          : null;
      const picture =
        typeof payload.picture === "string" ? payload.picture.trim() : null;
      const emailIsVerified = Boolean(payload.email_verified);

      let user = await req.prisma.user.findFirst({
        where: {
          OR: [{ googleId: googleSub }, { email }],
        },
        select: authUserSelect,
      });

      let isNewUser = false;
      if (!user) {
        user = await req.prisma.user.create({
          data: {
            email,
            name: displayName,
            firstName: givenName,
            lastName: familyName,
            googleId: googleSub,
            avatar: picture,
            password: "",
            region: normalizedRegion.region,
            currency: normalizedRegion.currency,
            emailVerified: emailIsVerified,
            onboardingCompleted: true,
          },
          select: authUserSelect,
        });
        isNewUser = true;

        await req.prisma.notificationPreference.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            preferences: JSON.stringify(defaultNotificationSettings),
          },
        });
      } else {
        const updates = {};
        if (!user.googleId) {
          updates.googleId = googleSub;
        }
        if (!user.emailVerified && emailIsVerified) {
          updates.emailVerified = true;
        }
        if (!user.avatar && picture) {
          updates.avatar = picture;
        }
        if (!user.name && displayName) {
          updates.name = displayName;
        }
        if (!user.firstName && givenName) {
          updates.firstName = givenName;
        }
        if (!user.lastName && familyName) {
          updates.lastName = familyName;
        }

        if (Object.keys(updates).length > 0) {
          user = await req.prisma.user.update({
            where: { id: user.id },
            data: updates,
            select: authUserSelect,
          });
        }
      }

      if (tokens?.access_token) {
        oauthClient
          .revokeToken(tokens.access_token)
          .catch((revokeError) =>
            console.warn("Failed to revoke Google access token", revokeError),
          );
      }

      const token = jwt.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      const { googleId: _googleId, ...userWithoutProvider } = user;

      res.json({
        token,
        user: userWithoutProvider,
        isNewUser,
        provider: "google",
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res
        .status(500)
        .json({ error: "Failed to authenticate with Google. Try again later." });
    }
  },
);

// Login user
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").exists()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await req.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Check password (handle invalid/legacy hashes gracefully)
      if (
        typeof user.password !== "string" ||
        !user.password.startsWith("$2")
      ) {
        return res.status(400).json({ error: "Invalid credentials" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Generate JWT token including token version
      const token = jwt.sign(
        { userId: user.id, tokenVersion: user.tokenVersion },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get current user
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        balance: true,
        avatar: true,
        createdAt: true,
        tokenVersion: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        documentsSubmitted: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout user by invalidating existing tokens
router.post("/logout", authenticate, async (req, res) => {
  try {
    await req.prisma.user.update({
      where: { id: req.userId },
      data: { tokenVersion: { increment: 1 } },
    });

    res.json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
