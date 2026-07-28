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

async function loadUi() {
  document.body.innerHTML = MARKUP;
  vi.resetModules();
  const { bindUiDom, setSidePanel, showApp, bindUiHandlers } = await import("../client/src/ui");
  const dom = bindUiDom();
  return { ui: { setSidePanel, showApp, bindUiHandlers }, dom, bindUiDom };
}

const el = (id: string) => document.getElementById(id)!;

const pressM = () =>
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM", bubbles: true }));

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("side panel", () => {
  it("opens on the mission panel", async () => {
    const { ui, dom } = await loadUi();
    ui.setSidePanel(dom, "mission");

    expect(dom.ctf.classList.contains("hidden")).toBe(false);
    expect(dom.tabMission.classList.contains("active")).toBe(true);
    expect(dom.tabMission.getAttribute("aria-selected")).toBe("true");
  });

  it("switches to the telemetry feed", async () => {
    const { ui, dom } = await loadUi();
    ui.setSidePanel(dom, "feed");

    expect(dom.telemetry.classList.contains("hidden")).toBe(false);
    expect(dom.ctf.classList.contains("hidden")).toBe(true);
    expect(dom.tabFeed.classList.contains("active")).toBe(true);
    expect(dom.tabFeed.getAttribute("aria-selected")).toBe("true");
    expect(dom.tabMission.getAttribute("aria-selected")).toBe("false");
  });

  it("switches back to the mission panel", async () => {
    const { ui, dom } = await loadUi();
    ui.setSidePanel(dom, "feed");
    ui.setSidePanel(dom, "mission");

    expect(dom.ctf.classList.contains("hidden")).toBe(false);
    expect(dom.telemetry.classList.contains("hidden")).toBe(true);
  });
});

describe("showApp", () => {
  it("marks the shell ready", async () => {
    const { ui, dom } = await loadUi();
    expect(dom.shell.classList.contains("ready")).toBe(false);

    ui.showApp(dom);
    expect(dom.shell.classList.contains("ready")).toBe(true);
  });
});

describe("bindUiHandlers", () => {
  it("switches panels from the tab buttons", async () => {
    const { ui, dom } = await loadUi();
    ui.bindUiHandlers(dom);

    dom.tabFeed.click();
    expect(dom.telemetry.classList.contains("hidden")).toBe(false);

    dom.tabMission.click();
    expect(dom.ctf.classList.contains("hidden")).toBe(false);
  });

  it("toggles panels with the M shortcut", async () => {
    const { ui, dom } = await loadUi();
    ui.bindUiHandlers(dom);

    pressM();
    expect(dom.telemetry.classList.contains("hidden")).toBe(false);

    pressM();
    expect(dom.ctf.classList.contains("hidden")).toBe(false);
  });

  it("ignores M while the operator is typing in chat", async () => {
    const { ui, dom } = await loadUi();
    ui.bindUiHandlers(dom);
    (dom.chatInput as HTMLInputElement | null)?.focus();

    pressM();

    expect(dom.ctf.classList.contains("hidden")).toBe(false);
    expect(dom.telemetry.classList.contains("hidden")).toBe(true);
  });

  it("leaves other keys alone", async () => {
    const { ui, dom } = await loadUi();
    ui.bindUiHandlers(dom);

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyF", bubbles: true }));

    expect(dom.ctf.classList.contains("hidden")).toBe(false);
  });
});
