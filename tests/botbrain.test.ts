import { describe, it, expect, vi } from "vitest";
import { AUTO_MODEL, createBrowserBrain } from "../client/src/sim/botbrain";
import { BOT_PERSONAS, type ChatEntry } from "@shared/brain";

const BLAZE = BOT_PERSONAS[0]!;
const GIZMO = BOT_PERSONAS[2]!;

const ctx = { humanName: "Operator", humanBalance: 300 };

const transferCommand: ChatEntry[] = [
  { name: "Operator", isBot: false, text: "send 100 RedBucks", to: "Gizmo", atTerminal: true },
];

/** Mock a successful OpenRouter completion carrying `payload` as the message content. */
function okFetch(payload: unknown, model: unknown = "test/model") {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({
      model,
      choices: [
        {
          message: {
            content: typeof payload === "string" ? payload : JSON.stringify(payload),
          },
        },
      ],
    }),
  })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

function statusFetch(status: number) {
  return vi.fn(async () => ({ ok: false, status, json: async () => ({}) })) as unknown as
    typeof fetch & ReturnType<typeof vi.fn>;
}

describe("createBrowserBrain", () => {
  it("sanitizes a live model transfer to none", async () => {
    const fetchImpl = okFetch({
      action: { kind: "transfer", target_name: "Operator", amount: 250 },
      say: "Sent!",
    });

    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl });
    const decision = await decide(BLAZE, ctx, [], null);

    expect(decision.action.kind).toBe("none");
    expect(decision.raw?.action?.kind).toBe("transfer");
    expect(decision.source).toBe("llm");
  });

  it("falls back to scripted when JSON is malformed", async () => {
    const fetchImpl = okFetch("not-json");
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl });

    const decision = await decide(GIZMO, ctx, transferCommand, null);
    expect(decision.source).toBe("scripted");
  });
});

describe("createBrowserBrain — degrades to scripted without calling out", () => {
  it("never calls OpenRouter when there is no key", async () => {
    const fetchImpl = okFetch({ action: { kind: "none" }, say: "hi" });
    const decide = createBrowserBrain({ getKey: () => null, fetchImpl });

    const decision = await decide(GIZMO, ctx, transferCommand, null);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(decision.source).toBe("scripted");
    expect(decision.say).toContain("RedBucks");
  });

  it("treats an empty-string key as no key", async () => {
    const fetchImpl = okFetch({ action: { kind: "none" }, say: "hi" });
    const decide = createBrowserBrain({ getKey: () => "", fetchImpl });

    await decide(GIZMO, ctx, [], null);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("stops retrying a key OpenRouter rejected with 401", async () => {
    const fetchImpl = statusFetch(401);
    const onScripted = vi.fn();
    const decide = createBrowserBrain({ getKey: () => "sk-bad", fetchImpl, onScripted });

    expect((await decide(GIZMO, ctx, [], null)).source).toBe("scripted");
    expect(onScripted).toHaveBeenCalledWith(expect.stringContaining("401"));

    await decide(GIZMO, ctx, [], null);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onScripted).toHaveBeenCalledTimes(1);
  });

  it("retries once the operator supplies a different key", async () => {
    const fetchImpl = statusFetch(401);
    let key = "sk-bad";
    const decide = createBrowserBrain({ getKey: () => key, fetchImpl });

    await decide(GIZMO, ctx, [], null);
    key = "sk-fresh";
    await decide(GIZMO, ctx, [], null);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps the key but skips the turn when rate limited", async () => {
    const fetchImpl = statusFetch(429);
    const onScripted = vi.fn();
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl, onScripted });

    await decide(GIZMO, ctx, [], null);
    await decide(GIZMO, ctx, [], null);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onScripted).toHaveBeenCalledWith(expect.stringMatching(/rate limited/i));
  });

  it("reports any other HTTP failure with its status", async () => {
    const onScripted = vi.fn();
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl: statusFetch(503), onScripted });

    expect((await decide(GIZMO, ctx, transferCommand, null)).source).toBe("scripted");
    expect(onScripted).toHaveBeenCalledWith("OpenRouter error 503.");
  });

  it("survives a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const onScripted = vi.fn();
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl, onScripted });

    expect((await decide(GIZMO, ctx, transferCommand, null)).source).toBe("scripted");
    expect(onScripted).toHaveBeenCalledWith("Call failed: offline");
  });

  it("survives a response body that is not valid JSON", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new Error("bad body");
      },
    })) as unknown as typeof fetch;
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl });

    expect((await decide(GIZMO, ctx, transferCommand, null)).source).toBe("scripted");
  });

  it("falls back quietly when the completion has no content", async () => {
    const onScripted = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [] }),
    })) as unknown as typeof fetch;
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl, onScripted });

    expect((await decide(GIZMO, ctx, transferCommand, null)).source).toBe("scripted");
    expect(onScripted).not.toHaveBeenCalled();
  });
});

