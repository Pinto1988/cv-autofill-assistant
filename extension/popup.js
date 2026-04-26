import * as pdfjsLib from "./vendor/pdf.mjs";
import { parseCvText } from "./profile-parser.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.mjs");

const STORAGE_KEY = "savedProfile";

const cvFileInput = document.getElementById("cvFile");
const extractButton = document.getElementById("extractButton");
const clearButton = document.getElementById("clearButton");
const saveProfileButton = document.getElementById("saveProfileButton");
const fillButton = document.getElementById("fillButton");
const profileSummary = document.getElementById("profileSummary");
const profileEditor = document.getElementById("profileEditor");
const statusNode = document.getElementById("status");

init().catch((error) => {
  console.error(error);
  setStatus(`Errore iniziale: ${error.message}`);
});

extractButton.addEventListener("click", async () => {
  const file = cvFileInput.files?.[0];
  if (!file) {
    setStatus("Seleziona prima un file PDF o TXT.");
    return;
  }

  try {
    setStatus("Sto leggendo il CV...");
    const rawText = await readCvFile(file);
    const profile = parseCvText(rawText);

    await saveProfile(profile);
    renderProfile(profile);
    setStatus("Profilo estratto e salvato nel browser.");
  } catch (error) {
    console.error(error);
    setStatus(`Non sono riuscito a leggere il CV: ${error.message}`);
  }
});

saveProfileButton.addEventListener("click", async () => {
  try {
    const parsed = JSON.parse(profileEditor.value || "{}");
    await saveProfile(parsed);
    renderProfile(parsed);
    setStatus("Modifiche salvate.");
  } catch (error) {
    setStatus(`JSON non valido: ${error.message}`);
  }
});

clearButton.addEventListener("click", async () => {
  await chrome.storage.local.remove(STORAGE_KEY);
  renderProfile(null);
  setStatus("Profilo rimosso.");
});

fillButton.addEventListener("click", async () => {
  const profile = await loadProfile();
  if (!profile) {
    setStatus("Carica prima un CV o incolla un profilo valido.");
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      setStatus("Non trovo una scheda attiva da compilare.");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "FILL_FORM",
      profile
    });

    if (!response) {
      setStatus("La pagina non ha risposto. Ricarica la tab e riprova.");
      return;
    }

    setStatus(
      `Compilati ${response.filled} campi. Saltati ${response.skipped} campi senza match chiaro.`
    );
  } catch (error) {
    console.error(error);
    setStatus(`Compilazione fallita: ${error.message}`);
  }
});

async function init() {
  const profile = await loadProfile();
  renderProfile(profile);
}

async function loadProfile() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || null;
}

async function saveProfile(profile) {
  await chrome.storage.local.set({ [STORAGE_KEY]: profile });
}

async function readCvFile(file) {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }

  if (lowerName.endsWith(".txt") || lowerName.endsWith(".md")) {
    return file.text();
  }

  throw new Error("Formato non supportato. Usa PDF, TXT o MD.");
}

async function extractTextFromPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    pages.push(text);
  }

  return pages.join("\n");
}

function renderProfile(profile) {
  if (!profile) {
    profileSummary.className = "summary empty";
    profileSummary.textContent = "Nessun profilo salvato.";
    profileEditor.value = "";
    return;
  }

  const highlights = [
    ["Nome", profile.fullName],
    ["Ruolo", profile.jobTitle],
    ["Email", profile.email],
    ["Telefono", profile.phone],
    ["Localita", profile.location || profile.address],
    ["Skills", Array.isArray(profile.skills) ? profile.skills.join(", ") : ""]
  ].filter(([, value]) => value);

  profileSummary.className = "summary";
  profileSummary.innerHTML = `
    <div class="summary-grid">
      ${highlights
        .map(
          ([label, value]) =>
            `<div class="summary-row"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`
        )
        .join("")}
    </div>
  `;
  profileEditor.value = JSON.stringify(profile, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function setStatus(message) {
  statusNode.textContent = message;
}
