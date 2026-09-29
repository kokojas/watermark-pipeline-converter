const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const fileStrip = document.querySelector("#fileStrip");
const runButton = document.querySelector("#runButton");
const resetButton = document.querySelector("#resetButton");
const controls = document.querySelector(".controls");
const resultPanel = document.querySelector("#resultPanel");
const resultTitle = document.querySelector("#resultTitle");
const resultMeta = document.querySelector("#resultMeta");
const warningText = document.querySelector("#warningText");
const resultFiles = document.querySelector("#resultFiles");
const downloadLink = document.querySelector("#downloadLink");
const toast = document.querySelector("#toast");
const positionGrid = document.querySelector("#positionGrid");
const watermarkTextInput = document.querySelector("#watermarkText");
const watermarkTextHistory = document.querySelector("#watermarkTextHistory");
const qualityLabels = [...document.querySelectorAll(".quality")];
const modeButtons = [...document.querySelectorAll(".mode[data-mode]")];
const textControls = document.querySelector("#textControls");
const imageControls = document.querySelector("#imageControls");
const watermarkImageInput = document.querySelector("#watermarkImageInput");
const watermarkImagePreview = document.querySelector("#watermarkImagePreview");
const toggles = {
  bold: document.querySelector("#boldToggle"),
  italic: document.querySelector("#italicToggle"),
  underline: document.querySelector("#underlineToggle"),
};

let selectedFiles = [];
let selectedPosition = "center";
let watermarkMode = "text";
let watermarkImageFile = null;

const SETTINGS_STORAGE_KEY = "watermarkPipeline.settings.v2";
const TEXT_HISTORY_STORAGE_KEY = "watermarkPipeline.watermarkTextHistory.v1";
const MAX_TEXT_HISTORY = 12;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function setSteps(activeIndex = -1, doneAll = false) {
  document.querySelectorAll(".step").forEach((step, index) => {
    step.classList.toggle("active", index === activeIndex);
    step.classList.toggle("done", doneAll || index < activeIndex);
  });
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function fileKind(file) {
  const ext = file.name.split(".").pop().toUpperCase();
  return ext || "DOC";
}

function renderSelectedFiles() {
  fileStrip.innerHTML = "";
  if (!selectedFiles.length) {
    fileStrip.innerHTML = `
      <div class="empty-preview">
        <img src="/static/icon.svg" alt="" />
        <span>Файл ще не вибрано</span>
      </div>
    `;
    return;
  }

  selectedFiles.forEach((file, index) => {
    const card = document.createElement("div");
    card.className = "file-card";
    card.innerHTML = `
      <button class="remove-file" type="button" data-index="${index}" aria-label="Прибрати файл">×</button>
      <div class="file-icon">${fileKind(file)}</div>
      <strong>${escapeHtml(file.name)}</strong>
      <span>${formatBytes(file.size)}</span>
    `;
    fileStrip.append(card);
  });
}

function renderPreviewsFromResults(results) {
  fileStrip.innerHTML = "";
  results.forEach((result) => {
    (result.previews || []).forEach((src, index) => {
      const card = document.createElement("div");
      card.className = "page-card";
      card.innerHTML = `<img src="${src}" alt="${escapeHtml(result.inputName)} page ${index + 1}" /><span>${escapeHtml(result.inputName)} · page ${index + 1}</span>`;
      fileStrip.append(card);
    });
  });
}

function renderResultFiles(results) {
  resultFiles.innerHTML = "";
  results.forEach((result) => {
    const link = document.createElement("a");
    link.href = result.downloadUrl;
    link.download = result.fileName;
    link.textContent = `${result.fileName} · ${result.pages} стор. · ${result.resultSizeLabel}`;
    resultFiles.append(link);
  });
}

function formatBytes(size) {
  let value = size;
  for (const unit of ["B", "KB", "MB", "GB"]) {
    if (value < 1024 || unit === "GB") {
      return unit === "B" ? `${value} B` : `${value.toFixed(1)} ${unit}`;
    }
    value /= 1024;
  }
  return `${size} B`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function loadJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Settings persistence is a convenience feature; conversion must keep working if storage is unavailable.
  }
}

function watermarkTextHistoryItems() {
  return loadJson(TEXT_HISTORY_STORAGE_KEY, []).filter((item) => typeof item === "string" && item.trim());
}

function renderWatermarkTextHistory() {
  watermarkTextHistory.innerHTML = "";
  watermarkTextHistoryItems().forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    watermarkTextHistory.append(option);
  });
}

function rememberWatermarkText(value) {
  const text = String(value || "").trim();
  if (!text) return;
  const normalized = text.toLowerCase();
  const next = [text, ...watermarkTextHistoryItems().filter((item) => item.toLowerCase() !== normalized)].slice(0, MAX_TEXT_HISTORY);
  saveJson(TEXT_HISTORY_STORAGE_KEY, next);
  renderWatermarkTextHistory();
}