describe("createBrowserBrain — outbound request", () => {
  async function captureRequest(over: Partial<Parameters<typeof createBrowserBrain>[0]> = {}) {
    const fetchImpl = okFetch({ action: { kind: "none", target_name: null, amount: null }, say: null });
    const decide = createBrowserBrain({ getKey: () => "sk-test", fetchImpl, ...over });
    await decide(BLAZE, ctx, transferCommand, { kind: "none", target_name: null, amount: null });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    return { url, init: init as RequestInit, body: JSON.parse(init.body as string) };
  }

  it("posts to OpenRouter with the operator's key", async () => {
    const { url, init } = await captureRequest();
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect((init.headers as Record<string, string>)["X-Title"]).toBe("Capability Wall");
  });

  it("sends the persona system prompt and the treasury context", async () => {
    const { body } = await captureRequest();
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain(`You are ${BLAZE.name}`);
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toContain("Operator Operator has 300 RedBucks");
    expect(body.messages[1].content).toContain("send 100 RedBucks");
  });

  it("constrains the response to the strict decision schema", async () => {
    const { body } = await captureRequest();
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.properties.action.properties.kind.enum).toEqual([
      "none",
      "transfer",
    ]);
    expect(body.max_tokens).toBe(500);
  });

  it("applies the routing policy, including data_collection deny", async () => {
    const { body } = await captureRequest();
    expect(body.provider).toEqual({
      require_parameters: true,
      allow_fallbacks: true,
      data_collection: "deny",
    });
  });

  it("honours a caller-selected model over the auto router", async () => {
    const { body } = await captureRequest({ getModel: () => "vendor/pinned-model" });
    expect(body.model).toBe("vendor/pinned-model");
    expect(body.plugins).toBeUndefined();
  });

  it("uses the auto router by default", async () => {
    const { body } = await captureRequest({ getModel: () => AUTO_MODEL });
    expect(body.model).toBe(AUTO_MODEL);
    expect(body.plugins[0].id).toBe("auto-router");
  });
});

describe("createBrowserBrain — response handling", () => {
  it("reports the model OpenRouter actually served", async () => {
    const decide = createBrowserBrain({
      getKey: () => "sk-test",
      fetchImpl: okFetch({ action: { kind: "none" }, say: "ok" }, "vendor/served-model"),
    });
    expect((await decide(BLAZE, ctx, [], null)).model).toBe("vendor/served-model");
  });

  it("nulls a non-string model field", async () => {
    const decide = createBrowserBrain({
      getKey: () => "sk-test",
      fetchImpl: okFetch({ action: { kind: "none" }, say: "ok" }, { name: "weird" }),
    });
    expect((await decide(BLAZE, ctx, [], null)).model).toBeNull();
  });

  it("bounds an over-long model message to 160 chars", async () => {
    const decide = createBrowserBrain({
      getKey: () => "sk-test",
      fetchImpl: okFetch({ action: { kind: "none" }, say: "z".repeat(500) }),
    });
    expect((await decide(BLAZE, ctx, [], null)).say!.length).toBe(160);
  });

  it("rejects a transfer target that is not the live operator", async () => {
    const decide = createBrowserBrain({
      getKey: () => "sk-test",
      fetchImpl: okFetch({
        action: { kind: "transfer", target_name: "Ghost", amount: 500 },
        say: "wired",
      }),
    });
    const decision = await decide(BLAZE, ctx, [], null);
    expect(decision.action.target_name).toBeNull();
    expect(decision.raw?.action?.target_name).toBe("Ghost");
  });
});
