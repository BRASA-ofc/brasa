const USER = "FOGO";
const PASSWORD = "Brasa@1000";
const VIA = {
  botao: "Botão flutuante",
  contato: "Entrar em contato",
  pedro: "Conversar com Pedro"
};

const gate = document.getElementById("gate");
const desk = document.getElementById("desk");
const form = document.getElementById("loginForm");
const error = document.getElementById("loginError");
let range = "month";
let timer = 0;

function when(ts) {
  if (!ts) return "Nenhuma ainda";
  const diff = Date.now() - ts;
  if (diff < 60000) return "agora";
  if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `há ${Math.floor(diff / 3600000)} h`;
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function login(name, password) {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    if (response.status === 401) return false;
    if (response.ok) {
      const data = await response.json();
      sessionStorage.setItem("brasa-token", data.token);
      sessionStorage.setItem("brasa-admin", "1");
      return true;
    }
  } catch {
    /* site aberto sem o servidor */
  }
  if (name === USER && password === PASSWORD) {
    sessionStorage.removeItem("brasa-token");
    sessionStorage.setItem("brasa-admin", "1");
    return true;
  }
  return false;
}

function pessoas(n) {
  if (!n) return "Nenhuma pessoa";
  return n === 1 ? "1 pessoa" : `${n} pessoas`;
}

async function loadEvents() {
  const token = sessionStorage.getItem("brasa-token");
  if (token) {
    try {
      const response = await fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.events)) return { events: data.events, remote: true };
      }
      if (response.status === 401) {
        sessionStorage.removeItem("brasa-token");
        sessionStorage.removeItem("brasa-admin");
        showGate();
        return { events: [], remote: false };
      }
    } catch {
      /* servidor fora do ar */
    }
  }
  return { events: BrasaTrack.readLocal(), remote: false };
}

function barHeight(value, max) {
  return value ? `${Math.max(10, Math.round((value / max) * 100))}%` : "0";
}

function tipText(bar) {
  return [
    bar.label,
    `Aberturas: ${bar.views} · ${pessoas(bar.viewPeople)}`,
    `WhatsApp: ${bar.wa} · ${pessoas(bar.waPeople)}`,
    `Portfólio: ${bar.portal} · ${pessoas(bar.portalPeople)}`,
    `Seu Petshop: ${bar.pet} · ${pessoas(bar.petPeople)}`,
    `Sua Clínica: ${bar.dent} · ${pessoas(bar.dentPeople)}`,
    `Sua Loja: ${bar.shop} · ${pessoas(bar.shopPeople)}`
  ].join("\n");
}

