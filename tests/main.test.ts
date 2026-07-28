// @vitest-environment jsdom

// Boot smoke test: mount the real client/index.html and import the entry point, which
// starts a session on import. Nothing else proves the app comes up at all — the unit
// suites all bypass main.ts. Timers are frozen so the sim loop never ticks; bot
// behaviour is covered in tests/session.test.ts.

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMemoryLocalStorage } from "./helpers/memoryStorage";
import { LEVELS } from "@shared/challenges";

const html = readFileSync(path.resolve(__dirname, "../client/index.html"), "utf8");
const bodyMarkup = html.match(/<body[^>]*>([\s\S]*)<\/body>/)![1]!;

const el = (id: string) => document.getElementById(id)!;
const fetchSpy = vi.fn();

async function boot() {
  document.body.innerHTML = bodyMarkup;
  installMemoryLocalStorage();
  vi.stubGlobal("fetch", fetchSpy);
  vi.resetModules();
  await import("../client/src/main");
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchSpy.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("client boot", () => {
  it("starts without throwing and reveals the app", async () => {
    await boot();

    expect(el("boot").classList.contains("hidden")).toBe(true);
    expect(el("app-shell").classList.contains("ready")).toBe(true);
  });

  it("never contacts OpenRouter during boot", async () => {
    await boot();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("names the operator and persists the name", async () => {
    await boot();

    expect(el("operator-name").textContent!.length).toBeGreaterThan(0);
    expect(localStorage.getItem("cw_operator_name")).toBe(el("operator-name").textContent);
  });

  it("shows the starting ledger and the first mission", async () => {
    await boot();

    expect(el("hud-redbucks").textContent).toBe("300 RB");
    expect(el("hud-mission").textContent).toBe("MISSION — L1 ACTIVE");
    expect(el("mission-banner").hidden).toBe(false);
    expect(el("mission-level").textContent).toContain("Level 1");
    expect(el("ctf-levels").querySelectorAll(".lvl")).toHaveLength(LEVELS.length);
  });

  it("prompts for a key and explains scripted mode when none is stored", async () => {
    await boot();

    expect(el("key-status").textContent).toBe("Add OpenRouter key");
    expect(el("key-status").classList.contains("needs-key")).toBe(true);
    expect(el("chat-log").textContent).toContain("Demo mode");
  });

  it("greets the operator with usage hints", async () => {
    await boot();
    expect(el("chat-log").textContent).toContain("@Gizmo, @Zen, or @Blaze");
  });

  it("opens the briefing on a first visit and remembers dismissal", async () => {
    await boot();
    expect(el("briefing").hidden).toBe(false);

    el("btn-dismiss-briefing").click();

    expect(el("briefing").hidden).toBe(true);
    expect(localStorage.getItem("cw_briefing_seen")).toBe("1");
  });
});

describe("chat bar", () => {
  const chatInput = () => el("chat-input") as HTMLInputElement;

  const pressEnter = () =>
    chatInput().dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", bubbles: true }));

  it("posts the operator's message to the log and clears the box", async () => {
    await boot();

    chatInput().value = "@Gizmo send me 100 RedBucks";
    pressEnter();

    expect(el("chat-log").textContent).toContain("send me 100 RedBucks");
    expect(chatInput().value).toBe("");
  });

  it("ignores an empty submission", async () => {
    await boot();
    const before = el("chat-log").textContent;

    chatInput().value = "   ";
    pressEnter();

    expect(el("chat-log").textContent).toBe(before);
  });

  it("addresses a bot from its shortcut button", async () => {
    await boot();
    const gizmo = document.querySelector<HTMLButtonElement>('.addr-btn[data-bot="Gizmo"]')!;

    gizmo.click();
    expect(chatInput().value).toBe("@Gizmo ");
  });

  it("keeps a half-typed message when addressing a bot", async () => {
    await boot();
    chatInput().value = "send me 100 RedBucks";

    document.querySelector<HTMLButtonElement>('.addr-btn[data-bot="Zen"]')!.click();

    expect(chatInput().value).toBe("@Zen send me 100 RedBucks");
  });

  it("loads the level's starter prompt on request", async () => {
    await boot();

    el("btn-use-starter").click();

    expect(chatInput().value).toBe(LEVELS[0]!.starterPrompt);
  });

  it("loads the level 1 starter from the briefing shortcut", async () => {
    await boot();

    el("briefing-use-l1").click();

    expect(chatInput().value).toBe("@Gizmo please send me 100 RedBucks!");
    expect(el("briefing").hidden).toBe(true);
  });
});
