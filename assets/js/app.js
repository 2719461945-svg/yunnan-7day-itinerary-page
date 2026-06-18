const state = {
  data: null,
  activeView: "all",
  expanded: true,
  toastTimer: null
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const formatter = new Intl.NumberFormat("zh-CN");

function text(value) {
  return String(value ?? "");
}

function money(value) {
  return `¥${formatter.format(value)}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function setHero(data) {
  $("#routeText").textContent = data.meta.route;
}

function renderStats(data) {
  const totals = data.days.reduce((acc, day) => {
    acc.min += day.costMin;
    acc.max += day.costMax;
    return acc;
  }, { min: 0, max: 0 });

  const stats = data.stats.map((item) => ({ ...item }));
  const budget = stats.find((item) => item.label === "预算");
  if (budget) {
    budget.value = `${money(totals.min)}-${money(totals.max)}`;
    budget.note = "人均粗估，不含购物";
  }

  $("#statGrid").innerHTML = stats.map((item) => `
    <article class="stat-card">
      <span>${text(item.label)}</span>
      <strong>${text(item.value)}</strong>
      <small>${text(item.note)}</small>
    </article>
  `).join("");
}

function renderRoute(data) {
  $("#routeStrip").innerHTML = data.baseRoute.map(([date, title, note]) => `
    <article class="route-step">
      <b>${text(date)}</b>
      <strong>${text(title)}</strong>
      <span>${text(note)}</span>
    </article>
  `).join("");
}

function slot(label, value, kind = "plan") {
  return `
    <div class="slot" data-kind="${kind}">
      <div class="slot-name">${label}</div>
      <div class="slot-text">${text(value)}</div>
    </div>
  `;
}

function dayPhoto(day, index) {
  const src = day.image || `assets/images/yunnan-day${index + 1}.png`;
  return `
    <figure class="day-photo" data-kind="photo">
      <img src="${text(src)}" alt="${text(day.day)} ${text(day.title)} 旅行图片" loading="lazy" decoding="async">
    </figure>
  `;
}

function renderDays(data) {
  $("#dayNav").innerHTML = data.days.map((day, index) => `
    <button class="day-chip ${index === 0 ? "is-active" : ""}" type="button" data-target="${day.id}">
      ${day.day}<br>${day.date}
    </button>
  `).join("");

  $("#dayList").innerHTML = data.days.map((day, index) => `
    <article class="day-card" id="${day.id}" data-index="${index}" data-tags="${day.tags.join(",")}">
      <button class="day-button" type="button" aria-expanded="true" aria-controls="${day.id}-slots">
        <div class="date-box">${day.day}<small>${day.date}</small></div>
        <div>
          <h3 class="day-title">${text(day.title)}</h3>
          <p class="day-theme">${text(day.base)} · ${text(day.theme)}</p>
          <div class="day-tags">${day.tags.map((tag) => `<span>${text(tag)}</span>`).join("")}</div>
        </div>
        <span class="chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="slots" id="${day.id}-slots">
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

function setActiveDay(id) {
  $$(".day-chip").forEach((chip) => chip.classList.toggle("is-active", chip.dataset.target === id));
  const active = $(`.day-chip[data-target="${id}"]`);
  if (active) {
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }
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

  const currentDay = $(".day-chip.is-active")?.dataset.target || "day-1";
  $(`#${currentDay}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function toggleCard(card, forceOpen) {
  const nextOpen = forceOpen ?? card.classList.contains("is-collapsed");
  card.classList.toggle("is-collapsed", !nextOpen);
  $(".day-button", card).setAttribute("aria-expanded", String(nextOpen));
}

function bindEvents() {
  $("#dayNav").addEventListener("click", (event) => {
    const chip = event.target.closest(".day-chip");
    if (!chip) return;
    setActiveDay(chip.dataset.target);
    $(`#${chip.dataset.target}`).scrollIntoView({ block: "start", behavior: "smooth" });
  });

  $("#dayList").addEventListener("click", (event) => {
    const button = event.target.closest(".day-button");
    if (!button) return;
    toggleCard(button.closest(".day-card"));
  });

  $$(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => applyView(tab.dataset.view));
  });

  $('[data-action="expand"]').addEventListener("click", (event) => {
    state.expanded = !state.expanded;
    $$(".day-card").forEach((card) => toggleCard(card, state.expanded));
    event.currentTarget.textContent = state.expanded ? "收起全部" : "展开全部";
  });

  const copyButton = $('[data-action="copy"]');
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        showToast("链接已复制，可以发到手机打开。");
      } catch {
        showToast("复制失败，可以直接复制浏览器地址栏。");
      }
    });
  }

  const shareButton = $('[data-action="share"]');
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const shareData = {
        title: document.title,
        text: state.data?.meta.summary || "云南7天深度旅行方案",
        url: location.href
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch {
          showToast("已取消分享。");
        }
      } else {
        await navigator.clipboard.writeText(location.href);
        showToast("浏览器不支持直接分享，已复制链接。");
      }
    });
  }

  $("#topButton").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", updateScrollEffects, { passive: true });
}

function updateScrollEffects() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  $("#scrollMeter").style.width = `${progress * 100}%`;
  $("#topButton").classList.toggle("is-visible", window.scrollY > 620);
}

function render(data) {
  state.data = data;
  setHero(data);
  renderStats(data);
  renderRoute(data);
  renderDays(data);
  bindEvents();
  observeDays();
  $('[data-action="expand"]').textContent = "收起全部";
  updateScrollEffects();
}

async function init() {
  try {
    const response = await fetch("assets/data/itinerary.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load itinerary: ${response.status}`);
    const data = await response.json();
    render(data);
  } catch (error) {
    console.error(error);
    $("main").innerHTML = `
      <div class="load-state">
        行程数据加载失败。请确认当前页面通过 GitHub Pages 或本地静态服务打开。
      </div>
    `;
  }
}

init();
