const SUPABASE_URL = "https://alosapdelryrbcudrsoj.supabase.co";
const SUPABASE_KEY = "sb_publishable_aJhHdHk4RgezLXqQjvhFlQ_e0eSBa3_";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const STATUS_FLOW = ["À faire", "En cours", "Fait"];
const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];
const MOIS_COURTS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc."
];

/* --- UTILITAIRES DE DATES RÉELLES --- */
function getTodayISO() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

function toISO(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, "0");
  const j = String(day).padStart(2, "0");
  return `${year}-${m}-${j}`;
}

function parseISO(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function addDaysISO(iso, deltaDays) {
  const p = parseISO(iso) || parseISO(getTodayISO());
  const dt = new Date(p.year, p.month, p.day + deltaDays);
  return toISO(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function formatDateCourt(iso) {
  const p = parseISO(iso);
  if (!p) return iso || "Choisir une date";
  return `${p.day} ${MOIS_COURTS_FR[p.month]} ${p.year}`;
}

function formatDateLong(iso) {
  const p = parseISO(iso);
  if (!p) return iso || "";
  return `${p.day === 1 ? "1er" : p.day} ${MOIS_FR[p.month]} ${p.year}`;
}

function formatMoisAnnee(year, monthIndex) {
  const nom = MOIS_FR[monthIndex];
  return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${year}`;
}

/* --- JOURS FÉRIÉS FRANÇAIS & JOURS OUVRÉS --- */
const cacheFeries = {};

function getJoursFeriesAnnee(year) {
  if (cacheFeries[year]) return cacheFeries[year];
  const map = {
    [`${year}-01-01`]: "Jour de l'an",
    [`${year}-05-01`]: "Fête du Travail",
    [`${year}-05-08`]: "Victoire 1945",
    [`${year}-07-14`]: "Fête nationale",
    [`${year}-08-15`]: "Assomption",
    [`${year}-11-01`]: "Toussaint",
    [`${year}-11-11`]: "Armistice 1918",
    [`${year}-12-25`]: "Noël"
  };

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month, day);
  const addEaster = (delta) => {
    const dt = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + delta);
    return toISO(dt.getFullYear(), dt.getMonth(), dt.getDate());
  };

  map[addEaster(1)] = "Lundi de Pâques";
  map[addEaster(39)] = "Ascension";
  map[addEaster(50)] = "Lundi de Pentecôte";

  cacheFeries[year] = map;
  return map;
}

function getNomJourFerie(iso) {
  const p = parseISO(iso);
  if (!p) return null;
  return getJoursFeriesAnnee(p.year)[iso] || null;
}

function isWeekendISO(iso) {
  const p = parseISO(iso);
  if (!p) return false;
  const dow = new Date(p.year, p.month, p.day).getDay();
  return dow === 0 || dow === 6;
}

function isJourOuvre(iso) {
  return !isWeekendISO(iso) && !getNomJourFerie(iso);
}

function nextJourOuvre(iso) {
  let cur = iso;
  let guard = 0;
  while (!isJourOuvre(cur) && guard < 30) {
    cur = addDaysISO(cur, 1);
    guard++;
  }
  return cur;
}

function addJoursOuvres(iso, deltaOuvres) {
  let cur = iso;
  const step = deltaOuvres >= 0 ? 1 : -1;
  let remaining = Math.abs(deltaOuvres);
  while (remaining > 0) {
    cur = addDaysISO(cur, step);
    if (isJourOuvre(cur)) remaining--;
  }
  return nextJourOuvre(cur);
}

function countJoursOuvres(startIso, endIso) {
  if (!startIso || !endIso || endIso < startIso) return 0;
  let count = 0;
  let cur = startIso;
  let guard = 0;
  while (cur <= endIso && guard < 730) {
    if (isJourOuvre(cur)) count++;
    cur = addDaysISO(cur, 1);
    guard++;
  }
  return count;
}

const EXEMPLES_E2C = [
  {
    name: "Visite d'entreprise",
    start_date: "2026-11-24",
    end_date: "2026-11-30",
    owner: "Formateur référent",
    color: "#2563eb",
    steps: [
      { id: "ve-1", dateISO: "2026-11-30", dateLimite: "30 nov. 2026", libelle: "Visite de l'entreprise avec le groupe", responsable: "Formateur référent", statut: "À faire" },
      { id: "ve-2", dateISO: "2026-11-27", dateLimite: "27 nov. 2026", libelle: "Envoyer aux jeunes l'heure, le lieu et les consignes", responsable: "Chargé d'accompagnement", statut: "En cours" },
      { id: "ve-3", dateISO: "2026-11-25", dateLimite: "25 nov. 2026", libelle: "Constituer la liste des participants", responsable: "Formateur référent", statut: "Fait" }
    ]
  },
  {
    name: "Atelier / Job dating",
    start_date: "2026-12-03",
    end_date: "2026-12-10",
    owner: "Équipe insertion",
    color: "#16a34a",
    steps: [
      { id: "jd-1", dateISO: "2026-12-10", dateLimite: "10 déc. 2026", libelle: "Tenir les entretiens flash candidats-recruteurs", responsable: "Équipe insertion", statut: "À faire" },
      { id: "jd-2", dateISO: "2026-12-07", dateLimite: "7 déc. 2026", libelle: "Préparer les CV et le pitch de présentation", responsable: "Formateur référent", statut: "En cours" },
      { id: "jd-3", dateISO: "2026-12-03", dateLimite: "3 déc. 2026", libelle: "Valider la venue des recruteurs et les créneaux", responsable: "Chargé relations entreprises", statut: "Fait" }
    ]
  },
  {
    name: "Vœux & Bilan Janvier 2027",
    start_date: "2027-01-11",
    end_date: "2027-01-18",
    owner: "Direction / Référents",
    color: "#ea580c",
    steps: [
      { id: "rp-1", dateISO: "2027-01-18", dateLimite: "18 janv. 2027", libelle: "Réunion bilan et suites d'accompagnement", responsable: "Direction / Référents", statut: "À faire" },
      { id: "rp-2", dateISO: "2027-01-14", dateLimite: "14 janv. 2027", libelle: "Envoyer l'ordre du jour et les fiches stagiaires", responsable: "Chargé d'accompagnement", statut: "À faire" }
    ]
  }
];

let currentUser = null;
let authMode = "login";
let projets = [];
let projetActifId = null;
let activeViewMode = "calendar";
let editingProjectId = null;
let realtimeChannel = null;

const nowDate = new Date();
let viewYear = nowDate.getFullYear();
let viewMonth = nowDate.getMonth();

/* --- ÉTAT DU MINI-CALENDRIER --- */
let miniYear = viewYear;
let miniMonth = viewMonth;
let activeDatePicker = null; // { type: 'start' | 'end' | 'step', trigger: HTMLElement, row?: HTMLElement }

function mapRowToProject(row) {
  const titre = row.name || "Projet sans titre";
  let startDate = "";
  let endDate = "";

  const rawDue = String(row.due_date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(rawDue)) {
    [startDate, endDate] = rawDue.split("|");
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDue)) {
    endDate = rawDue;
    const p = parseISO(endDate);
    startDate = toISO(p.year, p.month, Math.min(row.start_day || p.day, p.day));
  } else {
    const y = nowDate.getFullYear();
    const m = nowDate.getMonth();
    const sDay = Math.max(1, Math.min(28, Number(row.start_day) || 1));
    const eDay = Math.max(sDay, Math.min(30, Number(row.end_day) || sDay));
    startDate = toISO(y, m, sDay);
    endDate = toISO(y, m, eDay);
  }

  return {
    id: row.id,
    userId: row.user_id,
    titre,
    court: titre.length > 26 ? `${titre.slice(0, 25)}…` : titre,
    startDate,
    endDate,
    owner: row.owner || "Formateur référent",
    couleur: row.color || "#2563eb",
    etapes: Array.isArray(row.steps) ? row.steps : [],
    collaborators: Array.isArray(row.collaborators) ? row.collaborators : []
  };
}

function estProprietaireProjet(projet) {
  return Boolean(currentUser && projet && projet.userId === currentUser.id);
}

function peutModifierProjet(projet) {
  if (!currentUser || !projet) return false;
  if (estProprietaireProjet(projet)) return true;
  const collab = projet.collaborators.find((c) => c.user_id === currentUser.id);
  return Boolean(collab && collab.can_edit);
}

function afficherNotification(message, duree = 3200) {
  const banner = document.getElementById("globalBanner");
  banner.textContent = message;
  banner.hidden = false;
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => { banner.hidden = true; }, duree);
}

function getProjetActif() {
  if (!projets.length) return null;
  return projets.find((p) => p.id === projetActifId) || projets[0];
}

function choisirProjet(id, jumpToMonth = false) {
  projetActifId = id;
  if (jumpToMonth) {
    const p = getProjetActif();
    const parsed = parseISO(p?.startDate);
    if (parsed) {
      viewYear = parsed.year;
      viewMonth = parsed.month;
    }
  }
  rendreTout();
}

function classeStatut(statut) {
  if (statut === "Fait") return "st-done";
  if (statut === "En cours") return "st-doing";
  return "st-todo";
}

function estJaune(hex) {
  return (hex || "").toLowerCase() === "#eab308";
}

function couleurTexteSurRepere(hex) {
  return estJaune(hex) ? "#1e293b" : "#ffffff";
}

function couleurAccentTexte(hex) {
  return estJaune(hex) ? "#a16207" : hex;
}

function rendreBadgeProjet() {
  const actif = getProjetActif();
  const badge = document.getElementById("globalProgress");
  if (!actif) {
    badge.textContent = "Aucun projet enregistré";
    badge.style.color = "#64748b";
    badge.style.borderColor = "#e2e8f0";
    return;
  }
  const total = actif.etapes.length;
  const faites = actif.etapes.filter((e) => e.statut === "Fait").length;
  const pct = total ? Math.round((faites / total) * 100) : 0;
  badge.textContent = `${actif.court} : ${faites}/${total} étapes (${pct}%)`;
  badge.style.color = couleurAccentTexte(actif.couleur);
  badge.style.borderColor = actif.couleur;
}

function rendreCalendrier() {
  document.getElementById("calMonthTitle").textContent = formatMoisAnnee(viewYear, viewMonth);

  const actif = getProjetActif();
  const todayISO = getTodayISO();
  const firstDayWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cases = [];
  for (let i = 0; i < firstDayWeek; i++) cases.push(null);
  for (let d = 1; d <= daysInMonth; d++) cases.push(d);
  while (cases.length % 7 !== 0) cases.push(null);

  const lignes = [];
  for (let i = 0; i < cases.length; i += 7) {
    const tds = cases.slice(i, i + 7).map((jour) => {
      if (!jour) return `<td class="blank"></td>`;
      const iso = toISO(viewYear, viewMonth, jour);
      const ferieNom = getNomJourFerie(iso);
      const weekend = isWeekendISO(iso);
      const ouvre = !ferieNom && !weekend;
      const surJour = ouvre ? projets.filter((p) => iso >= p.startDate && iso <= p.endDate) : [];
      const dansActif = ouvre && actif && iso >= actif.startDate && iso <= actif.endDate;
      const isToday = iso === todayISO;
      const reperes = surJour
        .map((p) => `<button type="button" class="mark" data-pid="${p.id}" style="background:${p.couleur};color:${couleurTexteSurRepere(p.couleur)}">${p.court}</button>`)
        .join("");
      const ferieBadge = ferieNom ? `<span class="holiday-tag" title="Jour férié : ${ferieNom}">${ferieNom}</span>` : "";
      const classes = [
        dansActif ? "active-range" : "",
        isToday ? "is-today" : "",
        ferieNom ? "is-holiday" : "",
        weekend ? "is-weekend" : ""
      ].filter(Boolean).join(" ");
      return `<td class="${classes}"><div class="cal-day-head"><div class="dnum">${jour}</div>${ferieBadge}</div>${reperes}</td>`;
    });
    lignes.push(`<tr>${tds.join("")}</tr>`);
  }

  const tbody = document.getElementById("calBody");
  tbody.innerHTML = lignes.join("");
  tbody.querySelectorAll(".mark").forEach((btn) => {
    btn.addEventListener("click", () => choisirProjet(btn.dataset.pid, false));
  });
}

function rendrePanneau() {
  const countEl = document.getElementById("projectCount");
  countEl.textContent = `${projets.length} projet${projets.length > 1 ? "s" : ""}`;

  const seedBtn = document.getElementById("seedExamplesBtn");
  seedBtn.hidden = projets.length > 0;

  const tabs = document.getElementById("projectTabs");
  const detailBox = document.getElementById("detailBox");

  if (!projets.length) {
    tabs.innerHTML = "";
    detailBox.innerHTML = `
      <div class="empty-state">
        Aucun projet dans votre espace pour le moment.<br/>
        Cliquez sur <strong>+ Nouveau projet</strong> ou chargez les 3 exemples E2C.
      </div>
    `;
    return;
  }

  const actif = getProjetActif();
  tabs.innerHTML = projets
    .map((p) => {
      const faites = p.etapes.filter((e) => e.statut === "Fait").length;
      const pctProjet = p.etapes.length ? Math.round((faites / p.etapes.length) * 100) : 0;
      const isShared = p.collaborators.length > 0 || !estProprietaireProjet(p);
      const sharedTag = isShared ? `<span class="tab-shared-tag">${estProprietaireProjet(p) ? `Partagé (${p.collaborators.length})` : "Partagé"}</span>` : "";
      return `<button type="button" class="tab-btn ${p.id === actif.id ? "selected" : ""}" data-pid="${p.id}" style="border-left:4px solid ${p.couleur}"><span>${p.titre}</span><span class="tab-badges">${sharedTag}<span class="tab-stat">${faites}/${p.etapes.length} (${pctProjet}%)</span></span></button>`;
    })
    .join("");

  tabs.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => choisirProjet(btn.dataset.pid, true));
  });

  const faitesActif = actif.etapes.filter((e) => e.statut === "Fait").length;
  const pctActif = actif.etapes.length ? Math.round((faitesActif / actif.etapes.length) * 100) : 0;
  const accent = couleurAccentTexte(actif.couleur);
  const isOwner = estProprietaireProjet(actif);
  const canEdit = peutModifierProjet(actif);

  const roleBadge = isOwner
    ? `<span class="role-pill is-owner">Propriétaire${actif.collaborators.length ? ` • Partagé avec ${actif.collaborators.length} collègue(s)` : ""}</span>`
    : canEdit
      ? `<span class="role-pill is-editor">Collaborateur • Modification &amp; ajout autorisés</span>`
      : `<span class="role-pill is-viewer">Collaborateur • Validation « Fait » uniquement</span>`;

  const actionBtns = `
    <div class="detail-actions">
      ${isOwner ? `<button type="button" id="shareProjectBtn" class="btn-share-sm">Partager</button>` : ""}
      ${canEdit ? `<button type="button" id="editProjectBtn" class="btn-edit-sm">Modifier</button>` : ""}
      ${isOwner ? `<button type="button" id="deleteProjectBtn" class="btn-danger-sm" title="Supprimer ce projet">Supprimer</button>` : ""}
    </div>
  `;

  const etapesTriees = [...actif.etapes].sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

  detailBox.innerHTML = `
    ${roleBadge}
    <div class="detail-header">
      <h3 style="color:${accent}">${actif.titre}</h3>
      ${actionBtns}
    </div>
    <div class="meta">Du ${formatDateCourt(actif.startDate)} au ${formatDateCourt(actif.endDate)} • <strong>${countJoursOuvres(actif.startDate, actif.endDate)} j. ouvrés</strong> • ${faitesActif}/${actif.etapes.length} fait (${pctActif}%)</div>
    ${etapesTriees.map((e) => {
      const isDone = e.statut === "Fait";
      const dateTexte = e.dateISO ? formatDateLong(e.dateISO) : e.dateLimite;
      return `
      <div class="step">
        <div class="step-left">
          <input type="checkbox" class="step-check" data-eid="${e.id}" ${isDone ? "checked" : ""} aria-label="Marquer l'étape comme faite" />
          <div>
            <div class="step-date" style="color:${accent}">Date limite : ${dateTexte}</div>
            <p class="step-text ${isDone ? "is-done" : ""}">${e.libelle}</p>
            <div class="step-who">Responsable : ${e.responsable}</div>
          </div>
        </div>
        <button type="button" class="st ${classeStatut(e.statut)}" data-eid="${e.id}" title="Cliquer pour changer : À faire → En cours → Fait">${e.statut}</button>
      </div>
    `;
    }).join("")}
  `;

  document.getElementById("shareProjectBtn")?.addEventListener("click", () => ouvrirModalePartage(actif));
  document.getElementById("editProjectBtn")?.addEventListener("click", () => ouvrirModaleEditionProjet(actif));
  document.getElementById("deleteProjectBtn")?.addEventListener("click", () => supprimerProjet(actif.id));

  document.querySelectorAll(".step-check").forEach((chk) => {
    chk.addEventListener("change", async () => {
      const etape = actif.etapes.find((item) => item.id === chk.dataset.eid);
      if (!etape) return;
      etape.statut = chk.checked ? "Fait" : "À faire";
      rendreTout();
      await sauvegarderEtapesProjet(actif);
    });
  });

  document.querySelectorAll(".st").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const etape = actif.etapes.find((item) => item.id === btn.dataset.eid);
      if (!etape) return;
      etape.statut = STATUS_FLOW[(STATUS_FLOW.indexOf(etape.statut) + 1) % STATUS_FLOW.length];
      rendreTout();
      await sauvegarderEtapesProjet(actif);
    });
  });
}

/* --- MINI-CALENDRIER SÉLECTEUR DE DATE --- */
function setProjectDateField(which, iso) {
  if (which === "start") {
    document.getElementById("projStartDate").value = iso;
    document.getElementById("projStartLabel").textContent = formatDateCourt(iso);
    const endIso = document.getElementById("projEndDate").value;
    if (endIso && iso > endIso) {
      document.getElementById("projEndDate").value = iso;
      document.getElementById("projEndLabel").textContent = formatDateCourt(iso);
    }
  } else {
    document.getElementById("projEndDate").value = iso;
    document.getElementById("projEndLabel").textContent = formatDateCourt(iso);
    const startIso = document.getElementById("projStartDate").value;
    if (startIso && iso < startIso) {
      document.getElementById("projStartDate").value = iso;
      document.getElementById("projStartLabel").textContent = formatDateCourt(iso);
    }
  }
}

function setStepRowDate(row, iso) {
  row.dataset.dateIso = iso;
  const label = row.querySelector(".sr-date-label");
  if (label) label.textContent = formatDateCourt(iso);
}

function getActivePickerISO() {
  if (!activeDatePicker) return getTodayISO();
  if (activeDatePicker.type === "start") return document.getElementById("projStartDate").value;
  if (activeDatePicker.type === "end") return document.getElementById("projEndDate").value;
  if (activeDatePicker.type === "step" && activeDatePicker.row) return activeDatePicker.row.dataset.dateIso;
  return getTodayISO();
}

function rendreMiniCalendrier() {
  document.getElementById("miniMonthTitle").textContent = formatMoisAnnee(miniYear, miniMonth);
  const selectedISO = getActivePickerISO();
  const startISO = document.getElementById("projStartDate").value;
  const endISO = document.getElementById("projEndDate").value;
  const todayISO = getTodayISO();

  const firstDayWeek = (new Date(miniYear, miniMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayWeek; i++) cells.push(`<span class="mc-empty"></span>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(miniYear, miniMonth, d);
    const ferieNom = getNomJourFerie(iso);
    const weekend = isWeekendISO(iso);
    const nonOuvre = Boolean(ferieNom) || weekend;
    const cls = [
      "mc-day",
      iso === selectedISO ? "is-selected" : "",
      iso === todayISO ? "is-today" : "",
      (startISO && endISO && iso >= startISO && iso <= endISO && !nonOuvre) ? "in-range" : "",
      nonOuvre ? "is-non-working" : "",
      ferieNom ? "is-holiday-mc" : ""
    ].filter(Boolean).join(" ");
    const titleAttr = ferieNom ? `title="Férié : ${ferieNom} (non cliquable)"` : weekend ? `title="Week-end (non ouvré)"` : "";
    cells.push(`<button type="button" class="${cls}" data-iso="${iso}" ${nonOuvre ? "disabled" : ""} ${titleAttr}>${d}</button>`);
  }

  const grid = document.getElementById("miniCalGrid");
  grid.innerHTML = cells.join("");
  grid.querySelectorAll(".mc-day:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const chosen = btn.dataset.iso;
      if (!activeDatePicker) return;
      if (activeDatePicker.type === "start") setProjectDateField("start", chosen);
      else if (activeDatePicker.type === "end") setProjectDateField("end", chosen);
      else if (activeDatePicker.type === "step" && activeDatePicker.row) setStepRowDate(activeDatePicker.row, chosen);
      fermerMiniCalendrier();
    });
  });
}

