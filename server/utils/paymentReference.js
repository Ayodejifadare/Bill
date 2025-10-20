import crypto from "crypto";

// Crockford Base32 alphabet (no I, L, O, U by convention; keep uppercase alnum)
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function toBase32(bytes) {
  // Convert a Buffer/Uint8Array into Crockford Base32 string
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function encodeTimestampBase32(tsMs, length = 8) {
  // Encode timestamp (ms) into fixed-length Base32 string
  let n = BigInt(tsMs);
  const base = 32n;
  const chars = [];
  while (n > 0n) {
    const rem = Number(n % base);
    chars.push(ALPHABET[rem]);
    n = n / base;
  }
  while (chars.length < length) chars.push("0");
  return chars.reverse().join("").slice(-length);
}

function randomBase32(length = 8) {
  // Generate enough random bytes to cover length*5 bits
  const totalBits = length * 5;
  const byteLen = Math.ceil(totalBits / 8);
  const bytes = crypto.randomBytes(byteLen);
  const full = toBase32(bytes);
  // Slice to required length
  return full.slice(0, length).padEnd(length, "0");
}

function alnumToNumericString(s) {
  // Map 0-9 => 0-9, A-Z => 10-35 into a numeric string for mod97
  let out = "";
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        out += String(code - 55); // 'A' -> 10
      } else if (code >= 97 && code <= 122) {
        out += String(code - 87); // 'a' -> 10
      } else {
        out += "0";
      }
    }
  }
  return out;
}

function mod97(numStr) {
  // Process numeric string in chunks to avoid BigInt overflow
  let remainder = 0;
  for (let i = 0; i < numStr.length; i += 7) {
    const block = numStr.slice(i, i + 7);
    remainder = Number((BigInt(remainder) * 10n ** BigInt(block.length) + BigInt(block)) % 97n);
  }
  return remainder;
}

function computeCheckDigits(compact) {
  // ISO 7064 mod 97-10 style: append "00", compute remainder, then 98 - rem
  const prepared = alnumToNumericString(compact + "00");
  const rem = mod97(prepared);
  const check = (98 - rem) % 97;
  return String(check).padStart(2, "0");
}

export function generateReference({ type = "TRF", region = "US" } = {}) {
  const t = String(type || "TRF").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  const r = String(region || "US").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);

  const ts = encodeTimestampBase32(Date.now(), 8);
  const rand = randomBase32(8);
  const core = `${t}-${r}-${ts}${rand}`.toUpperCase();
  const compact = core.replace(/-/g, "");
  const chk = computeCheckDigits(compact);
  return `${t}-${r}-${ts}${rand}-${chk}`;
}

export function validateReference(code) {
  if (!code || typeof code !== "string") return { valid: false, reason: "empty" };
  const cleaned = code.toUpperCase();
  const parts = cleaned.split("-");
  if (parts.length < 4) return { valid: false, reason: "format" };
  const [t, r, tr, chk] = [parts[0], parts[1], parts[2], parts[3]];
  if (!t || !r || !tr || !chk) return { valid: false, reason: "format" };
  if (!/^[A-Z0-9]+$/.test(t) || !/^[A-Z0-9]+$/.test(r) || !/^[A-Z0-9]+$/.test(tr) || !/^\d{2}$/.test(chk)) {
    return { valid: false, reason: "chars" };
  }
  const compact = (t + r + tr).toUpperCase();
  const expected = computeCheckDigits(compact);
  return { valid: expected === chk, reason: expected === chk ? undefined : "checksum" };
}

// Numeric-only bank-safe reference (avoids words/prefixes and separators)
export function generateBankSafeReference({ dateMs = Date.now(), totalLength = 16 } = {}) {
  const d = new Date(dateMs);
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`; // 8 digits

  const baseLen = Math.max(10, Math.min(26, totalLength - 2)); // leave 2 for checksum
  let base = dateStr;
  if (base.length > baseLen) {
    // If requested length is very small, take tail of dateStr
    base = dateStr.slice(-baseLen);
  } else {
    const needed = baseLen - base.length;
    const bytes = crypto.randomBytes(Math.ceil(needed / 2));
    let digits = "";
    for (const b of bytes) digits += (b % 100).toString().padStart(2, "0");
    base += digits.slice(0, needed);
  }
  const chk = computeCheckDigits(base);
  return `${base}${chk}`;
}

export function validateBankSafeReference(code) {
  if (!code || typeof code !== "string") return { valid: false, reason: "empty" };
  const cleaned = code.replace(/\D/g, "");
  if (cleaned.length < 12) return { valid: false, reason: "length" };
  const body = cleaned.slice(0, -2);
  const chk = cleaned.slice(-2);
  const expected = computeCheckDigits(body);
  return { valid: expected === chk, reason: expected === chk ? undefined : "checksum" };
}

export default { generateReference, validateReference, generateBankSafeReference, validateBankSafeReference };
