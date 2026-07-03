function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      if (process.env.NODE_ENV === "production")
        throw new Error(`Ongeldige NEXT_PUBLIC_SITE_URL: "${raw}"`);
      return "http://localhost:3000";
    }
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Missing env: NEXT_PUBLIC_SITE_URL (zie .env.local.example)");
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
