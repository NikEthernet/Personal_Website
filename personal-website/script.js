const root = document.documentElement;
const pages = [...document.querySelectorAll(".page")];
const dots = [...document.querySelectorAll(".dots a")];
const navLinks = [...document.querySelectorAll(".nav a")];

/* ---- Shape themes ----
   The diamond holds three shapes. Clicking one makes it the active theme
   (decorations + colors), and the previously active shape takes its place
   in the diamond, so the options are always the other three shapes. */
const ALL = ["square", "triangle", "circle", "star"];
let state = { active: "square", slots: ["triangle", "circle", "star"] };
try {
  const s = JSON.parse(localStorage.getItem("shapeTheme"));
  if ([s.active, ...s.slots].sort().join() === [...ALL].sort().join()) state = s;
} catch {}

const slotEls = [...document.querySelectorAll(".slot")];
const shapeBtns = [...document.querySelectorAll(".shape-toggle button")];
function render() {
  root.dataset.shape = state.active;
  slotEls.forEach((el, i) => {
    el.dataset.shape = state.slots[i];
    el.setAttribute("aria-label", `Switch to ${state.slots[i]} theme`);
  });
  shapeBtns.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.shape === state.active)));
}
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

// one place decides what happens when a shape is picked, from the diamond or the top-right switch
function pick(shape) {
  if (shape === state.active) return;
  const i = state.slots.indexOf(shape);
  state.slots[i] = state.active;   // the old theme's shape takes the picked shape's place in the diamond
  state.active = shape;
  render();
  buildScatter();
  collectDrifters();
  restart(root, "swapped");
  if (slotEls[i]) restart(slotEls[i], "pop");
  try { localStorage.setItem("shapeTheme", JSON.stringify(state)); } catch {}
}
slotEls.forEach((el, i) => el.addEventListener("click", () => pick(state.slots[i])));
shapeBtns.forEach((b) => b.addEventListener("click", () => pick(b.dataset.shape)));
render();

/* ---- Nav collapse ---- */
const topbar = document.querySelector(".topbar");
const toggle = document.getElementById("navToggle");
toggle.addEventListener("click", () => {
  const collapsed = topbar.classList.toggle("collapsed");
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
});

/* ---- Active page tracking (dots + nav) ---- */
let current = 0;
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    current = pages.indexOf(e.target);
    dots.forEach((d) => d.classList.toggle("active", d.dataset.target === id));
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
    history.replaceState(null, "", "#" + id);
  });
}, { threshold: 0.6 });
if (pages.length > 1) pages.forEach((p) => io.observe(p));   // single-page write-ups have no stoppers

/* ---- Keyboard: arrows / PageUp / PageDown step one page at a time ---- */
const go = (i) => pages[Math.max(0, Math.min(pages.length - 1, i))].scrollIntoView({ behavior: "smooth" });
addEventListener("keydown", (e) => {
  if (pages.length < 2 || e.target.matches("input, textarea")) return;
  if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); go(current + 1); }
  if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); go(current - 1); }
});

/* ---- Click bursts: shapes fly out in straight lines from the cursor ---- */
const burst = document.getElementById("burst");
const burstColors = { square: "#4f77a8", triangle: "#9edb94", circle: "#ee8280", star: "#ffe45e" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const LIFESPAN = 2000;

document.addEventListener("click", (e) => {
  if (reduceMotion.matches) return;
  if (e.target.closest("a, button, input, textarea, select, label, .topbar, .dots, .shape-toggle, .mode-toggle")) return;

  while (burst.childElementCount > 80) burst.firstElementChild.remove();

  const n = 6 + Math.floor(Math.random() * 3);
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const shape = ALL[Math.floor(Math.random() * ALL.length)];
    // evenly fanned out around the click, with jitter so it never looks uniform
    const angle = offset + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const dist = 110 + Math.random() * 150;
    const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
    const spin = (Math.random() - 0.5) * 360;

    const el = document.createElement("i");
    el.className = "b-" + shape;
    el.style.width = el.style.height = 12 + Math.random() * 16 + "px";
    // the active theme's shape uses the darker theme tone so it never blends into the background
    el.style.background = shape === state.active ? "var(--slate-dark)"
      : shape === "square" && root.dataset.mode === "dark" ? "#84b0e6" : burstColors[shape];
    burst.appendChild(el);

    const at = (x, y, rot, s) =>
      `translate(${e.clientX + x}px, ${e.clientY + y}px) translate(-50%, -50%) rotate(${rot}deg) scale(${s})`;
    el.animate(
      [{ transform: at(0, 0, 0, 0.4) }, { transform: at(dx, dy, spin, 1) }],
      { duration: LIFESPAN, easing: "cubic-bezier(.15,.75,.3,1)", fill: "forwards" }
    );
    el.animate(
      [{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }],
      { duration: LIFESPAN, fill: "forwards" }
    ).onfinish = () => el.remove();
  }
});

