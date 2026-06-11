const state = {
  posts: [],
  filteredPosts: [],
  rendered: 0,
  activeView: "timeline",
  datePrecision: "year",
  isRestoringTimeline: false,
};

const pageSize = 24;
const timelinePositionKey = "erguai.timelinePosition";
const timeline = document.querySelector("#timeline");
const loadMoreButton = document.querySelector("#load-more");
const searchInput = document.querySelector("#search-input");
const dateInput = document.querySelector("#date-input");
const clearDateButton = document.querySelector("#clear-date");
const postCount = document.querySelector("#post-count");
const viewTitle = document.querySelector("#view-title");
const surpriseCard = document.querySelector("#surprise-card");
const surpriseButton = document.querySelector("#surprise-button");
const tabs = Array.from(document.querySelectorAll(".tab"));
const precisionOptions = Array.from(document.querySelectorAll(".precision-option"));

init();

async function init() {
  try {
    const response = await fetch("./weibos.txt");
    const source = await response.text();
    state.posts = parsePosts(source);
    state.filteredPosts = state.posts;
    updateCount();
    renderMore();
    showSurprise();
    bindEvents();
    restoreTimelinePosition();
    registerServiceWorker();
  } catch (error) {
    timeline.innerHTML = `<p class="empty">没有读到微博存档。</p>`;
    postCount.textContent = "读取失败";
  }
}

function bindEvents() {
  loadMoreButton.addEventListener("click", renderMore);
  surpriseButton.addEventListener("click", showSurprise);
  searchInput.addEventListener("input", applySearch);
  dateInput.addEventListener("input", applySearch);
  clearDateButton.addEventListener("click", () => {
    dateInput.value = "";
    applySearch();
  });
  precisionOptions.forEach((option) => {
    option.addEventListener("click", () => {
      state.datePrecision = option.dataset.precision;
      precisionOptions.forEach((item) => item.classList.toggle("is-active", item === option));
      applySearch();
    });
  });
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });
  window.addEventListener("scroll", saveTimelinePosition, { passive: true });
  window.addEventListener("pagehide", saveTimelinePosition);
}

function parsePosts(source) {
  return source
    .split("=========================")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split(/\r?\n/);
      const dateLine = lines.shift() || "";
      const dateText = dateLine.replace("发布时间:", "").trim();
      return {
        dateText,
        date: new Date(dateText.replace(" ", "T")),
        content: lines.join("\n").trim(),
      };
    })
    .filter((post) => post.dateText && post.content)
    .sort((a, b) => b.date - a.date);
}

function applySearch() {
  const keyword = searchInput.value.trim().toLowerCase();
  const selectedDate = dateInput.value;
  const hasFilter = Boolean(keyword || selectedDate);

  state.filteredPosts = state.posts.filter((post) => {
    const matchesKeyword =
      !keyword || `${post.dateText}\n${post.content}`.toLowerCase().includes(keyword);
    const matchesDate = !selectedDate || matchesDateFilter(post, selectedDate);
    return matchesKeyword && matchesDate;
  });

  state.rendered = 0;
  timeline.innerHTML = "";
  updateCount();
  renderMore();
  if (!state.isRestoringTimeline) {
    window.scrollTo({ top: 0 });
  }
}

function renderMore() {
  const slice = state.filteredPosts.slice(state.rendered, state.rendered + pageSize);
  const fragment = document.createDocumentFragment();
  let activeMonth = getLastRenderedMonth();

  slice.forEach((post) => {
    const month = formatMonth(post.date);
    if (month !== activeMonth) {
      const group = document.createElement("section");
      group.className = "month-group";
      group.dataset.month = month;
      group.innerHTML = `<h2 class="month-title">${escapeHtml(month)}</h2>`;
      fragment.append(group);
      activeMonth = month;
    }

    const container = fragment.lastElementChild || timeline.lastElementChild;
    container.append(createPostElement(post));
  });

  timeline.append(fragment);
  state.rendered += slice.length;
  loadMoreButton.hidden = state.rendered >= state.filteredPosts.length;

  if (!state.filteredPosts.length) {
    timeline.innerHTML = `<p class="empty">没有找到相关微博。</p>`;
  }
}

function createPostElement(post) {
  const article = document.createElement("article");
  article.className = "post";
  article.innerHTML = `
    <time datetime="${escapeHtml(post.dateText)}">${escapeHtml(post.dateText)}</time>
    <p class="post-text">${linkify(escapeHtml(post.content))}</p>
  `;
  return article;
}

function getLastRenderedMonth() {
  const lastGroup = timeline.lastElementChild;
  return lastGroup ? lastGroup.dataset.month : "";
}

function showSurprise() {
  if (!state.posts.length) return;
  const post = state.posts[Math.floor(Math.random() * state.posts.length)];
  surpriseCard.innerHTML = `
    <time class="surprise-date" datetime="${escapeHtml(post.dateText)}">${escapeHtml(post.dateText)}</time>
    <p class="post-text">${linkify(escapeHtml(post.content))}</p>
  `;
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `${view}-view`);
  });
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === view));
  viewTitle.textContent = view === "timeline" ? "Timeline" : "Surprise me";
  searchInput.closest(".toolbar").hidden = view !== "timeline";
}

function updateCount() {
  const total = state.posts.length;
  const current = state.filteredPosts.length;
  postCount.textContent = current === total ? `${total} 条` : `${current} / ${total} 条`;
}

function formatMonth(date) {
  if (Number.isNaN(date.getTime())) return "未知时间";
  return `${date.getFullYear()} 年 ${String(date.getMonth() + 1).padStart(2, "0")} 月`;
}

function matchesDateFilter(post, selectedDate) {
  const postDate = post.dateText.slice(0, 10);
  const lengthByPrecision = {
    year: 4,
    month: 7,
    day: 10,
  };
  const length = lengthByPrecision[state.datePrecision];
  return postDate.slice(0, length) === selectedDate.slice(0, length);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char];
  });
}

function linkify(text) {
  return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js");
  }
}

function saveTimelinePosition() {
  const hasFilter = Boolean(searchInput.value.trim() || dateInput.value);
  if (state.activeView !== "timeline" || state.isRestoringTimeline || hasFilter) return;

  try {
    localStorage.setItem(
      timelinePositionKey,
      JSON.stringify({
        scrollY: Math.max(0, Math.round(window.scrollY)),
        rendered: state.rendered,
      })
    );
  } catch (error) {
    return;
  }
}

function restoreTimelinePosition() {
  const saved = readSavedTimelinePosition();
  if (!saved || saved.scrollY <= 0) return;

  state.isRestoringTimeline = true;
  while (state.rendered < saved.rendered && state.rendered < state.filteredPosts.length) {
    renderMore();
  }

  requestAnimationFrame(() => {
    window.scrollTo({ top: saved.scrollY });
    state.isRestoringTimeline = false;
  });
}

function readSavedTimelinePosition() {
  try {
    return JSON.parse(localStorage.getItem(timelinePositionKey));
  } catch (error) {
    return null;
  }
}
