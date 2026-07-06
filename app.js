const bank = window.QUESTION_BANK;
const storageKey = "enterprise-framework-quiz-state-v1";

const state = loadState();
let currentList = [];
let currentIndex = 0;
let reveal = false;

const typeNames = {
  all: "全部题型",
  single: "单项选择题",
  multiple: "多项选择题",
  judge: "判断题",
  blank: "填空题",
  short: "简答题",
  coding: "编程题",
  essay: "大题",
};

const els = {
  tabs: [...document.querySelectorAll(".tab")],
  subjectFilter: document.querySelector("#subjectFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  doneCount: document.querySelector("#doneCount"),
  accuracyRate: document.querySelector("#accuracyRate"),
  wrongCount: document.querySelector("#wrongCount"),
  favCount: document.querySelector("#favCount"),
  positionText: document.querySelector("#positionText"),
  typeText: document.querySelector("#typeText"),
  progressBar: document.querySelector("#progressBar"),
  questionBadge: document.querySelector("#questionBadge"),
  favoriteBtn: document.querySelector("#favoriteBtn"),
  questionText: document.querySelector("#questionText"),
  options: document.querySelector("#options"),
  answerPanel: document.querySelector("#answerPanel"),
  answerText: document.querySelector("#answerText"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  showAnswerBtn: document.querySelector("#showAnswerBtn"),
};

init();

function init() {
  renderSubjectFilter();
  renderTypeFilter();
  bindEvents();
  rebuildList();
}

function defaultState() {
  return {
    mode: "practice",
    subject: bank.subjects?.[0]?.id || "enterprise",
    type: "all",
    order: bank.questions.map((item) => item.id),
    answers: {},
    wrong: [],
    favorite: [],
  };
}

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function renderTypeFilter() {
  const availableTypes = new Set(
    bank.questions
      .filter((item) => item.subject === state.subject)
      .map((item) => item.type),
  );
  els.typeFilter.innerHTML = Object.entries(typeNames)
    .filter(([key]) => key === "all" || availableTypes.has(key))
    .map(([key, name]) => `<option value="${key}">${name}</option>`)
    .join("");
  if (![...els.typeFilter.options].some((option) => option.value === state.type)) {
    state.type = "all";
  }
  els.typeFilter.value = state.type;
}

function renderSubjectFilter() {
  if (els.subjectFilter.tagName === "SELECT") {
    els.subjectFilter.innerHTML = (bank.subjects || [])
      .map((subject) => `<option value="${subject.id}">${subject.name}</option>`)
      .join("");
    els.subjectFilter.value = state.subject;
    return;
  }

  els.subjectFilter.innerHTML = (bank.subjects || [])
    .map((subject) => {
      const active = subject.id === state.subject ? " active" : "";
      return `<button class="subject-btn${active}" data-subject="${subject.id}" type="button">${subject.name}</button>`;
    })
    .join("");
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      currentIndex = 0;
      reveal = state.mode !== "practice";
      rebuildList();
    });
  });

  els.typeFilter.addEventListener("change", () => {
    state.type = els.typeFilter.value;
    currentIndex = 0;
    rebuildList();
  });

  if (els.subjectFilter.tagName === "SELECT") {
    els.subjectFilter.addEventListener("change", () => {
      switchSubject(els.subjectFilter.value);
    });
  } else {
  els.subjectFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-subject]");
    if (!button || button.dataset.subject === state.subject) return;
    switchSubject(button.dataset.subject);
  });
  }

  els.shuffleBtn.addEventListener("click", () => {
    state.order = shuffle([...currentList.map((item) => item.id)]);
    currentIndex = 0;
    reveal = false;
    saveState();
    rebuildList();
  });

  els.resetBtn.addEventListener("click", () => {
    if (!confirm("确定清空作答记录、错题和收藏吗？")) return;
    localStorage.removeItem(storageKey);
    Object.assign(state, defaultState());
    currentIndex = 0;
    reveal = false;
    rebuildList();
  });

  els.favoriteBtn.addEventListener("click", () => {
    const item = current();
    if (!item) return;
    toggleInArray(state.favorite, item.id);
    saveState();
    render();
  });

  els.prevBtn.addEventListener("click", () => move(-1));
  els.nextBtn.addEventListener("click", () => move(1));
  els.showAnswerBtn.addEventListener("click", () => {
    reveal = !reveal;
    render();
  });
}

function switchSubject(subject) {
  state.subject = subject;
  state.type = "all";
  currentIndex = 0;
  reveal = state.mode !== "practice";
  renderSubjectFilter();
  renderTypeFilter();
  saveState();
  rebuildList();
}

function rebuildList() {
  const ordered = state.order
    .map((id) => bank.questions.find((item) => item.id === id))
    .filter(Boolean);
  const missing = bank.questions.filter((item) => !state.order.includes(item.id));
  let list = [...ordered, ...missing];

  list = list.filter((item) => item.subject === state.subject);
  if (state.type !== "all") {
    list = list.filter((item) => item.type === state.type);
  }
  if (state.mode === "wrong") {
    list = list.filter((item) => state.wrong.includes(item.id));
  }
  if (state.mode === "favorite") {
    list = list.filter((item) => state.favorite.includes(item.id));
  }

  currentList = list;
  if (currentIndex >= currentList.length) currentIndex = Math.max(0, currentList.length - 1);
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === state.mode));
  renderTypeFilter();
  reveal = state.mode !== "practice" || reveal;
  render();
}

