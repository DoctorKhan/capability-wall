/** Chat CTF chrome: side-panel tabs and keyboard shortcuts. */

const shell = document.getElementById("app-shell")!;
const telemetry = document.getElementById("telemetry")!;
const ctf = document.getElementById("ctf")!;
const tabFeed = document.getElementById("tab-feed")!;
const tabMission = document.getElementById("tab-mission")!;

let activePanel: "feed" | "mission" = "mission";

export function showApp() {
  shell.classList.add("ready");
}

export function setSidePanel(panel: "feed" | "mission") {
  activePanel = panel;
  telemetry.classList.toggle("hidden", panel !== "feed");
  ctf.classList.toggle("hidden", panel !== "mission");
  tabFeed.classList.toggle("active", panel === "feed");
  tabMission.classList.toggle("active", panel === "mission");
  tabFeed.setAttribute("aria-selected", panel === "feed" ? "true" : "false");
  tabMission.setAttribute("aria-selected", panel === "mission" ? "true" : "false");
}

export function bindUiHandlers() {
  tabFeed.addEventListener("click", () => setSidePanel("feed"));
  tabMission.addEventListener("click", () => setSidePanel("mission"));

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyM" && document.activeElement !== document.getElementById("chat-input")) {
      setSidePanel(activePanel === "mission" ? "feed" : "mission");
      e.preventDefault();
    }
  });
}

setSidePanel("mission");
