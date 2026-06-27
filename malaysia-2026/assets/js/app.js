const state = {
  data: null,
  activeView: "all",
  toastTimer: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function text(value) {
  return String(value ?? "");
}

function escapeHtml(value) {
  return text(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function renderStats(data) {
  $("#routeText").textContent = data.meta.route;
  $("#statGrid").innerHTML = data.stats.map((item) => `
    <article class="stat-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.note)}</small>
    </article>
  `).join("");
}

function renderRoute(data) {
  $("#routeStrip").innerHTML = data.baseRoute.map(([date, title, note]) => `
    <article class="route-step">
      <b>${escapeHtml(date)}</b>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(note)}</span>
    </article>
  `).join("");
}

function slot(label, value, kind = "plan") {
  return `
    <div class="slot" data-kind="${kind}">
      <div class="slot-name">${escapeHtml(label)}</div>
      <div class="slot-text">${escapeHtml(value)}</div>
    </div>
  `;
}

function dayPhoto(day, index) {
  const src = day.image || `assets/images/malaysia-day${index + 1}.webp`;
  return `
    <figure class="day-photo" data-kind="photo">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(day.day)} ${escapeHtml(day.title)} 旅行图片" width="900" height="1200" loading="lazy" decoding="async">
    </figure>
  `;
}

function renderDays(data) {
  $("#dayNav").innerHTML = data.days.map((day, index) => `
    <button class="day-chip ${index === 0 ? "is-active" : ""}" type="button" data-target="${escapeHtml(day.id)}">
      ${escapeHtml(day.day)}<br>${escapeHtml(day.date)}
    </button>
  `).join("");

  $("#dayList").innerHTML = data.days.map((day, index) => `
    <article class="day-card" id="${escapeHtml(day.id)}" data-index="${index}">
      <button class="day-button" type="button" aria-expanded="true" aria-controls="${escapeHtml(day.id)}-slots">
        <div class="date-box">${escapeHtml(day.day)}<small>${escapeHtml(day.date)}</small></div>
        <div>
          <h3 class="day-title">${escapeHtml(day.title)}</h3>
          <p class="day-theme">${escapeHtml(day.base)} · ${escapeHtml(day.theme)}</p>
          <div class="day-tags">${day.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
        <span class="chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="slots" id="${escapeHtml(day.id)}-slots">
        ${dayPhoto(day, index)}
        ${slot("上午", day.morning)}
        ${slot("下午", day.afternoon)}
        ${slot("晚上", day.evening)}
        ${slot("耗时", day.time, "time")}
        ${slot("住宿", day.hotel, "stay")}
        ${slot("费用", day.cost, "cost")}
      </div>
    </article>
  `).join("");
}

function renderInfo(data) {
  $("#lodgingList").innerHTML = data.lodging.map((item) => `
    <article class="info-card">
      <h3>${escapeHtml(item.city)}｜${escapeHtml(item.area)}</h3>
      <p>${escapeHtml(item.why)}</p>
      <p>${escapeHtml(item.price)}</p>
    </article>
  `).join("");

  $("#reminderList").innerHTML = data.reminders.map((item, index) => `
    <article class="reminder-item">
      <h3>提醒 ${index + 1}</h3>
      <p>${escapeHtml(item)}</p>
    </article>
  `).join("");

  $("#sourceList").innerHTML = data.sources.map((item) => `
    <article class="source-item">${escapeHtml(item)}</article>
  `).join("");
}

function setActiveDay(id) {
  $$(".day-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.target === id));
  const active = $(`.day-chip[data-target="${id}"]`);
  if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}

function applyView(view) {
  state.activeView = view;
  $$(".view-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === view));
  $$(".slot, .day-photo").forEach((item) => {
    const kind = item.dataset.kind;
    const shouldShow =
      view === "all" ||
      (view === "stay" && kind === "stay") ||
      (view === "cost" && kind === "cost");
    item.hidden = !shouldShow;
  });
}

function toggleCard(card) {
  const nextOpen = card.classList.contains("is-collapsed");
  card.classList.toggle("is-collapsed", !nextOpen);
  $(".day-button", card).setAttribute("aria-expanded", String(nextOpen));
}

function observeDays() {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActiveDay(visible.target.id);
  }, {
    rootMargin: "-42% 0px -46% 0px",
    threshold: [0.12, 0.35, 0.62]
  });
  $$(".day-card").forEach((card) => observer.observe(card));
}

function bindEvents() {
  $("#dayNav").addEventListener("click", (event) => {
    const chip = event.target.closest(".day-chip");
    if (!chip) return;
    setActiveDay(chip.dataset.target);
    $(`#${chip.dataset.target}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  $("#dayList").addEventListener("click", (event) => {
    const button = event.target.closest(".day-button");
    if (!button) return;
    toggleCard(button.closest(".day-card"));
  });

  $$(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => applyView(tab.dataset.view));
  });

  $("#topButton").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    $("#scrollMeter").style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    $("#topButton").classList.toggle("is-visible", window.scrollY > 720);
  }, { passive: true });
}

async function init() {
  try {
    const response = await fetch("assets/data/itinerary.json");
    if (!response.ok) throw new Error("data");
    const data = await response.json();
    state.data = data;
    document.title = data.meta.title;
    renderStats(data);
    renderRoute(data);
    renderDays(data);
    renderInfo(data);
    bindEvents();
    observeDays();
  } catch {
    showToast("行程数据加载失败，请刷新页面。");
  }
}

init();
