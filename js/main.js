/* =========================================================
   WHATSAPP DA BRASA
   Troque apenas o número abaixo.
   Formato: código do país + DDD + número, somente dígitos.
   Exemplo: 5511999990000
   ========================================================= */
const WHATSAPP_NUMBER = "5567981668133";

const WA_MESSAGES = {
  geral: "Olá, BRASA. Quero falar sobre um projeto.",
  pedro: "Olá, Pedro. Quero conversar com a BRASA."
};

const SECTION_LABELS = {
  inicio: "Início",
  oficio: "O que fazemos",
  sites: "Sites",
  automacoes: "Automações",
  portfolio: "Portfólio",
  socios: "Sócios",
  contato: "Contato"
};

function waHref(kind) {
  const text = encodeURIComponent(WA_MESSAGES[kind] || WA_MESSAGES.geral);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

document.querySelectorAll("[data-wa]").forEach((el) => {
  el.href = waHref(el.dataset.wa);
  if (el.classList.contains("wa") || el.classList.contains("btn-flame") || el.classList.contains("contact-btn")) {
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  }
  el.addEventListener("click", () => {
    const via = el.classList.contains("wa") ? "botao" : el.classList.contains("btn-flame") ? "pedro" : "contato";
    BrasaTrack.track("wa", via);
  });
});

BrasaTrack.track("view");

const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const navCurrent = document.getElementById("navCurrent");
const progressBar = document.getElementById("progressBar");

navToggle.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  navToggle.querySelector(".sr-only").textContent = open ? "Fechar menu" : "Abrir menu";
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    document.body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

const sectionLinks = document.querySelectorAll("[data-section]");
const observed = document.querySelectorAll("[data-section-observe]");

function setCurrent(id) {
  sectionLinks.forEach((link) => {
    if (link.dataset.section === id) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
  if (navCurrent && SECTION_LABELS[id]) navCurrent.textContent = SECTION_LABELS[id];
}

function updateSection() {
  const line = window.innerHeight * 0.62;
  let current = "inicio";
  observed.forEach((section) => {
    if (section.getBoundingClientRect().top < line) current = section.dataset.sectionObserve;
  });
  setCurrent(current);
}

setCurrent("inicio");

const reveals = document.querySelectorAll("[data-reveal]");
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
reveals.forEach((el) => revealObserver.observe(el));

const hero = document.querySelector(".hero");
const flame = document.getElementById("flame");
const logoWrap = document.getElementById("logoWrap");
let mx = 0;
let my = 0;
let smx = 0;
let smy = 0;

hero.addEventListener("pointermove", (event) => {
  const rect = hero.getBoundingClientRect();
  mx = (event.clientX - rect.left) / rect.width - 0.5;
  my = (event.clientY - rect.top) / rect.height - 0.5;
});
hero.addEventListener("pointerleave", () => {
  mx = 0;
  my = 0;
});

const stage = document.getElementById("stage");
document.querySelectorAll(".svc-list button").forEach((button) => {
  const activate = () => {
    document.querySelectorAll(".svc-list button").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    stage.dataset.scene = button.dataset.scene;
  };
  button.addEventListener("click", activate);
  button.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") activate();
  });
});

function bindParallax(root) {
  const layers = root.querySelectorAll("[data-depth]");
  const reset = () => layers.forEach((layer) => { layer.style.transform = ""; });
  root.addEventListener("pointermove", (event) => {
    const rect = root.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth) || 10;
      const tilt = layer.classList.contains("mock") ? ` rotateX(${(-dy * 5).toFixed(2)}deg) rotateY(${(dx * 7).toFixed(2)}deg)` : "";
      layer.style.transform = `translate3d(${(dx * depth).toFixed(1)}px, ${(dy * depth).toFixed(1)}px, 0)${tilt}`;
    });
  });
  root.addEventListener("pointerleave", reset);
}