function ouvrirMiniCalendrier(pickerConfig) {
  fermerMiniCalendrier();
  activeDatePicker = pickerConfig;
  pickerConfig.trigger.classList.add("is-picking");

  const currentISO = getActivePickerISO();
  const parsed = parseISO(currentISO) || { year: viewYear, month: viewMonth };
  miniYear = parsed.year;
  miniMonth = parsed.month;

  const pop = document.getElementById("miniCalPopover");
  pop.hidden = false;
  rendreMiniCalendrier();

  const rect = pickerConfig.trigger.getBoundingClientRect();
  const popW = pop.offsetWidth || 276;
  const popH = pop.offsetHeight || 295;
  let left = rect.left;
  let top = rect.bottom + 6;
  if (left + popW > window.innerWidth - 12) left = Math.max(12, window.innerWidth - popW - 12);
  if (top + popH > window.innerHeight - 12) top = Math.max(12, rect.top - popH - 6);
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function fermerMiniCalendrier() {
  if (activeDatePicker?.trigger) activeDatePicker.trigger.classList.remove("is-picking");
  activeDatePicker = null;
  const pop = document.getElementById("miniCalPopover");
  if (pop) pop.hidden = true;
}

function initMiniCalendrier() {
  document.getElementById("projStartBtn").addEventListener("click", (e) => {
    ouvrirMiniCalendrier({ type: "start", trigger: e.currentTarget });
  });
  document.getElementById("projEndBtn").addEventListener("click", (e) => {
    ouvrirMiniCalendrier({ type: "end", trigger: e.currentTarget });
  });
  document.getElementById("miniPrevBtn").addEventListener("click", () => {
    miniMonth--;
    if (miniMonth < 0) { miniMonth = 11; miniYear--; }
    rendreMiniCalendrier();
  });
  document.getElementById("miniNextBtn").addEventListener("click", () => {
    miniMonth++;
    if (miniMonth > 11) { miniMonth = 0; miniYear++; }
    rendreMiniCalendrier();
  });
  document.getElementById("miniTodayBtn").addEventListener("click", () => {
    const t = new Date();
    miniYear = t.getFullYear();
    miniMonth = t.getMonth();
    rendreMiniCalendrier();
  });
  document.addEventListener("click", (e) => {
    const pop = document.getElementById("miniCalPopover");
    if (pop.hidden) return;
    if (pop.contains(e.target) || e.target.closest("[data-date-picker]")) return;
    fermerMiniCalendrier();
  });
}

/* --- MODALE PARTAGE & DROITS --- */
function setShareFeedback(msg, type = "error") {
  const box = document.getElementById("shareFeedback");
  if (!msg) { box.hidden = true; return; }
  box.textContent = msg;
  box.className = `auth-feedback ${type}`;
  box.hidden = false;
}

function rendreListeCollaborateurs(projet) {
  const listEl = document.getElementById("shareCollaboratorsList");
  if (!projet || !projet.collaborators.length) {
    listEl.innerHTML = `<div class="empty-state">Ce projet n'est encore partagé avec personne.</div>`;
    return;
  }
  listEl.innerHTML = projet.collaborators.map((c) => `
    <div class="collab-item">
      <div class="collab-info">
        <strong>${c.display_name}</strong>
        <small>${c.can_edit ? "Peut modifier le projet et ajouter des étapes" : "Suivi uniquement (peut cocher Fait)"}</small>
      </div>
      <div class="collab-controls">
        <button type="button" class="btn-perm-toggle ${c.can_edit ? "can-edit" : ""}" data-toggle-uid="${c.user_id}">
          ${c.can_edit ? "Modification : OUI" : "Modification : NON"}
        </button>
        <button type="button" class="btn-remove" data-remove-uid="${c.user_id}" title="Retirer l'accès">✕</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-toggle-uid]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.toggleUid;
      const updated = projet.collaborators.map((c) =>
        c.user_id === uid ? { ...c, can_edit: !c.can_edit } : c
      );
      await enregistrerCollaborateurs(projet, updated);
    });
  });

  listEl.querySelectorAll("[data-remove-uid]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.removeUid;
      const updated = projet.collaborators.filter((c) => c.user_id !== uid);
      await enregistrerCollaborateurs(projet, updated);
    });
  });
}

async function enregistrerCollaborateurs(projet, newCollaborators) {
  const { error } = await sb
    .from("projects")
    .update({ collaborators: newCollaborators })
    .eq("id", projet.id);

  if (error) {
    setShareFeedback(`Erreur : ${error.message}`, "error");
    return;
  }
  projet.collaborators = newCollaborators;
  rendreListeCollaborateurs(projet);
  rendreTout();
}

function ouvrirModalePartage(projet) {
  if (!estProprietaireProjet(projet)) return;
  projetActifId = projet.id;
  document.getElementById("shareProjectSubtitle").textContent = `Projet : ${projet.titre}`;
  document.getElementById("shareIdentifiantInput").value = "";
  document.getElementById("shareCanEditInput").checked = true;
  setShareFeedback("");
  rendreListeCollaborateurs(projet);
  document.getElementById("shareModal").hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("shareIdentifiantInput")?.focus(), 50);
}

function fermerModalePartage() {
  const m = document.getElementById("shareModal");
  if (m) m.hidden = true;
  document.body.classList.remove("modal-open");
}

function initModalePartage() {
  const modal = document.getElementById("shareModal");
  document.getElementById("closeShareModalBtn")?.addEventListener("click", fermerModalePartage);
  modal?.addEventListener("click", (e) => { if (e.target === modal) fermerModalePartage(); });

  document.getElementById("shareAddForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const actif = getProjetActif();
    if (!actif || !estProprietaireProjet(actif)) return;

    const identifiant = document.getElementById("shareIdentifiantInput").value.trim();
    const canEdit = document.getElementById("shareCanEditInput").checked;
    if (!identifiant) return;

    const btn = document.getElementById("shareAddSubmitBtn");
    btn.disabled = true;
    setShareFeedback("");

    const { data: found, error } = await sb.rpc("find_user_by_identifiant", { p_identifiant: identifiant });
    btn.disabled = false;

    if (error || !found) {
      setShareFeedback("Aucun compte trouvé avec cet identifiant. Vérifiez l'orthographe.", "error");
      return;
    }
    if (found.id === currentUser.id) {
      setShareFeedback("Vous êtes déjà le propriétaire de ce projet.", "error");
      return;
    }
    if (actif.collaborators.some((c) => c.user_id === found.id)) {
      setShareFeedback(`${found.display_name} a déjà accès à ce projet.`, "error");
      return;
    }

    const updated = [
      ...actif.collaborators,
      { user_id: found.id, display_name: found.display_name, can_edit: canEdit }
    ];
    await enregistrerCollaborateurs(actif, updated);
    document.getElementById("shareIdentifiantInput").value = "";
    setShareFeedback(`${found.display_name} a été ajouté au projet !`, "success");
  });
}

/* --- MODALE CRÉATION & ÉDITION DE PROJET --- */
function ouvrirModaleProjet() {
  editingProjectId = null;
  document.getElementById("modalTitle").textContent = "Nouveau projet de rétroplanning";
  document.getElementById("saveProjectBtn").textContent = "Enregistrer le projet";
  document.getElementById("addProjectForm").reset();
  reinitialiserDatesFormulaire();
  const modal = document.getElementById("projectModal");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("projTitle")?.focus(), 50);
}

function ouvrirModaleEditionProjet(projet) {
  if (!peutModifierProjet(projet)) return;
  editingProjectId = projet.id;
  document.getElementById("modalTitle").textContent = `Modifier : ${projet.titre}`;
  document.getElementById("saveProjectBtn").textContent = "Enregistrer les modifications";
  document.getElementById("projTitle").value = projet.titre;
  document.getElementById("projOwner").value = projet.owner;
  document.getElementById("projColor").value = projet.couleur;
  setProjectDateField("start", projet.startDate);
  setProjectDateField("end", projet.endDate);

  const container = document.getElementById("stepRowsContainer");
  container.innerHTML = "";
  const etapesTriees = [...projet.etapes].sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
  if (etapesTriees.length) {
    etapesTriees.forEach((st) => {
      ajouterLigneEtape(st.dateISO || projet.endDate, st.libelle, st.responsable, st.id, st.statut);
    });
  } else {
    ajouterLigneEtape(projet.endDate, "", projet.owner);
  }

  const modal = document.getElementById("projectModal");
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function fermerModaleProjet() {
  fermerMiniCalendrier();
  editingProjectId = null;
  const modal = document.getElementById("projectModal");
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function initModale() {
  const modal = document.getElementById("projectModal");
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", ouvrirModaleProjet);
  });
  document.getElementById("closeModalBtn").addEventListener("click", fermerModaleProjet);
  document.getElementById("cancelModalBtn").addEventListener("click", fermerModaleProjet);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fermerModaleProjet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const pop = document.getElementById("miniCalPopover");
      if (pop && !pop.hidden) { fermerMiniCalendrier(); return; }
      if (!modal.hidden) fermerModaleProjet();
    }
  });
}

/* --- NAVIGATION VRAI CALENDRIER --- */
function initNavigationCalendrier() {
  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    rendreCalendrier();
  });
  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    rendreCalendrier();
  });
  document.getElementById("todayMonthBtn").addEventListener("click", () => {
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    rendreCalendrier();
  });
}

/* --- OPÉRATIONS SUPABASE --- */
async function chargerProjetsUtilisateur() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    afficherNotification(`Erreur de chargement : ${error.message}`, 5000);
    return;
  }

  projets = (data || []).map(mapRowToProject);
  if (projets.length && !projets.some((p) => p.id === projetActifId)) {
    projetActifId = projets[0].id;
  }
  rendreTout();
}

async function sauvegarderEtapesProjet(projet) {
  const { error } = await sb
    .from("projects")
    .update({ steps: projet.etapes })
    .eq("id", projet.id);

  if (error) afficherNotification(`Erreur de sauvegarde : ${error.message}`, 5000);
}

async function supprimerProjet(id) {
  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) {
    afficherNotification(`Impossible de supprimer : ${error.message}`, 5000);
    return;
  }
  projets = projets.filter((p) => p.id !== id);
  projetActifId = projets.length ? projets[0].id : null;
  rendreTout();
  afficherNotification("Projet supprimé.");
}

async function importerExemples() {
  const btn = document.getElementById("seedExamplesBtn");
  btn.disabled = true;
  btn.textContent = "Chargement...";

  const payload = EXEMPLES_E2C.map((ex) => ({
    user_id: currentUser.id,
    name: ex.name,
    start_day: parseISO(ex.start_date).day,
    end_day: parseISO(ex.end_date).day,
    due_date: `${ex.start_date}|${ex.end_date}`,
    owner: ex.owner,
    color: ex.color,
    steps: ex.steps
  }));

  const { data, error } = await sb.from("projects").insert(payload).select();
  btn.disabled = false;
  btn.textContent = "+ Charger 3 projets exemples";

  if (error) {
    afficherNotification(`Erreur d'import : ${error.message}`, 5000);
    return;
  }

  projets = (data || []).map(mapRowToProject);
  projetActifId = projets[0]?.id || null;
  rendreTout();
  afficherNotification("Les 3 projets exemples E2C ont été ajoutés à votre compte.");
}

/* --- FORMULAIRE DE CRÉATION & ÉDITION --- */
function ajouterLigneEtape(dateISO = "", libelle = "", responsable = "", stepId = "", statut = "À faire") {
  const container = document.getElementById("stepRowsContainer");
  const isoVal = dateISO || document.getElementById("projEndDate")?.value || getTodayISO();
  const row = document.createElement("div");
  row.className = "step-row";
  row.dataset.dateIso = isoVal;
  if (stepId) row.dataset.stepId = stepId;
  row.dataset.statut = statut;
  row.innerHTML = `
    <button type="button" class="sr-date-btn" data-date-picker="step" title="Choisir la date sur le calendrier">
      <span class="cal-ico">📅</span>
      <span class="sr-date-label">${formatDateCourt(isoVal)}</span>
    </button>
    <input type="text" class="sr-title" placeholder="Étape à faire en amont..." value="${libelle}" required />
    <input type="text" class="sr-owner" placeholder="Responsable" value="${responsable}" required />
    <button type="button" class="btn-remove" title="Retirer cette étape">✕</button>
  `;
  row.querySelector(".sr-date-btn").addEventListener("click", (e) => {
    ouvrirMiniCalendrier({ type: "step", trigger: e.currentTarget, row });
  });
  row.querySelector(".btn-remove").addEventListener("click", () => {
    if (container.children.length > 1) {
      if (activeDatePicker?.row === row) fermerMiniCalendrier();
      row.remove();
    }
  });
  container.appendChild(row);
}

function reinitialiserDatesFormulaire(baseStartISO) {
  const start = nextJourOuvre(baseStartISO || addJoursOuvres(getTodayISO(), 1));
  const end = addJoursOuvres(start, 4);
  setProjectDateField("start", start);
  setProjectDateField("end", end);
  const container = document.getElementById("stepRowsContainer");
  container.innerHTML = "";
  ajouterLigneEtape(start, "Confirmer participants et intervenants", "Chargé relations entreprises");
  ajouterLigneEtape(addJoursOuvres(end, -2), "Envoyer convocations et consignes", "Chargé d'accompagnement");
  ajouterLigneEtape(end, "Action cible / événement", "Formateur référent");
}

function initFormulaireProjet() {
  reinitialiserDatesFormulaire();

  document.getElementById("addStepRowBtn").addEventListener("click", () => {
    const ownerDefault = document.getElementById("projOwner").value.trim() || "Formateur référent";
    const endIso = document.getElementById("projEndDate").value || getTodayISO();
    ajouterLigneEtape(endIso, "", ownerDefault);
  });

  document.getElementById("seedExamplesBtn").addEventListener("click", importerExemples);

  document.getElementById("addProjectForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const titre = document.getElementById("projTitle").value.trim();
    if (!titre) return;

    const saveBtn = document.getElementById("saveProjectBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Enregistrement...";

    const startDate = document.getElementById("projStartDate").value;
    const endDate = document.getElementById("projEndDate").value;
    const ownerDefault = document.getElementById("projOwner").value.trim() || "Formateur référent";
    const couleur = document.getElementById("projColor").value;

    const rows = [...document.querySelectorAll("#stepRowsContainer .step-row")];
    const etapes = rows
      .map((r, idx) => {
        const dIso = r.dataset.dateIso || endDate;
        return {
          id: r.dataset.stepId || `step-${Date.now()}-${idx}`,
          dateISO: dIso,
          dateLimite: formatDateLong(dIso),
          libelle: r.querySelector(".sr-title").value.trim() || "Étape de préparation",
          responsable: r.querySelector(".sr-owner").value.trim() || ownerDefault,
          statut: r.dataset.statut || "À faire"
        };
      })
      .sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));

    const payloadData = {
      name: titre,
      start_day: parseISO(startDate).day,
      end_day: parseISO(endDate).day,
      due_date: `${startDate}|${endDate}`,
      owner: ownerDefault,
      color: couleur,
      steps: etapes
    };

    if (editingProjectId) {
      const { data, error } = await sb
        .from("projects")
        .update(payloadData)
        .eq("id", editingProjectId)
        .select()
        .single();

      saveBtn.disabled = false;
      saveBtn.textContent = "Enregistrer le projet";

      if (error) {
        afficherNotification(`Erreur lors de la modification : ${error.message}`, 5000);
        return;
      }

      const modifie = mapRowToProject(data);
      projets = projets.map((p) => (p.id === modifie.id ? modifie : p));
      projetActifId = modifie.id;
      fermerModaleProjet();
      rendreTout();
      afficherNotification(`Projet « ${titre} » mis à jour !`);
      return;
    }

    const { data, error } = await sb
      .from("projects")
      .insert({ user_id: currentUser.id, ...payloadData })
      .select()
      .single();

    saveBtn.disabled = false;
    saveBtn.textContent = "Enregistrer le projet";

    if (error) {
      afficherNotification(`Erreur lors de l'enregistrement : ${error.message}`, 5000);
      return;
    }

    const nouveauProjet = mapRowToProject(data);
    projets.push(nouveauProjet);
    projetActifId = nouveauProjet.id;

    const pStart = parseISO(startDate);
    if (pStart) { viewYear = pStart.year; viewMonth = pStart.month; }

    e.target.reset();
    reinitialiserDatesFormulaire(addDaysISO(endDate, 1));
    fermerModaleProjet();
    rendreTout();
    afficherNotification(`Projet « ${titre} » enregistré !`);
  });
}

