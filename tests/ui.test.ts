// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const MARKUP = `
  <div id="app-shell"></div>
  <div id="telemetry"></div>
  <div id="ctf"></div>
  <button id="tab-feed" aria-selected="false"></button>
  <button id="tab-mission" aria-selected="false"></button>
  <input id="chat-input" />
`;

/** ui.ts binds to the page at import time, so the markup must exist first. */
async function loadUi() {
  document.body.innerHTML = MARKUP;
  vi.resetModules();
  return import("../client/src/ui");
}

const el = (id: string) => document.getElementById(id)!;

const pressM = () =>
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM", bubbles: true }));

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("side panel", () => {
  it("opens on the mission panel", async () => {
    await loadUi();

    expect(el("ctf").classList.contains("hidden")).toBe(false);
    expect(el("telemetry").classList.contains("hidden")).toBe(true);
    expect(el("tab-mission").classList.contains("active")).toBe(true);
    expect(el("tab-mission").getAttribute("aria-selected")).toBe("true");
  });

  it("switches to the telemetry feed", async () => {
    const ui = await loadUi();
    ui.setSidePanel("feed");

    expect(el("telemetry").classList.contains("hidden")).toBe(false);
    expect(el("ctf").classList.contains("hidden")).toBe(true);
    expect(el("tab-feed").classList.contains("active")).toBe(true);
    expect(el("tab-feed").getAttribute("aria-selected")).toBe("true");
    expect(el("tab-mission").getAttribute("aria-selected")).toBe("false");
  });

  it("switches back to the mission panel", async () => {
    const ui = await loadUi();
    ui.setSidePanel("feed");
    ui.setSidePanel("mission");

    expect(el("ctf").classList.contains("hidden")).toBe(false);
    expect(el("telemetry").classList.contains("hidden")).toBe(true);
  });
});

describe("showApp", () => {
  it("marks the shell ready", async () => {
    const ui = await loadUi();
    expect(el("app-shell").classList.contains("ready")).toBe(false);

    ui.showApp();
    expect(el("app-shell").classList.contains("ready")).toBe(true);
  });
});

describe("bindUiHandlers", () => {
  it("switches panels from the tab buttons", async () => {
    const ui = await loadUi();
    ui.bindUiHandlers();

    el("tab-feed").click();
    expect(el("telemetry").classList.contains("hidden")).toBe(false);

    el("tab-mission").click();
    expect(el("ctf").classList.contains("hidden")).toBe(false);
  });

  it("toggles panels with the M shortcut", async () => {
    const ui = await loadUi();
    ui.bindUiHandlers();

    pressM();
    expect(el("telemetry").classList.contains("hidden")).toBe(false);

    pressM();
    expect(el("ctf").classList.contains("hidden")).toBe(false);
  });

  it("ignores M while the operator is typing in chat", async () => {
    const ui = await loadUi();
    ui.bindUiHandlers();
    (el("chat-input") as HTMLInputElement).focus();

    pressM();

    expect(el("ctf").classList.contains("hidden")).toBe(false);
    expect(el("telemetry").classList.contains("hidden")).toBe(true);
  });

  it("leaves other keys alone", async () => {
    const ui = await loadUi();
    ui.bindUiHandlers();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyF", bubbles: true }));

    expect(el("ctf").classList.contains("hidden")).toBe(false);
  });
});
