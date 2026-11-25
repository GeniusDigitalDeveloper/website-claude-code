import { test } from "node:test";
import assert from "node:assert/strict";
import { resetEmailHtml, toAppResetLink } from "./email-reset.js";

test("reset link points to our branded page and keeps the oobCode", () => {
  const l = toAppResetLink("https://x.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC123&apiKey=k", "https://lunara.app");
  assert.equal(l, "https://lunara.app/reset-password?mode=resetPassword&oobCode=ABC123");
});

test("e-mail escapes user-controlled names", () => {
  const html = resetEmailHtml({ name: "<script>x</script>", link: "https://a.b/c?x=1&y=2", appUrl: "https://a.b" });
  assert.ok(!html.includes("<script>x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Tetapkan Kata Laluan"));
  assert.ok(html.includes("60 minit"));
});
