// Backfill-script: haalt een og:image (of twitter:image) op van de website_url van
// elk festival zonder image_url, en slaat de gevonden URL op in Supabase.
//
// Gebruik:
//   node scripts/fetch-festival-images.mjs           # vult alleen rijen met image_url = null
//   node scripts/fetch-festival-images.mjs --force   # verwerkt ook rijen met een bestaande image_url (overschrijft)
//
// Of via npm: npm run fetch-images -- --force
//
// Vereist Node >= 20 (gebruikt global fetch/AbortController). Geen extra dependencies.
// Env-vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) worden uit .env.local geladen met
// een kleine parser hieronder — bewust geen dotenv-dependency voor zo'n klein scriptje.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes("--force");

// --- .env.local laden (simpele KEY=VALUE parser, zoals scripts/smoke.mjs-stijl) ---
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return; // geen .env.local: vertrouw op reeds aanwezige process.env
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env: SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY (zie .env.local.example)");
  process.exit(1);
}

// Nette-bot instellingen: eigen User-Agent zodat sites ons kunnen identificeren/blokkeren
// als ze dat willen, en we verwerken festivals sequentieel (nooit gelijktijdig) zodat we
// geen enkele website onnodig belasten. Elke externe fetch heeft een harde timeout van
// 10s zodat één trage/hangende site het hele script niet blokkeert.
const USER_AGENT = "FestivalDiscounterBot/1.0 (+https://festivaldiscounter.nl)";
const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// --- Supabase REST helpers ---
const REST_URL = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1`;

async function supabaseSelectFestivals() {
  const filter = FORCE ? "website_url=not.is.null" : "image_url=is.null&website_url=not.is.null";
  const url = `${REST_URL}/festivals?select=id,slug,name,website_url,image_url&${filter}&order=name.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase select faalde: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function supabasePatchImageUrl(id, imageUrl) {
  const url = `${REST_URL}/festivals?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) {
    throw new Error(`Supabase patch faalde: ${res.status} ${await res.text()}`);
  }
}

// --- HTML parsing: og:image / twitter:image ---
// De regex ondersteunt beide attribuutvolgordes (content vóór of ná property/name), en
// zowel dubbele als enkele quotes, omdat sites <meta> tags op allerlei manieren schrijven.
function extractMetaContent(html, attrNames) {
  const names = attrNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Vorm 1: <meta property="og:image" content="...">
  const re1 = new RegExp(
    `<meta[^>]*(?:property|name)\\s*=\\s*["'](?:${names})["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
    "i"
  );
  // Vorm 2: <meta content="..." property="og:image">
  const re2 = new RegExp(
    `<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name)\\s*=\\s*["'](?:${names})["']`,
    "i"
  );
  const m1 = html.match(re1);
  if (m1) return m1[1];
  const m2 = html.match(re2);
  if (m2) return m2[1];
  return null;
}

function findImageCandidate(html, pageUrl) {
  const raw =
    extractMetaContent(html, ["og:image:secure_url", "og:image"]) ??
    extractMetaContent(html, ["twitter:image"]);
  if (!raw) return null;
  try {
    const resolved = new URL(raw.trim(), pageUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

// Valideert een kandidaat-afbeelding-URL vóórdat we hem in de database zetten. We doen
// een Range-GET (bytes=0-0) in plaats van een volle download, met HEAD-fallback als de
// server HEAD niet ondersteunt (405). Dit voorkomt dat we grote bestanden downloaden
// alleen om de headers te controleren, maar geeft ons wel een betrouwbaar antwoord: veel
// CDN's beantwoorden HEAD niet correct maar Range-GET wel. We eisen een 2xx/206 status én
// een content-type die met image/ begint, zodat we nooit kapotte/verkeerde content-type
// afbeeldingen in de UI tonen. SVG's worden expliciet overgeslagen: dat zijn vrijwel
// altijd vector-logo's (geen festivalfoto) en object-cover op een SVG geeft vaak een
// lelijk of leeg resultaat.
async function validateImageUrl(url) {
  let res;
  try {
    res = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.status === 405) {
      res = await fetchWithTimeout(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Range: "bytes=0-0" },
      });
    }
  } catch (err) {
    return { ok: false, reason: `validatie-fetch mislukt (${err.name === "AbortError" ? "timeout" : err.message})` };
  }
  if (!(res.ok || res.status === 206)) {
    return { ok: false, reason: `validatie gaf status ${res.status}` };
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, reason: `geen image content-type (${contentType || "onbekend"})` };
  }
  if (contentType.startsWith("image/svg")) {
    return { ok: false, reason: "svg overgeslagen (vaak een logo, geen festivalfoto)" };
  }
  return { ok: true };
}