/* ---- Scattered shapes ----
   Entries are [x%, y%, size (vmin), rotation, tone 1-3], placed in the margins around the content.
   Every theme gets its own arrangement: the home page has four hand-placed layouts, and each other
   page reuses one composition that is mirrored or flipped per theme. A little jitter is added on every build. */
const LAYOUTS = {
  detail: [   // long write-up pages: shapes run down both margins
    [5, 9, 9, 20, 1], [94, 14, 6, -16, 3], [7, 26, 5, -12, 2], [93, 31, 8, 24, 2],
    [5, 44, 7, 14, 3], [95, 52, 5, -20, 1], [6, 63, 10, -18, 1], [93, 70, 6, 12, 3],
    [5, 82, 5, 22, 2], [94, 88, 9, -14, 2], [7, 94, 6, 16, 3], [91, 41, 4, 10, 1],
  ],
  about: [
    [18, 27, 15, 28, 1], [9, 47, 5, -14, 2],
    [77, 29, 7, 15, 3], [81, 33.5, 4.5, -10, 2],
    [80, 75, 10, 14, 1], [71.5, 83, 5, -12, 3],
    [6, 18, 4, 20, 3], [22, 70, 8, -18, 2], [12, 88, 5.5, 14, 1],
    [90, 52, 5, -20, 1], [62, 91, 4, 8, 2], [88, 14, 4.5, 24, 2],
  ],
  projects: [
    [72, 15, 11, -18, 1], [82, 20, 5.5, 20, 3], [64, 12.5, 4, 8, 2],
    [12, 84, 13, 20, 1], [22, 91, 6, -10, 3], [5, 70, 4, 30, 2],
    [90, 78, 6, 10, 2],
    [45, 17, 5, 18, 2], [55, 90, 7, -12, 1], [78, 88, 10, 20, 3],
    [6, 34, 5, -24, 3], [94, 55, 4, 12, 1], [32, 13, 4, 8, 3],
  ],
  experience: [
    [9, 22, 12, -22, 1], [5, 36, 4.5, 14, 3],
    [80, 12, 6, 24, 3], [85.5, 17, 4, -8, 2],
    [88, 86, 14, 16, 2], [78, 92, 6, -14, 1], [93, 70, 4, 22, 3],
    [30, 11, 5, 20, 3], [50, 15, 6, -14, 2], [15, 86, 8, 18, 1],
    [30, 93, 4.5, -10, 3], [60, 88, 5, 24, 2], [8, 60, 5.5, -16, 2],
  ],
  contact: [
    [20, 70, 14, -16, 1], [11, 83, 6, 24, 3], [27, 85, 4.5, 10, 2],
    [82, 24, 11, 22, 2], [74, 14, 5, -12, 1], [90, 38, 4, 12, 3],
    [8, 28, 7, 20, 2], [18, 14, 4.5, -12, 3], [90, 68, 8, -22, 1],
    [78, 85, 5, 14, 3], [62, 92, 6, -18, 2], [88, 53, 4, 20, 2],
  ],
  resume: [
    [15, 20, 13, 18, 1], [23, 27, 6, -20, 2],
    [84, 30, 8, -14, 3], [90, 40, 4.5, 20, 1],
    [78, 78, 12, 26, 2], [66, 88, 5, -8, 3],
    [24, 80, 9, -24, 1], [12, 66, 4.5, 10, 2],
    [50, 14, 5, 18, 3], [86, 14, 7, -24, 2], [8, 40, 6, 22, 2],
    [93, 62, 5, -12, 3], [40, 90, 6, 20, 1],
  ],
};
// the home page is asymmetric (name, diamond, tagline), so each theme gets its own hand-placed set
const HOME_LAYOUTS = {
  square: [
    [14, 62, 12, -20, 1], [24, 78, 6, 22, 3], [7, 80, 5, 10, 2], [30, 50, 4, -14, 2],
    [78, 22, 11, 24, 2], [87, 31, 5.5, -16, 3], [70, 14, 4.5, 12, 1],
    [84, 56, 7, 18, 1], [72, 68, 4, -22, 3], [38, 90, 6, 14, 2],
  ],
  triangle: [
    [85, 47, 13, 16, 1], [75, 62, 6, -20, 3], [92, 66, 4.5, 24, 2],
    [68, 18, 5, 10, 2], [80, 13, 7, -18, 3],
    [20, 48, 9, 22, 1], [8, 70, 6, -12, 2], [27, 86, 10, 18, 3],
    [40, 92, 4.5, -14, 1], [10, 90, 4, 20, 3],
  ],
  circle: [
    [10, 58, 10, -24, 2], [22, 72, 5, 14, 1], [16, 88, 7.5, 20, 3], [31, 40, 4.5, -10, 3],
    [88, 20, 9, 16, 3], [74, 28, 5, -20, 1], [79, 52, 6.5, 24, 2],
    [90, 72, 5, -14, 1], [68, 74, 8, 12, 3], [44, 91, 5, -18, 2],
  ],
  star: [
    [26, 34, 5.5, 20, 2], [9, 52, 7, -16, 3], [19, 66, 12, 22, 1], [6, 84, 5, 10, 2],
    [33, 80, 6, -20, 3], [64, 12, 5, 14, 3], [82, 24, 12, -20, 2],
    [91, 40, 4.5, 18, 1], [72, 45, 5, -12, 3], [86, 68, 9, 14, 1], [60, 76, 4, 22, 2],
  ],
};
const VARIANTS = {
  square:   (x, y, r) => [x, y, r],
  triangle: (x, y, r) => [100 - x, y, -r],
  circle:   (x, y, r) => [x, Math.max(14, 100 - y), -r],
  star:     (x, y, r) => [100 - x, Math.max(14, 100 - y), r],
};
function layoutFor(id, theme) {
  if (id === "home") return HOME_LAYOUTS[theme];
  return LAYOUTS[id].map(([x, y, s, r, tone]) => {
    const [nx, ny, nr] = VARIANTS[theme](x, y, r);
    return [nx, ny, s, nr, tone];
  });
}
const jitter = (v, r) => v + (Math.random() - 0.5) * 2 * r;
function buildScatter() {
  document.querySelectorAll(".scatter").forEach((n) => n.remove());
  for (const page of pages) {
    const id = page.dataset.layout || page.id;
    if (id !== "home" && !LAYOUTS[id]) continue;
    const host = document.createElement("div");
    host.className = "scatter";
    host.setAttribute("aria-hidden", "true");
    layoutFor(id, state.active).forEach(([x, y, s, r, tone]) => {
      const el = document.createElement("i");
      el.className = "t" + tone;
      el.style.cssText = `--x:${jitter(x, 1.2).toFixed(1)};--y:${jitter(y, 1.2).toFixed(1)};--s:${(s * jitter(1, 0.08)).toFixed(1)};--r:${jitter(r, 10).toFixed(0)}`;
      host.appendChild(el);
    });
    page.prepend(host);
  }
}
buildScatter();