function current() {
  return currentList[currentIndex];
}

function render() {
  renderStats();
  const item = current();

  if (!item) {
    els.positionText.textContent = "暂无题目";
    els.typeText.textContent = typeNames[state.type];
    els.progressBar.style.width = "0";
    els.questionBadge.textContent = "空";
    els.questionText.textContent = state.mode === "wrong" ? "现在还没有错题。" : "当前筛选下没有题目。";
    els.options.innerHTML = "";
    els.answerPanel.hidden = true;
    return;
  }

  const answered = state.answers[item.id];
  els.positionText.textContent = `第 ${currentIndex + 1} / ${currentList.length} 题`;
  els.typeText.textContent = item.typeName;
  els.progressBar.style.width = `${((currentIndex + 1) / currentList.length) * 100}%`;
  els.questionBadge.textContent = item.typeName.replace("选择题", "选").replace("题", "");
  els.favoriteBtn.textContent = state.favorite.includes(item.id) ? "★" : "☆";
  els.questionText.textContent = item.question;
  els.answerText.textContent = answerWithOptionText(item);
  els.answerPanel.hidden = !reveal;
  els.showAnswerBtn.textContent = reveal ? "收起答案" : "看答案";
  renderOptions(item, answered);
}

function renderOptions(item, answered) {
  els.options.innerHTML = "";
  if (!item.options.length) {
    const remembered = answered?.self === "remembered";
    const forgot = answered?.self === "forgot";
    els.options.innerHTML = `
      <button class="option ${remembered ? "correct" : ""}" data-self="remembered" type="button"><strong>会</strong><span>记住了</span></button>
      <button class="option ${forgot ? "wrong" : ""}" data-self="forgot" type="button"><strong>忘</strong><span>还要再背</span></button>
    `;
    els.options.querySelectorAll(".option").forEach((button) => {
      button.addEventListener("click", () => markSelf(item, button.dataset.self));
    });
    return;
  }

  for (const option of item.options) {
    const selected = answered?.value?.includes(option.key);
    const isCorrect = item.answer.includes(option.key);
    const className = [
      "option",
      selected ? "selected" : "",
      reveal && isCorrect ? "correct" : "",
      reveal && selected && !isCorrect ? "wrong" : "",
    ].join(" ");
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.innerHTML = `<strong>${option.key}</strong><span>${escapeHtml(option.text)}</span>`;
    button.addEventListener("click", () => chooseOption(item, option.key));
    els.options.appendChild(button);
  }
}

function chooseOption(item, key) {
  const previous = state.answers[item.id]?.value || "";
  let value = key;
  if (item.type === "multiple") {
    const set = new Set(previous.split("").filter(Boolean));
    set.has(key) ? set.delete(key) : set.add(key);
    value = [...set].sort().join("");
  }
  const correct = normalizeAnswer(value) === normalizeAnswer(item.answer);
  state.answers[item.id] = { value, correct };
  syncWrong(item.id, correct);
  reveal = item.type !== "multiple" || correct;
  saveState();
  render();
}

function markSelf(item, self) {
  const correct = self === "remembered";
  state.answers[item.id] = { self, correct };
  syncWrong(item.id, correct);
  reveal = true;
  saveState();
  render();
}

function syncWrong(id, correct) {
  const index = state.wrong.indexOf(id);
  if (!correct && index === -1) state.wrong.push(id);
  if (correct && index !== -1) state.wrong.splice(index, 1);
}

function move(step) {
  if (!currentList.length) return;
  currentIndex = (currentIndex + step + currentList.length) % currentList.length;
  reveal = state.mode !== "practice";
  render();
}

function renderStats() {
  const subjectIds = new Set(bank.questions.filter((item) => item.subject === state.subject).map((item) => item.id));
  const answers = Object.entries(state.answers)
    .filter(([id]) => subjectIds.has(id))
    .map(([, answer]) => answer);
  const done = answers.length;
  const correct = answers.filter((item) => item.correct).length;
  els.doneCount.textContent = done;
  els.accuracyRate.textContent = done ? `${Math.round((correct / done) * 100)}%` : "0%";
  els.wrongCount.textContent = state.wrong.filter((id) => subjectIds.has(id)).length;
  els.favCount.textContent = state.favorite.filter((id) => subjectIds.has(id)).length;
}

function answerWithOptionText(item) {
  if (!item.options.length) return item.answer;
  const labels = item.answer
    .split("")
    .map((key) => {
      const option = item.options.find((candidate) => candidate.key === key);
      return option ? `${key}. ${option.text}` : key;
    })
    .join("\n");
  return `${item.answer}\n${labels}`;
}

function normalizeAnswer(value) {
  return String(value).replace(/\s/g, "").split("").sort().join("");
}

function toggleInArray(array, value) {
  const index = array.indexOf(value);
  index === -1 ? array.push(value) : array.splice(index, 1);
}

function shuffle(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}