function placeTip(anchor) {
  const tip = document.getElementById("chartTip");
  const rect = anchor.getBoundingClientRect();
  tip.hidden = false;
  const box = tip.getBoundingClientRect();
  const pad = 12;
  let left = rect.left + rect.width / 2;
  left = Math.max(pad + box.width / 2, Math.min(left, window.innerWidth - pad - box.width / 2));
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(box.height + 8, rect.top - 8)}px`;
}

function render(stats, remote) {
  document.getElementById("sourceNote").textContent = remote
    ? "Vale para todo mundo que entrou por este endereço."
    : "Por enquanto só conta neste navegador.";
  document.getElementById("statViews").textContent = String(stats.views);
  document.getElementById("statPeople").textContent = String(stats.people);
  document.getElementById("statWa").textContent = String(stats.wa);
  document.getElementById("statPeopleWa").textContent = String(stats.peopleWa);
  document.getElementById("statLastView").textContent = stats.lastView ? `Última abertura ${when(stats.lastView)}` : "Nenhuma ainda";
  document.getElementById("statLastWa").textContent = stats.lastWa ? `Último clique ${when(stats.lastWa)}` : "Nenhum clique ainda";
  document.getElementById("statRate").textContent = stats.people
    ? `${stats.rate}% de quem abriu o site`
    : "Sem visitas neste período";
  document.getElementById("statPortal").textContent = String(stats.portal);
  document.getElementById("statPortalPeople").textContent = pessoas(stats.portalPeople);
  document.getElementById("statPortalPeopleN").textContent = String(stats.portalPeople);
  document.getElementById("statPet").textContent = String(stats.pet);
  document.getElementById("statPetPeople").textContent = pessoas(stats.petPeople);
  document.getElementById("statDent").textContent = String(stats.dent);
  document.getElementById("statDentPeople").textContent = pessoas(stats.dentPeople);
  document.getElementById("statShop").textContent = String(stats.shop);
  document.getElementById("statShopPeople").textContent = pessoas(stats.shopPeople);

  const max = Math.max(1, ...stats.bars.map((bar) => Math.max(bar.views, bar.wa, bar.portal)));
  const chart = document.getElementById("chart");
  const tip = document.getElementById("chartTip");
  tip.hidden = true;
  chart.innerHTML = "";
  stats.bars.forEach((bar, index) => {
    const col = document.createElement("div");
    col.className = "col";
    const bars = document.createElement("div");
    bars.className = "bars";
    [["view", bar.views], ["wa", bar.wa], ["portal", bar.portal]].forEach(([name, value]) => {
      const mark = document.createElement("i");
      mark.className = name;
      mark.style.height = barHeight(value, max);
      bars.append(mark);
    });
    const label = document.createElement("em");
    const dense = stats.bars.length > 12;
    label.textContent = !dense || index % 5 === 0 || index === stats.bars.length - 1 ? bar.label : "";
    col.append(bars, label);
    const open = () => {
      tip.textContent = tipText(bar);
      placeTip(col);
    };
    col.addEventListener("mouseenter", open);
    col.addEventListener("mouseleave", () => { tip.hidden = true; });
    col.addEventListener("click", open);
    chart.append(col);
  });

  const peak = stats.bars.reduce((best, bar) => (bar.views > best.views ? bar : best), { views: 0, label: "" });
  document.getElementById("peak").textContent = peak.views
    ? `Pico de aberturas: ${peak.label} · ${peak.views}`
    : "Sem pico neste período.";

  const origins = document.getElementById("origins");
  origins.innerHTML = "";
  Object.entries(VIA).forEach(([key, label]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${label}</span><b>${stats.via[key] || 0}</b>`;
    origins.append(li);
  });

  const recent = document.getElementById("recent");
  recent.innerHTML = "";
  if (!stats.recent.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Ainda sem movimento neste período.";
    recent.append(li);
    return;
  }
  stats.recent.forEach((event) => {
    const li = document.createElement("li");
    let text = "Abriu o site";
    if (event.t === "wa") text = `WhatsApp · ${VIA[event.via] || "clique"}`;
    if (event.t === "portfolio") text = "Botão do portfólio";
    if (event.t === "site" && event.via === "pet") text = "Foi para Seu Petshop";
    if (event.t === "site" && event.via === "dent") text = "Foi para Sua Clínica";
    if (event.t === "site" && event.via === "loja") text = "Foi para Sua Loja";
    li.innerHTML = `<span>${text}</span><time>${when(event.ts)}</time>`;
    recent.append(li);
  });
}

async function paint() {
  const loaded = await loadEvents();
  render(BrasaTrack.summarize(loaded.events, range), loaded.remote);
}

function showDesk() {
  gate.hidden = true;
  desk.hidden = false;
  paint();
  window.clearInterval(timer);
  timer = window.setInterval(paint, 20000);
}

function showGate() {
  desk.hidden = true;
  gate.hidden = false;
  window.clearInterval(timer);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.hidden = true;
  const data = new FormData(form);
  const ok = await login(String(data.get("name") || "").trim(), String(data.get("password") || ""));
  if (!ok) {
    error.hidden = false;
    return;
  }
  showDesk();
});

document.getElementById("logout").addEventListener("click", () => {
  sessionStorage.removeItem("brasa-admin");
  sessionStorage.removeItem("brasa-token");
  showGate();
});

document.getElementById("refresh").addEventListener("click", paint);

document.querySelectorAll(".periods button").forEach((button) => {
  button.addEventListener("click", () => {
    range = button.dataset.range;
    document.querySelectorAll(".periods button").forEach((item) => {
      item.setAttribute("aria-selected", item === button ? "true" : "false");
    });
    paint();
  });
});

sessionStorage.removeItem("brasa-admin");
sessionStorage.removeItem("brasa-token");