/* ---- Shapes: drift away from the cursor, and shift gently while you scroll ---- */
const PARALLAX = 2.5;   // scroll movement strength: 1 = the old gentle amount, higher = shapes travel further
let drifters = [];
function collectDrifters() {
  drifters = [...document.querySelectorAll(".deco i, .scatter i")].map((el) => {
    const s = parseFloat(el.style.getPropertyValue("--s"));
    const base = Number.isNaN(s)
      ? [0.2, 0.12, 0.07][[...el.parentNode.children].indexOf(el)] ?? 0.1   // hero cluster: big, medium, small
      : 0.05 + 0.15 * Math.min(1, Math.max(0, (s - 4) / 11));               // bigger shapes sit "closer" and move more
    return { el, x: 0, y: 0, par: 0, depth: base * PARALLAX, page: pages.indexOf(el.closest(".page")) };
  });
}
const PUSH = 22;      // furthest a shape moves away from the cursor (px)
const SETTLE = 0.28;  // seconds a shape takes to ease toward its target (higher = softer)
const FOLLOW = 0.12;  // seconds the cursor's "ghost" takes to catch up with the real cursor
let pointer = null, soft = null, lastInput = 0, lastT = 0, frame = 0;

function drift(now) {
  const dt = Math.min((now - (lastT || now)) / 1000, 0.05);
  lastT = now;
  const kPointer = 1 - Math.exp(-dt / FOLLOW);
  const kShape = 1 - Math.exp(-dt / SETTLE);
  let busy = false;

  // shapes react to a smoothed cursor, so quick mouse flicks never jerk them
  if (pointer) {
    soft = soft || { ...pointer };
    soft.x += (pointer.x - soft.x) * kPointer;
    soft.y += (pointer.y - soft.y) * kPointer;
    if (Math.hypot(pointer.x - soft.x, pointer.y - soft.y) > 0.5) busy = true;
  } else {
    soft = null;
  }

  const prs = pages.map((p) => p.getBoundingClientRect());
  for (const d of drifters) {
    const r = d.el.getBoundingClientRect();
    const pr = prs[d.page];
    // parallax: a page's shapes travel a little faster than the page itself, so scrolling down
    // nudges them upward (and back down when scrolling up). At rest (page aligned) the offset is 0.
    // Long write-up pages measure from the middle of the screen instead.
    let par = 0;
    if (!reduceMotion.matches) {
      if (pr.height > innerHeight * 1.3) {
        const restY = r.top + r.height / 2 - d.y - d.par;   // where the shape sits without parallax or cursor push
        const lim = innerHeight * 0.6;
        par = Math.max(-lim, Math.min(lim, d.depth * 0.8 * (restY - innerHeight / 2)));
      } else {
        par = d.depth * pr.top;
      }
    }
    d.par = par;
    let tx = 0, ty = 0;
    if (soft && r.bottom > 0 && r.top < innerHeight) {
      // the shape's resting center = where it is now minus how far the cursor has pushed it
      const dx = r.left + r.width / 2 - d.x - soft.x;
      const dy = r.top + r.height / 2 - d.y - soft.y;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = 90 + r.width * 0.9;
      if (dist < reach) {
        const t = 1 - dist / reach;
        const push = PUSH * t * t * (3 - 2 * t);   // smoothstep: gentle start, gentle finish
        tx = (dx / dist) * push;
        ty = (dy / dist) * push;
      }
    }
    d.x += (tx - d.x) * kShape;
    d.y += (ty - d.y) * kShape;
    if (Math.abs(tx - d.x) < 0.05 && Math.abs(ty - d.y) < 0.05) { d.x = tx; d.y = ty; } else busy = true;
    d.el.style.translate = `${d.x.toFixed(2)}px ${(d.y + par).toFixed(2)}px`;
  }
  frame = busy || (pointer && now - lastInput < 600) ? requestAnimationFrame(drift) : 0;
  if (!frame) lastT = 0;
}
const kick = () => { lastInput = performance.now(); if (!frame) frame = requestAnimationFrame(drift); };
addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch" || reduceMotion.matches) return;
  pointer = { x: e.clientX, y: e.clientY };
  kick();
}, { passive: true });
document.documentElement.addEventListener("mouseleave", () => { pointer = null; kick(); });
addEventListener("scroll", kick, { passive: true });
addEventListener("resize", kick);
collectDrifters();
kick();

/* ---- Light / dark mode ---- */
const modeBtn = document.getElementById("modeToggle");
const applyMode = (m) => { root.dataset.mode = m; modeBtn.setAttribute("aria-checked", String(m === "dark")); };
applyMode(root.dataset.mode === "dark" ? "dark" : "light");
modeBtn.addEventListener("click", () => {
  const next = root.dataset.mode === "dark" ? "light" : "dark";
  applyMode(next);
  try { localStorage.setItem("mode", next); } catch {}
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  let saved = null;
  try { saved = localStorage.getItem("mode"); } catch {}
  if (!saved) applyMode(e.matches ? "dark" : "light");
});

/* ---- Phones: start with the nav collapsed so it doesn't cover the mode switch ---- */
if (matchMedia("(max-width: 640px)").matches) {
  topbar.classList.add("collapsed");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Expand navigation");
}