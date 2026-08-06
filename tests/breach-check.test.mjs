import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { isPasswordBreached } from "../src/server/services/breach-check.service.js";

function mockFetchOnce(responseText, ok = true) {
  const original = global.fetch;
  global.fetch = async () => ({ ok, text: async () => responseText });
  return () => {
    global.fetch = original;
  };
}

test("isPasswordBreached flags a password whose hash suffix is in the HIBP response", async () => {
  const sha1 = crypto.createHash("sha1").update("password123").digest("hex").toUpperCase();
  const suffix = sha1.slice(5);
  const restore = mockFetchOnce(`${suffix}:3730471\nAAAA0000AAAA0000AAAA0000AAAA0000AAA:1`);
  try {
    assert.equal(await isPasswordBreached("password123"), true);
  } finally {
    restore();
  }
});

test("isPasswordBreached does not flag a password whose suffix is absent", async () => {
  const restore = mockFetchOnce(
    "AAAA0000AAAA0000AAAA0000AAAA0000AAA:1\nBBBB1111BBBB1111BBBB1111BBBB1111BBB:2"
  );
  try {
    assert.equal(await isPasswordBreached("some-random-safe-password"), false);
  } finally {
    restore();
  }
});

test("isPasswordBreached fails open when the request throws", async () => {
  const original = global.fetch;
  global.fetch = async () => {
    throw new Error("network down");
  };
  try {
    assert.equal(await isPasswordBreached("anything"), false);
  } finally {
    global.fetch = original;
  }
});

test("isPasswordBreached fails open on a non-OK response", async () => {
  const restore = mockFetchOnce("", false);
  try {
    assert.equal(await isPasswordBreached("anything"), false);
  } finally {
    restore();
  }
});
