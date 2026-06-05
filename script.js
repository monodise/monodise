document.addEventListener("DOMContentLoaded", () => {

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(reg => console.log("SW зарегистрирован:", reg.scope))
      .catch(err => console.error("Ошибка SW:", err));
  }

  const navButtons = document.querySelectorAll(".bottom-nav button");
  const screens    = document.querySelectorAll(".screen");
  const pageTitle  = document.getElementById("page-title");

  const titles = {
    home: "Главная",
    tasks: "Задачи",
    notes: "Заметки",
    grades: "Оценки",
    schedule: "Расписание"
  };

  function showScreen(id) {
    screens.forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    navButtons.forEach(b => b.classList.remove("active"));
    document.querySelector(`.bottom-nav button[data-screen="${id}"]`).classList.add("active");
    pageTitle.textContent = titles[id];
    if (id === "home") updateHomeStats();
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  const themeBtn = document.getElementById("theme-btn");

  function applyTheme(dark) {
    document.body.classList.toggle("dark", dark);
    themeBtn.textContent = dark ? "☀️" : "🌙";
  }

  applyTheme(localStorage.getItem("theme") === "dark");

  themeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeBtn.textContent = isDark ? "☀️" : "🌙";
  });

  const welcomeTitle = document.getElementById("welcome-title");
  const welcomeDate  = document.getElementById("welcome-date");

  function updateHomeGreeting() {
    const h = new Date().getHours();
    let g = h < 6 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
    welcomeTitle.textContent = g + ", студент! 👋";

    const now = new Date();
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    welcomeDate.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  function updateHomeStats() {
    const tasks  = safeLoad("tasks", []);
    const notes  = safeLoad("notes", []);
    const grades = safeLoad("grades", []);
    document.getElementById("stat-active-tasks").textContent = tasks.filter(t => !t.done).length;
    document.getElementById("stat-done-tasks").textContent   = tasks.filter(t => t.done).length;
    document.getElementById("stat-notes").textContent  = notes.length;
    document.getElementById("stat-grades").textContent = grades.length;
  }

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (confirm("Удалить ВСЕ данные приложения? Это нельзя отменить.")) {
      localStorage.clear();
      location.reload();
    }
  });

  updateHomeGreeting();
  updateHomeStats();

  function safeLoad(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  }
  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  const taskForm  = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const taskList  = document.getElementById("task-list");
  const taskStats = document.getElementById("task-stats");

  let tasks = safeLoad("tasks", []).map(t =>
    typeof t === "string" ? { id: Date.now() + Math.random(), title: t, done: false } : t
  );
  save("tasks", tasks);

  let currentFilter = "all";

  function getFilteredTasks() {
    if (currentFilter === "active") return tasks.filter(t => !t.done);
    if (currentFilter === "done")   return tasks.filter(t => t.done);
    return tasks;
  }

  function renderTasks() {
    const total = tasks.length;
    const done  = tasks.filter(t => t.done).length;
    taskStats.textContent = total
      ? `Всего: ${total} | Выполнено: ${done} | Осталось: ${total - done}`
      : "";

    const filtered = getFilteredTasks();
    if (!filtered.length) {
      taskList.innerHTML = `<div class="empty-state"><span class="empty-state-icon">✅</span>Нет задач в этой категории</div>`;
      return;
    }
    taskList.innerHTML = filtered.map(t => `
      <div class="task-item">
        <input type="checkbox" class="task-check" data-id="${t.id}" ${t.done ? "checked" : ""}>
        <span class="task-text ${t.done ? "done" : ""}">${escHtml(t.title)}</span>
        <button class="task-delete" data-id="${t.id}">×</button>
      </div>
    `).join("");
  }

  taskForm.addEventListener("submit", e => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    tasks.push({ id: Date.now(), title: text, done: false });
    save("tasks", tasks);
    taskInput.value = "";
    renderTasks();
  });

  taskList.addEventListener("click", e => {
    if (e.target.classList.contains("task-check")) {
      const id = Number(e.target.dataset.id);
      const t = tasks.find(x => x.id === id);
      if (t) { t.done = e.target.checked; save("tasks", tasks); renderTasks(); }
    }
    if (e.target.classList.contains("task-delete")) {
      const id = Number(e.target.dataset.id);
      if (confirm("Удалить эту задачу?")) {
        tasks = tasks.filter(x => x.id !== id);
        save("tasks", tasks);
        renderTasks();
      }
    }
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  renderTasks();

  const noteForm    = document.getElementById("note-form");
  const noteTitleEl = document.getElementById("note-title");
  const noteContent = document.getElementById("note-content");
  const noteList    = document.getElementById("note-list");

  let notes = safeLoad("notes", []);

  function fmtDate(ts) {
    return new Date(ts).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function renderNotes() {
    if (!notes.length) {
      noteList.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📝</span>Нет заметок</div>`;
      return;
    }
    const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);
    noteList.innerHTML = sorted.map(n => `
      <div class="note-card">
        <div class="note-header">
          <div class="note-title">${escHtml(n.title)}</div>
          <button class="note-delete" data-id="${n.id}">×</button>
        </div>
        <div class="note-body">${escHtml(n.content)}</div>
        <div class="note-date">🕐 ${fmtDate(n.createdAt)}</div>
      </div>
    `).join("");
  }

  noteForm.addEventListener("submit", e => {
    e.preventDefault();
    const title   = noteTitleEl.value.trim();
    const content = noteContent.value.trim();
    if (!title || !content) return;
    notes.push({ id: Date.now(), title, content, createdAt: Date.now() });
    save("notes", notes);
    noteForm.reset();
    renderNotes();
  });

  noteList.addEventListener("click", e => {
    if (e.target.classList.contains("note-delete")) {
      const id = Number(e.target.dataset.id);
      if (confirm("Удалить заметку?")) {
        notes = notes.filter(n => n.id !== id);
        save("notes", notes);
        renderNotes();
      }
    }
  });

  renderNotes();

  const gradeForm    = document.getElementById("grade-form");
  const gradeSubject = document.getElementById("grade-subject");
  const gradeValue   = document.getElementById("grade-value");
  const gradeList    = document.getElementById("grade-list");
  const gradeSummary = document.getElementById("grade-summary");

  let grades = safeLoad("grades", []);

  function renderGrades() {
    if (!grades.length) {
      gradeSummary.innerHTML = "";
      gradeList.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📊</span>Нет оценок</div>`;
      return;
    }

    // Group by subject
    const grouped = {};
    grades.forEach(g => {
      if (!grouped[g.subject]) grouped[g.subject] = [];
      grouped[g.subject].push(g.value);
    });

    let totalSum = 0, totalCount = 0;
    const avgs = {};
    for (const subj in grouped) {
      const sum = grouped[subj].reduce((a, b) => a + b, 0);
      avgs[subj] = (sum / grouped[subj].length).toFixed(2);
      totalSum   += sum;
      totalCount += grouped[subj].length;
    }
    const overall = totalCount ? (totalSum / totalCount).toFixed(2) : "0";

    gradeSummary.innerHTML = `
      <div class="grade-overall">
        <div class="grade-overall-label">Общий средний балл</div>
        <div class="grade-overall-num">${overall}</div>
      </div>`;

    gradeList.innerHTML = Object.keys(grouped).map(subj => `
      <div class="grade-subject-card">
        <div>
          <div class="grade-subject-name">${escHtml(subj)}</div>
          <div class="grade-scores">Оценки: ${grouped[subj].join(", ")}</div>
        </div>
        <div class="grade-avg">${avgs[subj]}</div>
      </div>
    `).join("");
  }

  gradeForm.addEventListener("submit", e => {
    e.preventDefault();
    const subject = gradeSubject.value.trim();
    const value   = Number(gradeValue.value);
    if (!subject || !value) return;
    grades.push({ id: Date.now(), subject, value });
    save("grades", grades);
    gradeForm.reset();
    renderGrades();
  });

  renderGrades();

  const dayTabsEl    = document.getElementById("day-tabs");
  const lessonForm   = document.getElementById("lesson-form");
  const lessonTime   = document.getElementById("lesson-time");
  const lessonSubj   = document.getElementById("lesson-subject");
  const lessonRoom   = document.getElementById("lesson-room");
  const lessonList   = document.getElementById("lesson-list");

  const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const todayIdx  = (new Date().getDay() + 6) % 7;
  let selectedDay = Math.min(todayIdx, 5);

  let schedule = safeLoad("schedule", {});

  function renderDayTabs() {
    dayTabsEl.innerHTML = DAYS.map((d, i) => {
      const cls = ["day-tab",
        i === selectedDay ? "active" : "",
        i === todayIdx    ? "today"  : ""
      ].filter(Boolean).join(" ");
      return `<button class="${cls}" data-day="${i}">${d}</button>`;
    }).join("");
  }

  function renderLessons() {
    const dayKey  = DAYS[selectedDay];
    const lessons = schedule[dayKey] || [];
    if (!lessons.length) {
      lessonList.innerHTML = `<div class="empty-state"><span class="empty-state-icon">📅</span>Пар нет — выходной!</div>`;
      return;
    }
    const sorted = [...lessons].sort((a, b) => a.time.localeCompare(b.time));
    lessonList.innerHTML = sorted.map(l => `
      <div class="lesson-card">
        <div class="lesson-time">${l.time}</div>
        <div class="lesson-info">
          <div class="lesson-subject">${escHtml(l.subject)}</div>
          ${l.room ? `<div class="lesson-room">Ауд. ${escHtml(l.room)}</div>` : ""}
        </div>
        <button class="lesson-delete" data-id="${l.id}">×</button>
      </div>
    `).join("");
  }

  dayTabsEl.addEventListener("click", e => {
    const btn = e.target.closest(".day-tab");
    if (btn) {
      selectedDay = Number(btn.dataset.day);
      renderDayTabs();
      renderLessons();
    }
  });

  lessonList.addEventListener("click", e => {
    if (e.target.classList.contains("lesson-delete")) {
      const id     = Number(e.target.dataset.id);
      const dayKey = DAYS[selectedDay];
      schedule[dayKey] = (schedule[dayKey] || []).filter(l => l.id !== id);
      save("schedule", schedule);
      renderLessons();
    }
  });

  lessonForm.addEventListener("submit", e => {
    e.preventDefault();
    const time    = lessonTime.value;
    const subject = lessonSubj.value.trim();
    const room    = lessonRoom.value.trim();
    if (!time || !subject) return;
    const dayKey = DAYS[selectedDay];
    if (!schedule[dayKey]) schedule[dayKey] = [];
    schedule[dayKey].push({ id: Date.now(), time, subject, room });
    save("schedule", schedule);
    lessonForm.reset();
    renderLessons();
  });

  renderDayTabs();
  renderLessons();

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  showScreen("home");
  console.log("✅ Студенческий помощник АВПК загружен!");
});
