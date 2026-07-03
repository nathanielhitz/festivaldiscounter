// Smoke-test van het kernpad (spec: homepage → festival → ticketklik → redirect).
// Gebruik: start de site (npm run build && npm run start) en run `npm run smoke`.
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SEED_OFFER = "22222222-2222-2222-2222-222222222202"; // Lowlands · TicketSwap (seed.sql)

let failures = 0;

async function checkPage(path, marker) {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.text();
  const ok = res.status === 200 && body.includes(marker);
  console.log(`${ok ? "PASS" : "FAIL"}  ${path}  (status ${res.status}, marker "${marker}")`);
  if (!ok) failures++;
}

async function checkRedirect(path, expectedPrefix) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  const ok = res.status === 307 && loc.startsWith(expectedPrefix);
  console.log(`${ok ? "PASS" : "FAIL"}  ${path} → ${loc || "(geen location)"} (status ${res.status})`);
  if (!ok) failures++;
}

await checkPage("/", "Nooit te veel betalen");
await checkPage("/festivals", "Lowlands");
await checkPage("/festivals/lowlands", "Laagste prijs");
await checkPage("/festivals/lowlands", "application/ld+json");
await checkPage("/goedkope-festivaltickets", "Awakenings");
await checkPage("/gids/is-ticketswap-betrouwbaar", "SecureSwap");
await checkPage("/sitemap.xml", "/festivals/lowlands");
await checkRedirect(`/uit/${SEED_OFFER}`, "https://www.ticketswap.nl/");
await checkRedirect("/uit/00000000-0000-0000-0000-000000000000", BASE);

if (failures > 0) {
  console.error(`\n${failures} check(s) gefaald.`);
  process.exit(1);
}
console.log("\nAlle smoke-checks geslaagd.");