/* --- GESTION DE L'AUTHENTIFICATION --- */
function setAuthFeedback(message, type = "error") {
  const box = document.getElementById("authFeedback");
  if (!message) { box.hidden = true; return; }
  box.textContent = message;
  box.className = `auth-feedback ${type}`;
  box.hidden = false;
}

function initAuthUI() {
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const submitBtn = document.getElementById("authSubmitBtn");

  tabLogin.addEventListener("click", () => {
    authMode = "login";
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    submitBtn.textContent = "Se connecter";
    setAuthFeedback("");
  });

  tabSignup.addEventListener("click", () => {
    authMode = "signup";
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    submitBtn.textContent = "Créer mon compte";
    setAuthFeedback("");
  });

  function identifiantVersEmailTechnique(identifiant) {
    const slug = identifiant
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, ".")
      .replace(/^\.+|\.+$/g, "");
    return slug ? `${slug}@e2c-app.fr` : "";
  }

  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const identifiant = document.getElementById("authUsername").value.trim();
    const email = identifiantVersEmailTechnique(identifiant);
    const password = document.getElementById("authPassword").value;
    if (!email) {
      setAuthFeedback("Veuillez saisir un identifiant valide (lettres ou chiffres).", "error");
      return;
    }
    submitBtn.disabled = true;
    setAuthFeedback("");

    if (authMode === "signup") {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: identifiant } }
      });
      submitBtn.disabled = false;
      if (error) {
        const msg = error.message.includes("already registered")
          ? "Cet identifiant est déjà utilisé."
          : error.message;
        setAuthFeedback(msg, "error");
        return;
      }
      if (!data.session) setAuthFeedback("Compte créé ! Vous pouvez maintenant vous connecter.", "success");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      submitBtn.disabled = false;
      if (error) setAuthFeedback("Identifiant ou mot de passe incorrect.", "error");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    fermerModaleProjet();
    await sb.auth.signOut();
  });
}