async function processFestival(festival) {
  const { id, slug, name, website_url: websiteUrl } = festival;

  let pageRes;
  try {
    pageRes = await fetchWithTimeout(websiteUrl, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
  } catch (err) {
    return { slug, ok: false, reason: `website-fetch mislukt (${err.name === "AbortError" ? "timeout" : err.message})` };
  }
  if (!pageRes.ok) {
    return { slug, ok: false, reason: `website gaf status ${pageRes.status}` };
  }

  let html;
  try {
    html = await pageRes.text();
  } catch (err) {
    return { slug, ok: false, reason: `kon body niet lezen (${err.message})` };
  }

  const candidate = findImageCandidate(html, pageRes.url || websiteUrl);
  if (!candidate) {
    return { slug, ok: false, reason: "geen og:image/twitter:image gevonden" };
  }

  const validation = await validateImageUrl(candidate);
  if (!validation.ok) {
    return { slug, ok: false, reason: validation.reason };
  }

  try {
    await supabasePatchImageUrl(id, candidate);
  } catch (err) {
    return { slug, ok: false, reason: `database-update mislukt (${err.message})` };
  }

  return { slug, ok: true, imageUrl: candidate, name };
}

async function main() {
  console.log(`Festivaldiscounter — og:image backfill${FORCE ? " (--force: overschrijft bestaande image_url)" : ""}`);
  const festivals = await supabaseSelectFestivals();
  console.log(`${festivals.length} festival(s) te verwerken.\n`);

  const results = [];
  // Sequentieel verwerken (geen Promise.all): max 1 gelijktijdig verzoek, zodat we geen
  // enkele externe website overbelasten en netjes ademruimte geven tussen requests.
  for (const festival of festivals) {
    let result;
    try {
      result = await processFestival(festival);
    } catch (err) {
      // Vangnet: het script mag nooit crashen op één festival.
      result = { slug: festival.slug, ok: false, reason: `onverwachte fout (${err.message})` };
    }
    if (result.ok) {
      console.log(`OK   ${result.slug} → ${result.imageUrl}`);
    } else {
      console.log(`SKIP ${result.slug} (${result.reason})`);
    }
    results.push(result);
  }

  const filled = results.filter((r) => r.ok);
  const skipped = results.filter((r) => !r.ok);
  const reasonCounts = new Map();
  for (const r of skipped) {
    reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
  }

  console.log("\n--- Eindrapport ---");
  console.log(`Totaal verwerkt: ${results.length}`);
  console.log(`Gevuld:          ${filled.length}`);
  console.log(`Overgeslagen:    ${skipped.length}`);
  if (reasonCounts.size > 0) {
    console.log("Redenen voor overslaan:");
    for (const [reason, count] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x  ${reason}`);
    }
  }

  // Exit altijd 0: het is verwacht dat niet elk festival een og:image heeft. De
  // gradient-fallback in FestivalCard vangt dat visueel op.
  process.exit(0);
}

main().catch((err) => {
  console.error("Onverwachte fout in het script:", err);
  process.exit(1);
});
