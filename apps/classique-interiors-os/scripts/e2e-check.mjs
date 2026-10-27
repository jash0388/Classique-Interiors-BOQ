const BASE = "http://127.0.0.1:3000";
const results = [];
function ok(name, cond, extra = "") {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
}

async function main() {
  // whoami endpoint test via dashboard redirect
  const dash = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
  ok("dashboard redirects to login when signed out", dash.status === 307);

  // login via server action protocol: use form POST to /login with Next-Action header is complex;
  // instead use the seeded session by hitting login action through a real browser-like flow is heavy.
  // Simpler: verify login page renders and wrong-credentials path via action is covered by UI test.
  const loginPage = await fetch(`${BASE}/login`);
  ok("login page renders", loginPage.status === 200 && (await loginPage.text()).includes("Sign in"));

  const visit404 = await fetch(`${BASE}/visit/bogus-token-123`);
  ok("bogus visit token shows invalid link page", visit404.status === 200 && (await visit404.text()).includes("Link not valid"));

  const upload401 = await fetch(`${BASE}/api/upload`, { method: "POST" });
  ok("upload API rejects empty request", upload401.status === 400);

  const invalidType = new FormData();
  invalidType.append("file", new Blob(["not a photo"], { type: "application/x-msdownload" }), "payload.exe");
  invalidType.append("visitToken", "bogus-token-123");
  const invalidTypeRes = await fetch(`${BASE}/api/upload`, { method: "POST", body: invalidType });
  ok("upload API rejects unsupported MIME types", invalidTypeRes.status === 415);

  const tooLarge = new FormData();
  tooLarge.append("file", new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/png" }), "large.png");
  tooLarge.append("visitToken", "bogus-token-123");
  const tooLargeRes = await fetch(`${BASE}/api/upload`, { method: "POST", body: tooLarge });
  ok("upload API rejects files over 8 MB", tooLargeRes.status === 413);

  const files401 = await fetch(`${BASE}/api/files/whatever.png`);
  ok("files API rejects unauthorized", files401.status === 401);

  const import401 = await fetch(`${BASE}/api/boqs/import`, { method: "POST" });
  ok("excel import API rejects unauthorized", import401.status === 401);

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
