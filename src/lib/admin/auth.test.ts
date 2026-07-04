import { describe, expect, it } from "vitest";
import { signSession, verifySession, checkPassword } from "@/lib/admin/auth";

const SECRET = "test-secret-abc";
const NOW = 1_000_000;

describe("signSession/verifySession", () => {
  it("accepteert een net ondertekende, niet-verlopen sessie", () => {
    const token = signSession(NOW + 10_000, SECRET);
    expect(verifySession(token, SECRET, NOW)).toBe(true);
  });

  it("weigert een verlopen sessie", () => {
    const token = signSession(NOW - 1, SECRET);
    expect(verifySession(token, SECRET, NOW)).toBe(false);
  });

  it("weigert een geknoeide handtekening", () => {
    const token = signSession(NOW + 10_000, SECRET);
    const tampered = token.slice(0, -1) + (token.at(-1) === "a" ? "b" : "a");
    expect(verifySession(tampered, SECRET, NOW)).toBe(false);
  });

  it("weigert een verkeerd secret", () => {
    const token = signSession(NOW + 10_000, SECRET);
    expect(verifySession(token, "ander-secret", NOW)).toBe(false);
  });

  it("weigert lege of vormloze waarden", () => {
    expect(verifySession(undefined, SECRET, NOW)).toBe(false);
    expect(verifySession("", SECRET, NOW)).toBe(false);
    expect(verifySession("geen-punt", SECRET, NOW)).toBe(false);
  });
});

describe("checkPassword", () => {
  it("is waar bij gelijk wachtwoord", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
  });
  it("is onwaar bij verschillend wachtwoord (ook bij andere lengte)", () => {
    expect(checkPassword("fout", "hunter2")).toBe(false);
    expect(checkPassword("", "hunter2")).toBe(false);
  });
});
