// Firecrawl hero-image backfill: voor festivals zonder image_url waar de kale
// og:image-route (scripts/fetch-festival-images.mjs) niets vond. Firecrawl rendert
// de festivalsite (JS wordt uitgevoerd) en een LLM geeft de URL van de grootste
// sfeer-/heroafbeelding terug. Die URL valideren we daarna hard (moet een echte
// image/-content-type zijn, geen SVG-logo) vóór we hem tonen/opslaan.
//
// Kost Firecrawl-credits (JSON-extractie), daarom sequentieel + begrensd via --limit.
//
// Gebruik:
//   node scripts/fetch-images-firecrawl.mjs                 # dry-run: alleen KOMENDE festivals, toont kandidaten, schrijft NIETS
//   node scripts/fetch-images-firecrawl.mjs --all           # ook al verstreken festivals
//   node scripts/fetch-images-firecrawl.mjs --limit 5       # verwerk max 5 (credits sparen)
//   node scripts/fetch-images-firecrawl.mjs --write         # schrijf gevonden URL's naar Supabase
//   node scripts/fetch-images-firecrawl.mjs --slug pinkpop  # alleen dit festival (herhaalbaar)
//
// Vereist Node >= 20 en FIRECRAWL_API_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const ALL = args.includes("--all");
function argValue(name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}
const LIMIT = argValue("--limit") ? Number(argValue("--limit")) : Infinity;
const SLUGS = args.reduce((acc, a, i) => {
  if (a === "--slug" && args[i + 1]) acc.push(args[i + 1]);
  return acc;
}, []);

// Vandaag: bepaalt "komend" vs "verstreken". Kan overschreven met --today YYYY-MM-DD (tests).
const TODAY = argValue("--today") ?? new Date().toISOString().slice(0, 10);

// --- .env.local laden (zelfde simpele parser als de andere scripts) ---
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return;
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
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env: SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY (zie .env.local.example)");
  process.exit(1);
}
if (!FIRECRAWL_API_KEY) {
  console.error("Missing env: FIRECRAWL_API_KEY — dit script leunt volledig op Firecrawl.");
  process.exit(1);
}

const REST_URL = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1`;
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const USER_AGENT = "FestivalDiscounterBot/1.0 (+https://festivaldiscounter.nl)";
const RENDER_TIMEOUT_MS = 55_000; // ruim: JS-widget-sites renderen traag
const VALIDATE_TIMEOUT_MS = 10_000;

const IMAGE_SCHEMA = {
  type: "object",
  properties: {
    image_url: {
      type: ["string", "null"],
      description:
        "De absolute URL van de grootste, meest representatieve sfeer-/hero-/achtergrondafbeelding (een echte festivalfoto) bovenaan of prominent op de pagina. GEEN logo, GEEN icoon/favicon, GEEN sponsorlogo, GEEN social-media-icoon. Null als er niets geschikts staat.",
    },
  },
  required: ["image_url"],
};

async function supabaseSelectFestivals() {
  const url = `${REST_URL}/festivals?select=id,slug,name,website_url,image_url,start_date,end_date&published=eq.true&image_url=is.null&website_url=not.is.null&order=start_date.asc`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase select faalde: ${res.status} ${await res.text()}`);
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
  if (!res.ok) throw new Error(`Supabase patch faalde: ${res.status} ${await res.text()}`);
}

