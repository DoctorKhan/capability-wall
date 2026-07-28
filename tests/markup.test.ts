// The client wires itself to the page with non-null `getElementById(...)!` lookups, so a
// renamed or deleted id fails at runtime rather than at build time. This test pins the
// contract between client/index.html and the modules that bind to it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BOT_NAMES } from "@shared/brain";

const CLIENT_DIR = path.resolve(__dirname, "../client");
const html = readFileSync(path.join(CLIENT_DIR, "index.html"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".d.ts") ? [full] : [];
  });
}

const sources = sourceFiles(path.join(CLIENT_DIR, "src")).map((file) => ({
  file: path.relative(CLIENT_DIR, file),
  text: readFileSync(file, "utf8"),
}));

function matchAll(text: string, re: RegExp): string[] {
  return [...text.matchAll(re)].map((m) => m[1]!);
}

const htmlIds = new Set(matchAll(html, /\bid="([^"]+)"/g));

describe("index.html markup contract", () => {
  it("finds source files to check", () => {
    expect(sources.length).toBeGreaterThan(5);
    expect(htmlIds.size).toBeGreaterThan(20);
  });

  it("defines every element id the client looks up", () => {
    const missing: string[] = [];
    for (const { file, text } of sources) {
      for (const id of matchAll(text, /getElementById\("([^"]+)"\)/g)) {
        if (!htmlIds.has(id)) missing.push(`${file} → #${id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("defines every element class the client queries", () => {
    const missing: string[] = [];
    for (const { file, text } of sources) {
      for (const cls of matchAll(text, /querySelectorAll<[^>]*>\("\.([a-z0-9-]+)"\)/g)) {
        if (!html.includes(`class="${cls}`) && !html.includes(` ${cls}"`)) {
          missing.push(`${file} → .${cls}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("gives every bot a shortcut button naming a real persona", () => {
    const bots = matchAll(html, /data-bot="([^"]+)"/g);
    expect(new Set(bots)).toEqual(new Set(BOT_NAMES));
  });

  it("ships no API key or OpenRouter endpoint baked into the page", () => {
    expect(html).not.toMatch(/sk-or-v1-[a-z0-9]/i);
    expect(html).not.toContain("openrouter.ai/api");
  });
});