function syncPositionUi() {
  positionGrid.querySelectorAll("button").forEach((item) => item.classList.toggle("selected", item.dataset.position === selectedPosition));
}

function syncQualityUi(value) {
  qualityLabels.forEach((label) => {
    const radio = label.querySelector("input");
    const active = radio.value === value;
    radio.checked = active;
    label.classList.toggle("active", active);
  });
}

function syncWatermarkModeUi() {
  modeButtons.forEach((item) => item.classList.toggle("active", item.dataset.mode === watermarkMode));
  textControls.hidden = watermarkMode !== "text";
  imageControls.hidden = watermarkMode !== "image";
}

function saveSettings() {
  const config = collectConfig();
  saveJson(SETTINGS_STORAGE_KEY, config);
}

function scheduleSaveSettings() {
  window.clearTimeout(scheduleSaveSettings.timer);
  scheduleSaveSettings.timer = window.setTimeout(saveSettings, 180);
}

function applyStoredSettings() {
  const settings = loadJson(SETTINGS_STORAGE_KEY, null);
  renderWatermarkTextHistory();
  if (!settings || typeof settings !== "object") {
    syncPositionUi();
    syncQualityUi(document.querySelector("input[name='jpgQuality']:checked")?.value || "normal");
    syncWatermarkModeUi();
    return;
  }

  watermarkMode = settings.watermarkMode === "image" ? "image" : "text";
  selectedPosition = settings.position || selectedPosition;

  const fieldValues = {
    watermarkText: settings.text,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    watermarkColor: settings.color,
    imageScale: settings.imageScale,
    transparency: settings.transparency,
    rotation: settings.rotation,
    fromPage: settings.fromPage,
    toPage: settings.toPage,
    compressDpi: settings.compressDpi,
    compressQuality: settings.compressQuality,
    ocrStrength: settings.ocrStrength,
    instructionText: settings.instructionText,
    instructionPlacement: settings.instructionPlacement,
    instructionVisibility: settings.instructionVisibility,
    instructionColor: settings.instructionColor,
    instructionOpacity: settings.instructionOpacity,
    instructionFontSize: settings.instructionFontSize,
  };

  Object.entries(fieldValues).forEach(([id, value]) => {
    if (value === undefined || value === null) return;
    const element = document.querySelector(`#${id}`);
    if (element) element.value = value;
  });

  const checkboxValues = {
    mosaicToggle: settings.mosaic,
    ocrProtection: settings.ocrProtection,
    instructionLayer: settings.instructionLayer,
    invisibleMachineText: settings.invisibleMachineText,
    instructionMetadata: settings.instructionMetadata,
  };

  Object.entries(checkboxValues).forEach(([id, value]) => {
    if (value === undefined || value === null) return;
    const element = document.querySelector(`#${id}`);
    if (element) element.checked = Boolean(value);
  });

  toggles.bold.classList.toggle("active", Boolean(settings.bold));
  toggles.italic.classList.toggle("active", Boolean(settings.italic));
  toggles.underline.classList.toggle("active", Boolean(settings.underline));
  syncPositionUi();
  syncQualityUi(settings.jpgQuality || "normal");
  syncWatermarkModeUi();
}

function addFiles(fileList) {
  const existing = new Set(selectedFiles.map(fileKey));
  [...fileList].forEach((file) => {
    if (!existing.has(fileKey(file))) {
      selectedFiles.push(file);
      existing.add(fileKey(file));
    }
  });
  resultPanel.hidden = true;
  setSteps(-1);
  renderSelectedFiles();
}

function collectConfig() {
  return {
    watermarkMode,
    text: watermarkTextInput.value,
    fontFamily: document.querySelector("#fontFamily").value,
    fontSize: document.querySelector("#fontSize").value,
    bold: toggles.bold.classList.contains("active"),
    italic: toggles.italic.classList.contains("active"),
    underline: toggles.underline.classList.contains("active"),
    color: document.querySelector("#watermarkColor").value,
    imageScale: document.querySelector("#imageScale").value,
    position: selectedPosition,
    mosaic: document.querySelector("#mosaicToggle").checked,
    mosaicCols: 3,
    mosaicRows: 3,
    transparency: document.querySelector("#transparency").value,
    rotation: document.querySelector("#rotation").value,
    fromPage: document.querySelector("#fromPage").value,
    toPage: document.querySelector("#toPage").value,
    jpgQuality: document.querySelector("input[name='jpgQuality']:checked").value,
    compressDpi: document.querySelector("#compressDpi").value,
    compressQuality: document.querySelector("#compressQuality").value,
    ocrProtection: document.querySelector("#ocrProtection").checked,
    ocrStrength: document.querySelector("#ocrStrength").value,
    instructionLayer: document.querySelector("#instructionLayer").checked,
    instructionText: document.querySelector("#instructionText").value,
    instructionPlacement: document.querySelector("#instructionPlacement").value,
    instructionVisibility: document.querySelector("#instructionVisibility").value,
    instructionColor: document.querySelector("#instructionColor").value,
    instructionOpacity: document.querySelector("#instructionOpacity").value,
    instructionFontSize: document.querySelector("#instructionFontSize").value,
    invisibleMachineText: document.querySelector("#invisibleMachineText").checked,
    instructionMetadata: document.querySelector("#instructionMetadata").checked,
  };
}