async function extractImageViaFirecrawl(websiteUrl) {
  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${FIRECRAWL_API_KEY}` },
    body: JSON.stringify({
      url: websiteUrl,
      formats: [
        {
          type: "json",
          schema: IMAGE_SCHEMA,
          prompt:
            "Geef de absolute URL van de belangrijkste sfeer-/heroafbeelding (een grote festivalfoto) op deze pagina. Geen logo, icoon of sponsorbeeld.",
        },
      ],
      onlyMainContent: false,
      timeout: RENDER_TIMEOUT_MS,
    }),
    signal: AbortSignal.timeout(RENDER_TIMEOUT_MS + 8000),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  const raw = body?.data?.json?.image_url;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const resolved = new URL(raw.trim(), websiteUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

// Zelfde harde validatie als fetch-festival-images.mjs: HEAD (met Range-GET-fallback),
// eist 2xx/206 + image/-content-type, weigert SVG (bijna altijd een logo).
async function validateImageUrl(url) {
  const withTimeout = async (options) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
  let res;
  try {
    res = await withTimeout({ method: "HEAD", redirect: "follow", headers: { "User-Agent": USER_AGENT } });
    if (res.status === 405) {
      res = await withTimeout({
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Range: "bytes=0-0" },
      });
    }
  } catch (err) {
    return { ok: false, reason: `validatie-fetch mislukt (${err.name === "AbortError" ? "timeout" : err.message})` };
  }
  if (!(res.ok || res.status === 206)) return { ok: false, reason: `validatie gaf status ${res.status}` };
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return { ok: false, reason: `geen image content-type (${contentType || "onbekend"})` };
  if (contentType.startsWith("image/svg")) return { ok: false, reason: "svg overgeslagen (vaak een logo)" };
  return { ok: true };
}

async function processFestival(festival) {
  const { id, slug, website_url: websiteUrl } = festival;
  let candidate;
  try {
    candidate = await extractImageViaFirecrawl(websiteUrl);
  } catch (err) {
    return { slug, ok: false, reason: `Firecrawl mislukt (${err.name === "TimeoutError" ? "timeout" : err.message})` };
  }
  if (!candidate) return { slug, ok: false, reason: "geen hero-afbeelding gevonden" };

  const validation = await validateImageUrl(candidate);
  if (!validation.ok) return { slug, ok: false, reason: `${validation.reason} — kandidaat was ${candidate}` };

  if (WRITE) {
    try {
      await supabasePatchImageUrl(id, candidate);
    } catch (err) {
      return { slug, ok: false, reason: `database-update mislukt (${err.message})` };
    }
  }
  return { slug, ok: true, imageUrl: candidate };
}

async function main() {
  let festivals = await supabaseSelectFestivals();
  if (SLUGS.length) {
    festivals = festivals.filter((f) => SLUGS.includes(f.slug));
  } else if (!ALL) {
    festivals = festivals.filter((f) => (f.end_date || f.start_date) >= TODAY);
  }
  if (festivals.length > LIMIT) festivals = festivals.slice(0, LIMIT);

  console.log(
    `Firecrawl hero-image backfill — ${WRITE ? "SCHRIJFT naar DB" : "DRY-RUN (schrijft niets)"}, ` +
      `${ALL ? "alle" : SLUGS.length ? "geselecteerde" : "komende"} festivals zonder afbeelding.`
  );
  console.log(`${festivals.length} festival(s) te verwerken (limit ${LIMIT === Infinity ? "geen" : LIMIT}).\n`);

  const results = [];
  for (const festival of festivals) {
    let result;
    try {
      result = await processFestival(festival);
    } catch (err) {
      result = { slug: festival.slug, ok: false, reason: `onverwachte fout (${err.message})` };
    }
    if (result.ok) console.log(`OK   ${result.slug} → ${result.imageUrl}`);
    else console.log(`SKIP ${result.slug} (${result.reason})`);
    results.push(result);
  }

  const filled = results.filter((r) => r.ok);
  const skipped = results.filter((r) => !r.ok);
  console.log("\n--- Eindrapport ---");
  console.log(`Totaal verwerkt: ${results.length}`);
  console.log(`${WRITE ? "Opgeslagen" : "Kandidaat gevonden"}: ${filled.length}`);
  console.log(`Overgeslagen:    ${skipped.length}`);
  if (!WRITE && filled.length) {
    console.log("\nHerhaal met --write om deze op te slaan (of --slug <slug> voor een selectie).");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Onverwachte fout in het script:", err);
  process.exit(1);
});
