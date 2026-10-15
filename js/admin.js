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

async function loadEvents() {
  const token = sessionStorage.getItem("brasa-token");
  if (token) {
    try {
      const response = await fetch("/api/events", { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.events)) return data.events;
      }
      if (response.status === 401) {
        sessionStorage.removeItem("brasa-token");
        sessionStorage.removeItem("brasa-admin");
        showGate();
        return [];
      }
    } catch {
      /* usa o registro deste navegador */
    }
  }
  return BrasaTrack.readLocal();
}

function render(stats) {
  document.getElementById("statViews").textContent = String(stats.views);
  document.getElementById("statPeople").textContent = String(stats.people);
  document.getElementById("statWa").textContent = String(stats.wa);
  document.getElementById("statPeopleWa").textContent = String(stats.peopleWa);
  document.getElementById("statLastView").textContent = stats.lastView ? `Última abertura ${when(stats.lastView)}` : "Nenhuma ainda";
  document.getElementById("statLastWa").textContent = stats.lastWa ? `Último clique ${when(stats.lastWa)}` : "Nenhum clique ainda";
  document.getElementById("statRate").textContent = stats.people
    ? `${stats.rate}% de quem abriu o site`
    : "Sem visitas neste período";

  const max = Math.max(1, ...stats.bars.map((bar) => Math.max(bar.views, bar.wa)));
  const chart = document.getElementById("chart");
  chart.innerHTML = "";
  stats.bars.forEach((bar, index) => {
    const col = document.createElement("div");
    col.className = "col";
    const bars = document.createElement("div");
    bars.className = "bars";
    const view = document.createElement("i");
    view.className = "view";
    view.style.height = bar.views ? `${Math.max(10, Math.round((bar.views / max) * 100))}%` : "0";
    const wa = document.createElement("i");
    wa.className = "wa";
    wa.style.height = bar.wa ? `${Math.max(10, Math.round((bar.wa / max) * 100))}%` : "0";
    bars.append(view, wa);
    const label = document.createElement("em");
    const dense = stats.bars.length > 12;
    label.textContent = !dense || index % 5 === 0 || index === stats.bars.length - 1 ? bar.label : "";
    col.append(bars, label);
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
    const text = event.t === "wa" ? `WhatsApp · ${VIA[event.via] || "clique"}` : "Abriu o site";
    li.innerHTML = `<span>${text}</span><time>${when(event.ts)}</time>`;
    recent.append(li);
  });
}

async function paint() {
  const events = await loadEvents();
  render(BrasaTrack.summarize(events, range));
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

if (sessionStorage.getItem("brasa-admin") === "1") showDesk();
