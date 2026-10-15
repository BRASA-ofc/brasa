const BrasaTrack = (() => {
  const KEY = "brasa-events";
  const VID = "brasa-vid";
  const DAY = 86400000;
  const SPANS = {
    day: DAY,
    week: 7 * DAY,
    month: 30 * DAY,
    quarter: 91 * DAY,
    half: 182 * DAY,
    year: 365 * DAY
  };

  function visitorId() {
    try {
      let id = localStorage.getItem(VID);
      if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(VID, id);
      }
      return id;
    } catch {
      return "local";
    }
  }

  function readLocal() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveLocal(event) {
    try {
      const cut = Date.now() - 370 * DAY;
      const trimmed = readLocal().concat(event).filter((item) => item && item.ts >= cut).slice(-4000);
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* quota cheia */
    }
  }

  function track(type, via) {
    const event = {
      t: type === "wa" ? "wa" : "view",
      ts: Date.now(),
      id: visitorId(),
      via: via || ""
    };
    saveLocal(event);
    const payload = JSON.stringify(event);
    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon("/api/hit", new Blob([payload], { type: "application/json" }));
        if (sent) return;
      }
    } catch {
      /* segue para o fetch */
    }
    fetch("/api/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  function buckets(events, key) {
    const now = new Date();
    const slots = [];
    if (key === "day") {
      for (let i = 23; i >= 0; i -= 1) {
        const start = new Date(now);
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() - i);
        slots.push({ label: `${String(start.getHours()).padStart(2, "0")}h`, from: start.getTime(), to: start.getTime() + 3600000 });
      }
    } else if (key === "year" || key === "half") {
      const months = key === "year" ? 12 : 6;
      for (let i = months - 1; i >= 0; i -= 1) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const label = start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        slots.push({ label, from: start.getTime(), to: end.getTime() });
      }
    } else if (key === "quarter") {
      for (let i = 12; i >= 0; i -= 1) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i * 7);
        slots.push({
          label: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          from: start.getTime(),
          to: start.getTime() + 7 * DAY
        });
      }
    } else {
      const days = key === "week" ? 7 : 30;
      for (let i = days - 1; i >= 0; i -= 1) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i);
        slots.push({
          label: start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          from: start.getTime(),
          to: start.getTime() + DAY
        });
      }
    }
    return slots.map((slot) => {
      const slice = events.filter((event) => event.ts >= slot.from && event.ts < slot.to);
      return {
        label: slot.label,
        views: slice.filter((event) => event.t === "view").length,
        wa: slice.filter((event) => event.t === "wa").length
      };
    });
  }

  function summarize(events, key) {
    const from = Date.now() - (SPANS[key] || SPANS.month);
    const rows = events.filter((event) => event && event.ts >= from);
    const views = rows.filter((event) => event.t === "view");
    const was = rows.filter((event) => event.t === "wa");
    const people = new Set(views.map((event) => event.id)).size;
    const peopleWa = new Set(was.map((event) => event.id)).size;
    const via = { botao: 0, contato: 0, pedro: 0 };
    was.forEach((event) => {
      if (Object.prototype.hasOwnProperty.call(via, event.via)) via[event.via] += 1;
    });
    return {
      views: views.length,
      people,
      wa: was.length,
      peopleWa,
      rate: people ? Math.round((peopleWa / people) * 100) : 0,
      via,
      lastView: views.reduce((max, event) => Math.max(max, event.ts), 0),
      lastWa: was.reduce((max, event) => Math.max(max, event.ts), 0),
      recent: rows.slice().sort((a, b) => b.ts - a.ts).slice(0, 8),
      bars: buckets(rows, key)
    };
  }

  return { track, readLocal, summarize };
})();
