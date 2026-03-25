const STAGE_ORDER = [
  "Подвезут",
  "Прием",
  "Диагностика",
  "Согласование",
  "Ремонт",
  "Готово",
  "Удаленная диагностика",
  "Предпродажка",
  "Сборка ПК",
  "ZIP",
  "ПК"
];

const STAGE_ICONS = {
  "Подвезут": "🚚",
  "Прием": "📥",
  "Диагностика": "🧰",
  "Согласование": "📱",
  "Ремонт": "🔧",
  "Готово": "📦",
  "Удаленная диагностика": "🌐",
  "Предпродажка": "💻",
  "Сборка ПК": "🖥️",
  "ZIP": "📦",
  "ПК": "🧩"
};

const UI = {

  activeFilters: [],
  selectedUser: "",

  renderDashboard(data) {

    const stats = Analytics.calculate(data);

    this.allRows = stats.allRows;
    this.latestRows = stats.latestRows;
    this.violations = stats.violations;

    let html = "";

    html += `<h1 class="center">🛠️ AБ Сервис</h1>`;

    // ===== KPI =====
    html += `<h2>📊 Этапы</h2><div class="grid top">`;

    STAGE_ORDER.forEach(theme => {

      const planned = stats.planned[theme] || 0;
      const active = stats.active[theme] || 0;
      const waiting = stats.waiting[theme] || 0;
      const done = stats.done[theme] || 0;

      const total = planned + active + waiting + done;
      if (total === 0) return;

      html += `
        <div class="card big clickable"
             onclick="UI.filterByTheme('${theme}')">

          <div class="title">
            ${STAGE_ICONS[theme] || "📊"} ${theme}
          </div>

          <div class="value">${total}</div>

          <div class="kpi-details vertical">
            <div>📅 ${planned} <span>запланировано</span></div>
            <div>⚙️ ${active} <span>в работе</span></div>
            <div>⏳ ${waiting} <span>ожидание</span></div>
            <div class="done">✅ ${done} <span>завершено</span></div>
          </div>

        </div>
      `;
    });

    html += `</div>`;

    // ===== УЗКИЕ МЕСТА =====
    html += `<h2>🚨 Узкие места</h2><div class="grid top">`;

    STAGE_ORDER.forEach(theme => {

      const problem =
        (stats.waiting[theme] || 0) +
        (stats.active[theme] || 0) +
        (stats.planned[theme] || 0);

      if (problem === 0) return;

      html += `
        <div class="card violation clickable"
             onclick="UI.filterByTheme('${theme}')">

          <div class="title">${theme}</div>
          <div class="value">${problem}</div>
          <div class="row">⏳ зависшие заявки</div>

        </div>
      `;
    });

    html += `</div>`;

    // ===== НАРУШЕНИЯ =====
    if (Object.keys(this.violations).length > 0) {

      html += `<h2>🚨 Нарушения</h2><div class="grid top">`;

      Object.entries(this.violations).forEach(([name, items]) => {

        html += `
          <div class="card violation clickable"
               onclick="UI.filterByViolation('${name}')">

            <div class="title">${name}</div>
            <div class="value">${items.length}</div>
            <div class="row">❌ запрещенная тема</div>

          </div>
        `;
      });

      html += `</div>`;
    }

    // ===== ФИЛЬТРЫ (ЧЕКБОКСЫ) =====
    html += `
      <h2>📋 Результаты</h2>

      <div class="filters-line">
        <select id="userFilter" onchange="UI.filterByUser()">
          <option value="">Все сотрудники</option>
        </select>

        <button onclick="UI.resetFilters()">Сброс</button>
      </div>

      <div id="filterCheckboxes" class="filter-bar"></div>

      <div class="card table-wrapper">
        <table class="table" id="resultsTable"></table>
      </div>
    `;

    // ===== ГРАФИК =====
    html += `
      <h2>👥 Нагрузка по сотрудникам</h2>
      <div class="card">
        <canvas id="userChart"></canvas>
      </div>
    `;

    document.getElementById("dashboard").innerHTML = html;

    this.initFilters(this.latestRows);
    this.initUserFilter(this.latestRows);
    this.renderUserChart(this.latestRows);
  },

  // ===== НАРУШЕНИЯ =====
  filterByViolation(name) {
    const filtered = this.violations[name];
    this.renderTable(filtered);
  },

  // ===== ЧЕКБОКСЫ =====
  initFilters(rows) {

    const results = [...new Set(rows.map(r => r.resultText))];

    this.activeFilters = [...results];

    const container = document.getElementById("filterCheckboxes");

    container.innerHTML = results.map(r => `
      <label class="checkbox-item">
        <input type="checkbox" checked
               onchange="UI.toggleFilter('${r}')">
        <span>${r}</span>
      </label>
    `).join("");

    this.renderTable(rows);
  },

  toggleFilter(filter) {

    if (this.activeFilters.includes(filter)) {
      this.activeFilters = this.activeFilters.filter(f => f !== filter);
    } else {
      this.activeFilters.push(filter);
    }

    this.applyFilters();
  },

  // ===== ФИЛЬТРЫ =====
  initUserFilter(rows) {
    const users = [...new Set(rows.map(r => r.responsible))];
    const select = document.getElementById("userFilter");

    select.innerHTML += users.map(u =>
      `<option value="${u}">${u}</option>`
    ).join("");
  },

  filterByTheme(theme) {
    const filtered = this.latestRows.filter(r => r.theme === theme);
    this.renderTable(filtered);
  },

  filterByUser() {

    const user = document.getElementById("userFilter").value;

    let filtered = this.latestRows;

    if (user) {
      filtered = filtered.filter(r => r.responsible === user);
    }

    this.renderTable(filtered);
  },

  resetFilters() {
    this.initFilters(this.latestRows);
    document.getElementById("userFilter").value = "";
  },

  applyFilters() {

    let filtered = this.latestRows.filter(r =>
      this.activeFilters.includes(r.resultText)
    );

    const user = document.getElementById("userFilter").value;

    if (user) {
      filtered = filtered.filter(r => r.responsible === user);
    }

    this.renderTable(filtered);
  },

  // ===== ТАБЛИЦА =====
  renderTable(rows) {

    const table = document.getElementById("resultsTable");

    table.innerHTML = `
      <tr>
        <th>Номер</th>
        <th>Дата</th>
        <th>Тема</th>
        <th>Результат</th>
        <th>Ответственный</th>
      </tr>
    ` + rows.map(r => `
      <tr>
        <td>${r.number}</td>
        <td>${r.date}</td>
        <td>${r.rawTheme || r.theme}</td>
        <td>${r.resultText}</td>
        <td>${r.responsible}</td>
      </tr>
    `).join("");
  },

  // ===== ГРАФИК =====
  renderUserChart(rows) {

    const users = {};
    const themes = new Set();

    rows.forEach(r => {

      const user = r.responsible || "Не указан";
      const theme = r.theme;

      themes.add(theme);

      if (!users[user]) users[user] = {};
      if (!users[user][theme]) users[user][theme] = 0;

      users[user][theme]++;
    });

    const themeList = Array.from(themes);

    const datasets = themeList.map(theme => ({
      label: theme,
      data: Object.keys(users).map(user => users[user][theme] || 0)
    }));

    new Chart(document.getElementById("userChart"), {
      type: "bar",
      data: {
        labels: Object.keys(users),
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#fff" } }
        },
        scales: {
          x: { stacked: true, ticks: { color: "#fff" } },
          y: { stacked: true, ticks: { color: "#fff" } }
        }
      }
    });
  }

};