function basculerVueSession(user) {
  currentUser = user;
  const authView = document.getElementById("authView");
  const appView = document.getElementById("appView");

  if (user) {
    authView.hidden = true;
    appView.hidden = false;
    const labelUser = user.user_metadata?.display_name || (user.email || "").split("@")[0];
    document.getElementById("userEmailBadge").textContent = labelUser;
    chargerProjetsUtilisateur();
    activerSynchroTempsReel();
  } else {
    projets = [];
    projetActifId = null;
    appView.hidden = true;
    authView.hidden = false;
  }
}

function diffDaysISO(startIso, endIso) {
  const a = parseISO(startIso);
  const b = parseISO(endIso);
  if (!a || !b) return 0;
  const utcA = Date.UTC(a.year, a.month, a.day);
  const utcB = Date.UTC(b.year, b.month, b.day);
  return Math.round((utcB - utcA) / 86400000);
}

function basculerModeAffichage(mode) {
  activeViewMode = mode === "gantt" ? "gantt" : "calendar";
  const isGantt = activeViewMode === "gantt";

  document.getElementById("calendarViewContainer").hidden = isGantt;
  document.getElementById("calNavControls").hidden = isGantt;
  document.getElementById("ganttViewContainer").hidden = !isGantt;
  document.getElementById("ganttHeaderInfo").hidden = !isGantt;

  document.querySelectorAll("[data-view-switch]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.viewSwitch === activeViewMode);
  });

  if (isGantt) rendreGantt();
}

