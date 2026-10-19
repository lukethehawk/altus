import test from "node:test";
import assert from "node:assert/strict";
import { getSafeExternalHttpURL, isTrustedWhatsAppURL, isAltusPartition } from "../src/utils/security.ts";

test("IPC external URL validation", () => {
  assert.equal(getSafeExternalHttpURL("https://example.org/path?a=b"), "https://example.org/path?a=b");
  assert.equal(getSafeExternalHttpURL("http://example.org"), "http://example.org/");
  for (const value of ["file:///etc/passwd", "javascript:alert(1)", "data:text/html,test",
    "ms-settings:privacy", "https://user:secret@example.org", "https://", "not a url", null, 7]) {
    assert.equal(getSafeExternalHttpURL(value), null, String(value));
  }
});

test("WhatsApp Web origin allow-list", () => {
  assert.equal(isTrustedWhatsAppURL("https://web.whatsapp.com/"), true);
  for (const value of ["https://web.whatsapp.com.evil.example",
    "http://web.whatsapp.com", "https://evil.example/?next=web.whatsapp.com",
    "file:///web.whatsapp.com", "not a url"]) {
    assert.equal(isTrustedWhatsAppURL(value), false, value);
  }
});

test("persistent partition IDs", () => {
  assert.equal(isAltusPartition("persist:AbC_-123"), true);
  for (const value of ["persist:../../secret", "persist:", "temporary", "persist:abc/def", 42, undefined]) {
    assert.equal(isAltusPartition(value), false, String(value));
  }
});
