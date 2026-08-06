import test, { before } from "node:test";
import assert from "node:assert/strict";
import {
  base32Encode,
  base32Decode,
  generateSecret,
  hotpCode,
  totpCode,
  verifyTotp,
  otpauthUri,
  encryptSecret,
  decryptSecret,
} from "../src/server/utils/totp.js";

before(() => {
  process.env.AUTH_SECRET = "test-secret-for-totp-unit-tests";
});

// --- base32 (RFC 4648 §10 test vectors) -------------------------------------

test("base32Encode matches RFC 4648 test vectors", () => {
  assert.equal(base32Encode(Buffer.from("")), "");
  assert.equal(base32Encode(Buffer.from("f")), "MY");
  assert.equal(base32Encode(Buffer.from("fo")), "MZXQ");
  assert.equal(base32Encode(Buffer.from("foo")), "MZXW6");
  assert.equal(base32Encode(Buffer.from("foob")), "MZXW6YQ");
  assert.equal(base32Encode(Buffer.from("fooba")), "MZXW6YTB");
  assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
});

test("base32Decode reverses base32Encode", () => {
  const raw = Buffer.from("foobar");
  assert.equal(base32Decode(base32Encode(raw)).toString(), "foobar");
});

test("generateSecret returns a 20-byte decodable base32 string", () => {
  const secret = generateSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.equal(base32Decode(secret).length, 20);
});

// --- HOTP (RFC 4226 Appendix D test vectors) --------------------------------

const RFC4226_SECRET = base32Encode(Buffer.from("12345678901234567890"));
const RFC4226_CODES = [
  "755224", "287082", "359152", "969429", "338314",
  "254676", "287922", "162583", "399871", "520489",
];

test("hotpCode matches RFC 4226 Appendix D test vectors", () => {
  RFC4226_CODES.forEach((expected, counter) => {
    assert.equal(hotpCode(RFC4226_SECRET, counter), expected);
  });
});

// --- TOTP --------------------------------------------------------------------

test("totpCode derives the 30-second counter from the given time", () => {
  assert.equal(totpCode(RFC4226_SECRET, 0), hotpCode(RFC4226_SECRET, 0));
  assert.equal(totpCode(RFC4226_SECRET, 30_000), hotpCode(RFC4226_SECRET, 1));
});

test("verifyTotp accepts the current code and adjacent-window codes only", () => {
  const secret = generateSecret();
  const time = 1_700_000_000_000;
  const counter = Math.floor(time / 30_000);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter), { time }), true);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter - 1), { time }), true);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter + 1), { time }), true);
  assert.equal(verifyTotp(secret, hotpCode(secret, counter - 2), { time }), false);
});

test("verifyTotp rejects malformed input", () => {
  const secret = generateSecret();
  assert.equal(verifyTotp(secret, "abcdef", {}), false);
  assert.equal(verifyTotp(secret, "12345", {}), false);
  assert.equal(verifyTotp(secret, "", {}), false);
});

test("otpauthUri encodes issuer, label, and secret", () => {
  const uri = otpauthUri("JBSWY3DPEHPK3PXP", "admin@example.com");
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(uri, /issuer=CYA/);
});

// --- Encryption at rest ------------------------------------------------------

test("encryptSecret/decryptSecret round-trip", () => {
  const secret = generateSecret();
  const packed = encryptSecret(secret);
  assert.notEqual(packed, secret);
  assert.equal(decryptSecret(packed), secret);
});

test("decryptSecret rejects a tampered ciphertext", () => {
  const packed = encryptSecret(generateSecret());
  const [iv, tag, data] = packed.split(":");
  const tampered = [iv, tag, data.slice(0, -2) + "00"].join(":");
  assert.throws(() => decryptSecret(tampered));
});