function initViewSwitcher() {
  document.querySelectorAll("[data-view-switch]").forEach((btn) => {
    btn.addEventListener("click", () => basculerModeAffichage(btn.dataset.viewSwitch));
  });
}

function rendreGantt() {
  const container = document.getElementById("ganttViewContainer");
  if (!container) return;

  if (!projets.length) {
    container.innerHTML = `
      <div class="empty-state">
        Aucun projet à afficher dans le diagramme de Gantt.<br/>
        Cliquez sur <strong>+ Nouveau projet</strong> pour créer votre premier rétroplanning.
      </div>
    `;
    return;
  }

  const todayISO = getTodayISO();
  let minISO = projets[0].startDate;
  let maxISO = projets[0].endDate;
  projets.forEach((p) => {
    if (p.startDate < minISO) minISO = p.startDate;
    if (p.endDate > maxISO) maxISO = p.endDate;
    p.etapes.forEach((e) => {
      if (e.dateISO && e.dateISO < minISO) minISO = e.dateISO;
      if (e.dateISO && e.dateISO > maxISO) maxISO = e.dateISO;
    });
  });

  const rangeStart = addDaysISO(minISO, -2);
  const rangeEnd = addDaysISO(maxISO, 3);
  const days = [];
  let cursor = rangeStart;
  let safety = 0;
  while ((cursor <= rangeEnd || days.length < 15) && safety < 500) {
    if (isJourOuvre(cursor)) days.push(cursor);
    cursor = addDaysISO(cursor, 1);
    safety++;
  }
  const totalDays = days.length;

  const findWorkIdx = (iso) => {
    const idx = days.findIndex((d) => d >= iso);
    return idx === -1 ? totalDays - 1 : idx;
  };
  const findWorkEndIdx = (iso) => {
    let found = 0;
    for (let i = 0; i < totalDays; i++) {
      if (days[i] <= iso) found = i;
      else break;
    }
    return found;
  };

  const monthSegments = [];
  days.forEach((iso) => {
    const p = parseISO(iso);
    const label = `${MOIS_COURTS_FR[p.month]} ${p.year}`;
    const last = monthSegments[monthSegments.length - 1];
    if (last && last.label === label) last.span++;
    else monthSegments.push({ label, span: 1 });
  });

  const availWidth = Math.max(760, (container.clientWidth || 920) - 4);
  const colWidth = Math.max(36, Math.floor(availWidth / totalDays));
  const boardWidth = Math.max(availWidth, totalDays * colWidth);
  const gridTemplate = `repeat(${totalDays}, ${colWidth}px)`;

  const monthsHtml = monthSegments
    .map((seg) => `<div class="gantt-month-cell" style="grid-column: span ${seg.span}">${seg.label}</div>`)
    .join("");

  const daysHtml = days
    .map((iso) => {
      const p = parseISO(iso);
      const cls = ["gantt-day-cell", iso === todayISO ? "is-today" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}" title="${formatDateLong(iso)} (jour ouvré)">${p.day}</div>`;
    })
    .join("");

  const bgColsHtml = days
    .map((iso) => {
      const cls = ["gantt-grid-col", iso === todayISO ? "is-today" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}"></div>`;
    })
    .join("");

  const actif = getProjetActif();
  const rowsHtml = [];

  projets.forEach((p) => {
    const startIdx = findWorkIdx(p.startDate);
    const endIdx = Math.max(startIdx, findWorkEndIdx(p.endDate));
    const spanCols = Math.max(1, endIdx - startIdx + 1);
    const leftPx = startIdx * colWidth + 3;
    const widthPx = spanCols * colWidth - 6;
    const nbOuvres = countJoursOuvres(p.startDate, p.endDate);
    const faites = p.etapes.filter((e) => e.statut === "Fait").length;
    const pct = p.etapes.length ? Math.round((faites / p.etapes.length) * 100) : 0;
    const txtColor = couleurTexteSurRepere(p.couleur);
    const isSelected = actif && p.id === actif.id;

    rowsHtml.push(`
      <div class="gantt-row">
        <button type="button" class="gantt-bar ${isSelected ? "is-selected" : ""}" data-gantt-pid="${p.id}" style="margin-left:${leftPx}px;width:${widthPx}px;background:${p.couleur};color:${txtColor}" title="${p.titre} — ${nbOuvres} j. ouvrés (${pct}%)">
          <span class="gantt-bar-label">${p.titre} (${nbOuvres}j)</span>
          <span class="gantt-bar-pct">${pct}%</span>
        </button>
      </div>
    `);

    if (isSelected && p.etapes.length) {
      const etapesTriees = [...p.etapes].sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
      let prevEndIdx = startIdx;
      etapesTriees.forEach((e) => {
        const targetISO = e.dateISO || p.endDate;
        const stepEndIdx = findWorkEndIdx(targetISO);
        const stepStartIdx = Math.max(startIdx, Math.min(stepEndIdx, prevEndIdx));
        const stepSpan = Math.max(1, stepEndIdx - stepStartIdx + 1);
        const sLeft = stepStartIdx * colWidth + 4;
        const sWidth = Math.max(24, stepSpan * colWidth - 8);
        const isDone = e.statut === "Fait";
        const stepPct = isDone ? "100%" : e.statut === "En cours" ? "50%" : "0%";
        const accent = couleurAccentTexte(p.couleur);
        prevEndIdx = stepEndIdx;

        rowsHtml.push(`
          <div class="gantt-row is-step-row">
            <div class="gantt-step-wrap" style="margin-left:${sLeft}px">
              <div class="gantt-step-bar ${isDone ? "is-done" : ""}" style="width:${sWidth}px;background:${p.couleur}22;color:${accent};border-color:${p.couleur}66" title="${e.libelle} — ${e.statut}">
                <span class="gantt-bar-pct">${stepPct}</span>
              </div>
              <span class="gantt-step-ext-label ${isDone ? "is-done" : ""}" style="color:${accent}">↳ ${e.libelle}</span>
            </div>
          </div>
        `);
      });
    }
  });

  const legendHtml = projets
    .map((p) => {
      const faites = p.etapes.filter((e) => e.statut === "Fait").length;
      const pct = p.etapes.length ? Math.round((faites / p.etapes.length) * 100) : 0;
      return `<button type="button" class="gantt-legend-item" data-gantt-pid="${p.id}" style="background:${p.couleur};color:${couleurTexteSurRepere(p.couleur)}"><span>${p.titre}</span><strong>${pct}%</strong></button>`;
    })
    .join("");

  container.innerHTML = `
    <div class="gantt-scroll">
      <div class="gantt-board" style="width:${boardWidth}px">
        <div class="gantt-months-row" style="grid-template-columns:${gridTemplate}">${monthsHtml}</div>
        <div class="gantt-days-row" style="grid-template-columns:${gridTemplate}">${daysHtml}</div>
        <div class="gantt-rows">
          <div class="gantt-grid-bg" style="grid-template-columns:${gridTemplate}">${bgColsHtml}</div>
          ${rowsHtml.join("")}
        </div>
      </div>
    </div>
    <div class="gantt-legend">${legendHtml}</div>
  `;

  container.querySelectorAll("[data-gantt-pid]").forEach((el) => {
    el.addEventListener("click", () => choisirProjet(el.dataset.ganttPid, false));
  });
}

function activerSynchroTempsReel() {
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (!currentUser) return;

  realtimeChannel = sb
    .channel("projects-realtime-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "projects" },
      () => {
        chargerProjetsUtilisateur();
      }
    )
    .subscribe();
}

function rendreTout() {
  rendreBadgeProjet();
  rendreCalendrier();
  if (activeViewMode === "gantt") rendreGantt();
  rendrePanneau();
}

document.addEventListener("DOMContentLoaded", async () => {
  initAuthUI();
  initViewSwitcher();
  initNavigationCalendrier();
  initModalePartage();
  initMiniCalendrier();
  initModale();
  initFormulaireProjet();

  const { data } = await sb.auth.getSession();
  basculerVueSession(data.session?.user || null);

  sb.auth.onAuthStateChange((_event, session) => {
    basculerVueSession(session?.user || null);
  });
});