bindParallax(document.getElementById("petSpread"));
bindParallax(document.getElementById("clinicSpread"));

const julio = document.getElementById("julio");
if (julio) {
  julio.addEventListener("pointermove", (event) => {
    const rect = julio.getBoundingClientRect();
    julio.style.setProperty("--sx", `${event.clientX - rect.left}px`);
    julio.style.setProperty("--sy", `${event.clientY - rect.top}px`);
  });
}

const contactPanel = document.getElementById("contactPanel");
if (contactPanel) {
  contactPanel.addEventListener("pointermove", (event) => {
    const rect = contactPanel.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    contactPanel.style.setProperty("--gx", `${x}%`);
    contactPanel.style.setProperty("--gy", `${y}%`);
  });
}

const ink = document.getElementById("ink");
const inkSvg = document.getElementById("inkSvg");
const inkGroup = document.getElementById("inkGroup");

const STREAKS = [
  { x: 0.14, w: 0.03, len: 0.46, lag: 0.1, color: "#ff4514" },
  { x: 0.3, w: 0.038, len: 0.74, lag: 0.02, color: "#ff5a16" },
  { x: 0.48, w: 0.026, len: 0.52, lag: 0.08, color: "#e83212" },
  { x: 0.64, w: 0.042, len: 0.88, lag: 0, color: "#ff3c14" },
  { x: 0.82, w: 0.032, len: 0.6, lag: 0.05, color: "#d21410" }
];

const streaks = [];

function buildInk() {
  inkGroup.replaceChildren();
  streaks.length = 0;
  STREAKS.forEach((streak) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", streak.color);
    inkGroup.appendChild(path);
    streaks.push(path);
  });
}

function streakPath(x, width, length) {
  const r = width / 2;
  const h = Math.max(width * 1.8, length);
  const bottom = h - r;
  return `M ${x.toFixed(1)} 0 H ${(x + width).toFixed(1)} V ${bottom.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x.toFixed(1)} ${bottom.toFixed(1)} Z`;
}

function renderInk(time) {
  const width = inkSvg.clientWidth || 1;
  const height = inkSvg.clientHeight || 1;
  inkSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const rect = ink.getBoundingClientRect();
  const start = window.innerHeight * 0.96;
  const end = window.innerHeight * 0.22;
  let progress = (start - rect.top) / (start - end);
  progress = Math.min(1, Math.max(0, progress));
  const eased = 1 - (1 - progress) ** 3;
  const t = time * 0.001;

  STREAKS.forEach((streak, index) => {
    const local = Math.min(1, Math.max(0, (eased - streak.lag) / (1 - streak.lag)));
    const breathe = Math.sin(t * 0.65 + index) * 4;
    const length = height * streak.len * local + breathe;
    const path = streaks[index];
    if (!path) return;
    if (length < 28) {
      path.setAttribute("d", "");
      return;
    }
    path.setAttribute("d", streakPath(streak.x * width, Math.max(14, streak.w * width), length));
  });
}

buildInk();
window.addEventListener("resize", () => {
  buildInk();
  renderInk(performance.now());
});

function frame(time) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const scrolled = max > 0 ? window.scrollY / max : 0;
  progressBar.style.transform = `scaleX(${scrolled})`;
  nav.classList.toggle("is-scrolled", window.scrollY > 24);
  updateSection();

  smx += (mx - smx) * 0.08;
  smy += (my - smy) * 0.08;
  flame.style.transform = `translate(${(smx * 14).toFixed(1)}px, ${(smy * 8).toFixed(1)}px)`;
  logoWrap.style.transform = `translate(${(smx * -18).toFixed(1)}px, ${(smy * -12).toFixed(1)}px)`;
  if (Math.floor(time / 50) !== frame.last) {
    frame.last = Math.floor(time / 50);
    const rect = ink.getBoundingClientRect();
    if (rect.bottom > -80 && rect.top < window.innerHeight + 80) renderInk(time);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
