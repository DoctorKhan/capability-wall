/** Chat CTF chrome: side-panel tabs and keyboard shortcuts. */

export type SidePanel = "feed" | "mission";

export interface UiDom {
  shell: HTMLElement;
  telemetry: HTMLElement;
  ctf: HTMLElement;
  tabFeed: HTMLElement;
  tabMission: HTMLElement;
  chatInput: HTMLElement | null;
  active: SidePanel;
}

/** Resolve the chrome elements. Nothing is read or mutated at import time. */
export function bindUiDom(root: Document = document): UiDom {
  return {
    shell: root.getElementById("app-shell")!,
    telemetry: root.getElementById("telemetry")!,
    ctf: root.getElementById("ctf")!,
    tabFeed: root.getElementById("tab-feed")!,
    tabMission: root.getElementById("tab-mission")!,
    chatInput: root.getElementById("chat-input"),
    active: "mission",
  };
}

export function showApp(dom: UiDom): void {
  dom.shell.classList.add("ready");
}

export function setSidePanel(dom: UiDom, panel: SidePanel): void {
  dom.active = panel;
  dom.telemetry.classList.toggle("hidden", panel !== "feed");
  dom.ctf.classList.toggle("hidden", panel !== "mission");
  dom.tabFeed.classList.toggle("active", panel === "feed");
  dom.tabMission.classList.toggle("active", panel === "mission");
  dom.tabFeed.setAttribute("aria-selected", panel === "feed" ? "true" : "false");
  dom.tabMission.setAttribute("aria-selected", panel === "mission" ? "true" : "false");
}

export function bindUiHandlers(dom: UiDom): void {
  const doc = dom.shell.ownerDocument;

  dom.tabFeed.addEventListener("click", () => setSidePanel(dom, "feed"));
  dom.tabMission.addEventListener("click", () => setSidePanel(dom, "mission"));

  doc.defaultView?.addEventListener("keydown", (e) => {
    if (e.code !== "KeyM") return;
    if (dom.chatInput && doc.activeElement === dom.chatInput) return;
    setSidePanel(dom, dom.active === "mission" ? "feed" : "mission");
    e.preventDefault();
  });

  setSidePanel(dom, dom.active);
}
