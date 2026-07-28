// @vitest-environment jsdom

// The chat log renders untrusted text: operator input and raw model output. These tests
// pin the "DOM-safe" claim — nothing that arrives as text may become markup.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendChatLine,
  appendSystemLine,
  flashEconomyHud,
  prependTelemetryEntry,
  type ChatLine,
  type TelemetryEntry,
} from "../client/src/chatView";

const XSS = '<img src=x onerror="alert(1)"><script>alert(2)</script>';

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.appendChild(container);
});

const line = (over: Partial<ChatLine> = {}): ChatLine => ({
  name: "Gizmo",
  color: "#ffaa00",
  isBot: true,
  text: "hello",
  ...over,
});

const entry = (over: Partial<TelemetryEntry> = {}): TelemetryEntry => ({
  name: "Blaze",
  color: "#ff5533",
  action: { kind: "none", target_name: null, amount: null },
  source: "scripted",
  say: null,
  model: null,
  ...over,
});

describe("appendChatLine — untrusted text is never markup", () => {
  it("renders an injected tag as literal text", () => {
    appendChatLine(container, line({ text: XSS }));

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain(XSS);
  });

  it("escapes a hostile speaker name too", () => {
    appendChatLine(container, line({ name: XSS, isBot: false }));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(XSS);
  });

  it("escapes a hostile addressee", () => {
    appendChatLine(container, line({ isBot: false, to: XSS }));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(XSS);
  });
});

describe("appendChatLine — structure", () => {
  it("colours the speaker name", () => {
    appendChatLine(container, line({ name: "Zen", color: "#33cc88" }));
    const who = container.querySelector("span")!;

    expect(who.textContent).toBe("Zen");
    expect(who.style.color).toBe("rgb(51, 204, 136)");
  });

  it("tags bot messages as AI", () => {
    appendChatLine(container, line({ text: "on it" }));
    expect(container.querySelector(".bot-tag")?.textContent).toBe(" [AI]");
    expect(container.textContent).toBe("Gizmo [AI]: on it");
  });

  it("shows an arrow instead of the AI tag when a message is directed", () => {
    appendChatLine(container, line({ isBot: false, name: "Operator", to: "Gizmo" }));

    expect(container.querySelector(".bot-tag")).toBeNull();
    expect(container.textContent).toBe("Operator → Gizmo: hello");
  });

  it("leaves plain operator chat unadorned", () => {
    appendChatLine(container, line({ isBot: false, name: "Operator", to: null }));
    expect(container.textContent).toBe("Operator: hello");
  });

  it("drops the oldest lines past the cap", () => {
    for (let i = 0; i < 5; i++) appendChatLine(container, line({ text: `msg ${i}` }), 3);

    expect(container.children).toHaveLength(3);
    expect(container.textContent).toContain("msg 4");
    expect(container.textContent).not.toContain("msg 1");
  });
});

describe("appendSystemLine", () => {
  it("marks the row as system output", () => {
    appendSystemLine(container, "Ledger +100 RB");

    expect(container.querySelector(".system")?.textContent).toBe("Ledger +100 RB");
  });

  it("escapes system text as well", () => {
    appendSystemLine(container, XSS);

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe(XSS);
  });

  it("honours the line cap", () => {
    for (let i = 0; i < 4; i++) appendSystemLine(container, `note ${i}`, 2);
    expect(container.children).toHaveLength(2);
  });
});

describe("prependTelemetryEntry", () => {
  it("puts the newest decision on top", () => {
    prependTelemetryEntry(container, entry({ name: "Blaze" }));
    prependTelemetryEntry(container, entry({ name: "Zen" }));

    expect(container.firstElementChild?.textContent).toContain("Zen");
  });

  it("drops the oldest entries past the cap", () => {
    for (let i = 0; i < 5; i++) prependTelemetryEntry(container, entry({ say: `say ${i}` }), 2);

    expect(container.children).toHaveLength(2);
    expect(container.textContent).toContain("say 4");
    expect(container.textContent).not.toContain("say 0");
  });

  it("shows the model only for live decisions", () => {
    prependTelemetryEntry(container, entry({ source: "llm", model: "vendor/model" }));
    expect(container.textContent).toContain("· llm · vendor/model");

    container.innerHTML = "";
    prependTelemetryEntry(container, entry({ source: "scripted", model: "vendor/model" }));
    expect(container.textContent).not.toContain("vendor/model");
  });

  it("quotes what the bot said", () => {
    prependTelemetryEntry(container, entry({ say: "Sent you 100 RedBucks" }));
    expect(container.textContent).toContain('· said: "Sent you 100 RedBucks"');
  });

  it("shows the target the model asked for", () => {
    prependTelemetryEntry(
      container,
      entry({ action: { kind: "transfer", target_name: "Operator", amount: 500 } }),
    );
    expect(container.textContent).toContain("→ transfer Operator");
  });

  it("falls back to the amount when there is no named target", () => {
    prependTelemetryEntry(
      container,
      entry({ action: { kind: "transfer", target_name: null, amount: 500 } }),
    );
    expect(container.textContent).toContain("→ transfer 500 RB");
  });

  it("shows the bare action kind when there is neither", () => {
    prependTelemetryEntry(container, entry());
    expect(container.textContent).toContain("→ none");
  });

  it("escapes a hostile say in the telemetry feed", () => {
    prependTelemetryEntry(container, entry({ say: XSS }));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(XSS);
  });
});

describe("flashEconomyHud", () => {
  let hud: HTMLElement;

  beforeEach(() => {
    hud = document.createElement("div");
    document.body.appendChild(hud);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the balance and returns it as the new baseline", () => {
    expect(flashEconomyHud(hud, 400, 300)).toBe(400);
    expect(hud.textContent).toBe("400 RB");
  });

  it("flashes on a change and clears the flash afterwards", () => {
    flashEconomyHud(hud, 400, 300);
    expect(hud.classList.contains("ledger-flash")).toBe(true);

    vi.advanceTimersByTime(700);
    expect(hud.classList.contains("ledger-flash")).toBe(false);
  });

  it("does not flash on the first render", () => {
    flashEconomyHud(hud, 300, null);
    expect(hud.classList.contains("ledger-flash")).toBe(false);
  });

  it("does not flash when the balance is unchanged", () => {
    flashEconomyHud(hud, 300, 300);
    expect(hud.classList.contains("ledger-flash")).toBe(false);
  });
});
