import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_MS = 30_000;
const DIGITS = 6;

export function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  const remainder = bits.length % 5;
  if (remainder) {
    const chunk = bits.slice(bits.length - remainder).padEnd(5, "0");
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

export function base32Decode(input) {
  const clean = String(input ?? "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/** RFC 4226 HOTP: HMAC-SHA1 over an 8-byte big-endian counter, dynamic truncation. */
export function hotpCode(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** RFC 6238 TOTP: HOTP over the 30-second step counter. */
export function totpCode(secretBase32, time = Date.now()) {
  return hotpCode(secretBase32, Math.floor(time / STEP_MS));
}

/**
 * Verifies a submitted code against the current step and `window` adjacent
 * steps (default ±1, i.e. ±30s clock drift tolerance). Digit comparison is
 * timing-safe.
 */
export function verifyTotp(secretBase32, code, { window = 1, time = Date.now() } = {}) {
  const clean = String(code ?? "").trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(time / STEP_MS);
  const submitted = Buffer.from(clean);
  for (let delta = -window; delta <= window; delta++) {
    const candidate = Buffer.from(hotpCode(secretBase32, counter + delta));
    if (candidate.length === submitted.length && crypto.timingSafeEqual(candidate, submitted))
      return true;
  }
  return false;
}

export function otpauthUri(secretBase32, label) {
  const issuer = "CYA Daily Verse";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

function encryptionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return crypto.createHash("sha256").update(`${secret}:totp-enc`).digest();
}

/** AES-256-GCM encrypt, packed as `iv:authTag:ciphertext` (all hex). */
export function encryptSecret(plainBase32) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainBase32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(packed) {
  const [ivHex, tagHex, dataHex] = String(packed ?? "").split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted TOTP secret.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plain.toString("utf8");
}