function triggerDownload(url, filename) {
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
}

async function runPipeline() {
  if (!selectedFiles.length) {
    showToast("Спершу додайте PDF, DOCX, PPTX, JPG або PNG файл.");
    return;
  }
  if (watermarkMode === "image" && !watermarkImageFile) {
    showToast("Для Place image додайте PNG, JPG або WebP watermark.");
    return;
  }
  rememberWatermarkText(watermarkTextInput.value);
  saveSettings();

  runButton.disabled = true;
  runButton.textContent = "Обробка...";
  resultPanel.hidden = true;
  setSteps(0);

  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append("documents", file));
  if (watermarkImageFile) formData.append("watermarkImage", watermarkImageFile);
  formData.append("config", JSON.stringify(collectConfig()));

  const stepTimer = window.setInterval(() => {
    const current = [...document.querySelectorAll(".step")].findIndex((step) => step.classList.contains("active"));
    setSteps(Math.min(current + 1, 4));
  }, 1000);

  try {
    const response = await fetch("/api/process", { method: "POST", body: formData });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Pipeline не завершився.");

    const results = payload.results || [payload];
    window.clearInterval(stepTimer);
    setSteps(5, true);
    renderPreviewsFromResults(results);
    renderResultFiles(results);

    const multiple = results.length > 1;
    downloadLink.href = multiple ? payload.bundleDownloadUrl : results[0].downloadUrl;
    downloadLink.setAttribute("download", multiple ? payload.bundleFileName : results[0].fileName);
    downloadLink.textContent = multiple ? "Завантажити ZIP" : "Завантажити PDF";
    resultTitle.textContent = multiple ? `${results.length} файли оброблено` : (results[0].conversionNote || "Файл оброблено");
    resultMeta.textContent = `${payload.totalPages || results[0].pages} стор. · ${payload.totalSourceSizeLabel || results[0].sourceSizeLabel} → ${payload.totalResultSizeLabel || results[0].resultSizeLabel} · зміна ${payload.totalRatio ?? results[0].ratio}%`;
    warningText.hidden = !payload.warning;
    warningText.textContent = payload.warning || "";
    resultPanel.hidden = false;
    triggerDownload(downloadLink.href, multiple ? payload.bundleFileName : results[0].fileName);
    showToast(results[0].steps?.join(" · ") || "Готово.");
  } catch (error) {
    window.clearInterval(stepTimer);
    setSteps(-1);
    showToast(error.message);
  } finally {
    runButton.disabled = false;
    runButton.textContent = "Запустити pipeline →";
  }
}

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files || []);
  fileInput.value = "";
});

fileStrip.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-file");
  if (!button) return;
  selectedFiles.splice(Number(button.dataset.index), 1);
  renderSelectedFiles();
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  addFiles(event.dataTransfer.files || []);
});

positionGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-position]");
  if (!button) return;
  selectedPosition = button.dataset.position;
  syncPositionUi();
  saveSettings();
});

Object.values(toggles).forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("active");
    saveSettings();
  });
});

qualityLabels.forEach((label) => {
  label.addEventListener("click", () => {
    const radio = label.querySelector("input");
    syncQualityUi(radio.value);
    saveSettings();
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    watermarkMode = button.dataset.mode;
    syncWatermarkModeUi();
    saveSettings();
  });
});

controls.addEventListener("input", () => {
  scheduleSaveSettings();
});

controls.addEventListener("change", (event) => {
  if (event.target === watermarkTextInput) rememberWatermarkText(watermarkTextInput.value);
  saveSettings();
});

watermarkImageInput.addEventListener("change", (event) => {
  watermarkImageFile = event.target.files?.[0] || null;
  if (!watermarkImageFile) {
    watermarkImagePreview.textContent = "PNG, JPG або WebP";
    return;
  }
  watermarkImagePreview.innerHTML = `<img src="${URL.createObjectURL(watermarkImageFile)}" alt="" /><span>${escapeHtml(watermarkImageFile.name)}</span>`;
});

resetButton.addEventListener("click", () => {
  selectedFiles = [];
  fileInput.value = "";
  watermarkImageFile = null;
  watermarkImageInput.value = "";
  watermarkImagePreview.textContent = "PNG, JPG або WebP";
  resultPanel.hidden = true;
  setSteps(-1);
  renderSelectedFiles();
});

runButton.addEventListener("click", runPipeline);

applyStoredSettings();
renderSelectedFiles();

// Heartbeat: поки вкладка відкрита, сервер отримує сигнал кожні 5 секунд.
// Якщо сигналів немає довше за таймаут, сервер сам зупиняється.
setInterval(() => {
  fetch("/api/heartbeat", { cache: "no-store" }).catch(() => {});
}, 5000);
