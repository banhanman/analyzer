let DATA = [];

document.getElementById("file").addEventListener("change", handleFile);

function handleFile(e) {

  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("fileInfo").innerText =
    `Загружен файл: ${file.name}`;

  const reader = new FileReader();

  reader.onload = function(e) {

    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    DATA = XLSX.utils.sheet_to_json(sheet);

    // скрываем загрузку
    document.getElementById("uploadScreen").style.display = "none";

    // показываем приложение
    document.getElementById("app").style.display = "block";

    UI.renderDashboard(DATA);
  };

  reader.readAsArrayBuffer(file);
}