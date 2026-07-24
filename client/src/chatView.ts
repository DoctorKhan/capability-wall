/** DOM-safe chat and telemetry rendering. */

export interface ChatLine {
  name: string;
  color: string;
  isBot: boolean;
  text: string;
  to?: string | null;
}

export interface TelemetryEntry {
  name: string;
  color: string;
  action: { kind: string; target_name?: string | null; amount?: number | null };
  source: string;
  say: string | null;
  model: string | null;
}

export function appendChatLine(container: HTMLElement, line: ChatLine, maxLines = 80): void {
  const row = document.createElement("div");
  const who = document.createElement("span");
  who.style.color = line.color;
  who.style.fontWeight = "700";
  who.textContent = line.name;
  row.appendChild(who);

  if (line.to) {
    const arrow = document.createElement("span");
    arrow.style.color = "#9a88b8";
    arrow.textContent = ` → ${line.to}`;
    row.appendChild(arrow);
  } else if (line.isBot) {
    const tag = document.createElement("span");
    tag.className = "bot-tag";
    tag.textContent = " [AI]";
    row.appendChild(tag);
  }

  row.appendChild(document.createTextNode(`: ${line.text}`));
  container.appendChild(row);
  while (container.children.length > maxLines) {
    container.removeChild(container.firstChild!);
  }
  container.scrollTop = container.scrollHeight;
}

export function appendSystemLine(container: HTMLElement, text: string, maxLines = 80): void {
  const row = document.createElement("div");
  row.className = "system";
  row.textContent = text;
  container.appendChild(row);
  while (container.children.length > maxLines) {
    container.removeChild(container.firstChild!);
  }
  container.scrollTop = container.scrollHeight;
}

export function prependTelemetryEntry(container: HTMLElement, entry: TelemetryEntry, maxEntries = 12): void {
  const row = document.createElement("div");
  row.className = "entry";

  const bold = document.createElement("b");
  bold.textContent = entry.name;
  bold.style.color = entry.color;
  row.appendChild(bold);

  const target =
    entry.action.target_name ??
    (entry.action.amount != null ? `${entry.action.amount} RB` : "");
  row.appendChild(
    document.createTextNode(` → ${entry.action.kind}${target ? " " + target : ""}`),
  );

  const src = document.createElement("span");
  src.className = "src";
  const modelLabel = entry.source === "llm" && entry.model ? ` · ${entry.model}` : "";
  const sayLabel = entry.say ? ` · said: "${entry.say}"` : "";
  src.textContent = ` · ${entry.source}${modelLabel}${sayLabel}`;
  row.appendChild(src);

  container.prepend(row);
  while (container.children.length > maxEntries) {
    container.removeChild(container.lastChild!);
  }
}

export function flashEconomyHud(element: HTMLElement, redBucks: number, lastValue: number | null): number {
  element.textContent = `${redBucks} RB`;
  if (lastValue !== null && redBucks !== lastValue) {
    element.classList.add("ledger-flash");
    window.setTimeout(() => element.classList.remove("ledger-flash"), 700);
  }
  return redBucks;
}
