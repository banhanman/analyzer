function parseDate(str) {
  if (!str) return null;

  const parts = str.split(" ");
  if (parts.length < 2) return null;

  const [datePart, timePart] = parts;

  const [day, month, year] = datePart.split(".");
  const [hour, minute] = timePart.split(":");

  return new Date(
    2000 + Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d)) return "";

  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function normalizeStatus(status) {
  const s = (status || "").toLowerCase();

  if (s.includes("заверш")) return "done";
  if (s.includes("работ")) return "active";
  if (s.includes("заплан")) return "planned";
  if (s.includes("ожидан")) return "waiting";

  return "unknown";
}

function normalizeTheme(theme) {
  const t = (theme || "").toLowerCase();

  if (t.includes("прием")) return "Прием";
  if (t.includes("диагност")) return "Диагностика";
  if (t.includes("соглас")) return "Согласование";
  if (t.includes("ремонт")) return "Ремонт";
  if (t.includes("готов")) return "Готово";
  if (t.includes("подвез")) return "Подвезут";
  if (t.includes("удален")) return "Удаленная диагностика";
  if (t.includes("предпрод")) return "Предпродажка";
  if (t.includes("сборка")) return "Сборка ПК";
  if (t.includes("zip")) return "ZIP";
  if (t.includes("пк")) return "ПК";

  return theme; // ничего не теряем
}

function statusToText(status, theme) {

  if (status === "done") {
    if (theme === "Готово") return "Выдано";
    if (theme === "Диагностика") return "Продиагностировали";
    if (theme === "Согласование") return "Согласовали";
    if (theme === "Ремонт") return "Отремонтировали";
    if (theme === "Прием") return "Приняли на ремонт";
  }

  if (status === "planned") return "Запланировано";
  if (status === "active") return "В работе";
  if (status === "waiting") return "Ожидание";

  return "Не определено";
}

const Analytics = {

  calculate(data) {

    const result = {
      done: {},
      active: {},
      planned: {},
      waiting: {},
      latestRows: [],
      allRows: [],
      violations: {}
    };

    const rows = data.map(row => {

      const parsedDate = parseDate(row["Начало"]);
      const rawTheme = row["Тема"];
      const theme = normalizeTheme(rawTheme);
      const status = normalizeStatus(row["Состояние"]);

      const obj = {
        number: row["Номер"],
        time: parsedDate,
        date: formatDate(parsedDate),
        theme,
        rawTheme,
        status,
        resultText: statusToText(status, theme),
        responsible: row["Ответственный"] || "Не указан"
      };

      result.allRows.push(obj);

      // 🚨 только реальные нарушения
      const raw = (rawTheme || "").toLowerCase();

      if (
        raw.includes("вопросы/запросы") ||
        raw.includes("коммуникация с клиентом")
      ) {
        if (!result.violations[rawTheme]) {
          result.violations[rawTheme] = [];
        }
        result.violations[rawTheme].push(obj);
      }

      return obj;
    });

    const grouped = {};

    rows.forEach(r => {
      if (!grouped[r.number]) grouped[r.number] = [];
      grouped[r.number].push(r);
    });

    Object.values(grouped).forEach(events => {

      events.sort((a, b) => a.time - b.time);

      const themes = {};

      events.forEach(e => {

        if (!themes[e.theme]) {
          themes[e.theme] = {
            lastDone: null,
            lastAny: null
          };
        }

        themes[e.theme].lastAny = e;

        if (e.status === "done") {
          themes[e.theme].lastDone = e;
        }
      });

      Object.values(themes).forEach(t => {

        const e = t.lastDone || t.lastAny;

        result.latestRows.push(e);

        if (result[e.status]) {
          result[e.status][e.theme] =
            (result[e.status][e.theme] || 0) + 1;
        }

      });

    });

    return result;
  }

};