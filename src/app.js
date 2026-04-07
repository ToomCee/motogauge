import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────
const COLORS = {
  bg: "#0a0a0f", bgCard: "#12121a", bgCardHover: "#1a1a25", border: "#2a2a3a",
  primary: "#ff6b00", primaryLight: "#ff8c33", cyan: "#4ecdc4", red: "#ff3b30",
  purple: "#9b59b6", white: "#ffffff", gray: "#8a8a9a", grayDark: "#4a4a5a",
  grayDarker: "#2a2a3a", crashRed: "#ff1744",
};

const COUNTER_TYPES = ["section", "daily", "trip", "yearly"];
const COUNTER_LABELS = { yearly: "Roční", trip: "Výlet", daily: "Denní", section: "Úsek" };
const COUNTER_COLORS = { yearly: COLORS.primary, trip: COLORS.primary, daily: COLORS.primary, section: COLORS.primaryLight };
const CRASH_THRESHOLD = 50;


// Configurable cell options for HUD and dashboard row
const CELL_OPTIONS = [
  { id: "speed", label: "Rychlost", unit: "km/h", color: COLORS.primary },
  { id: "maxSpeed", label: "Max rychlost/1min", sub: "1 min", unit: "km/h", color: COLORS.red },
  { id: "altitude", label: "Nadm. výška", unit: "m", color: COLORS.primary },
  { id: "maxAltDaily", label: "Max výška/den", unit: "m", color: COLORS.primary },
  { id: "minAltDaily", label: "Min výška/den", unit: "m", color: COLORS.primary },
  { id: "distSection", label: "Vzdál. úsek", color: COLORS.primaryLight },
  { id: "distDaily", label: "Vzdál. den", color: COLORS.purple },
  { id: "distTrip", label: "Vzdál. výlet", color: COLORS.primary },
  { id: "clock", label: "Čas", color: COLORS.white },
  { id: "timezone", label: "Čas. pásmo", color: COLORS.white },
  { id: "accel", label: "0→100", unit: "s", color: COLORS.red },
  { id: "accel0_60", label: "0→60", unit: "s", color: COLORS.red },
  { id: "accel0_130", label: "0→130", unit: "s", color: COLORS.red },
  { id: "accel0_200", label: "0→200", unit: "s", color: COLORS.red },
  { id: "accel60_120", label: "60→120", unit: "s", color: COLORS.red },
  { id: "accel100_200", label: "100→200", unit: "s", color: COLORS.red },
  { id: "sunset", label: "Do západu", color: COLORS.primary },
  { id: "sunsetTime", label: "Západ slunce", color: COLORS.primary },
  { id: "sunriseCountdown", label: "Do svítání", color: COLORS.primary },
  { id: "sunriseTime", label: "Svítání", color: COLORS.primary },
  { id: "homeTime", label: "Čas doma", color: COLORS.white },
  { id: "travelTime", label: "Místní čas", color: COLORS.primary },
  { id: "empty", label: "—", color: COLORS.white },
  { id: "segment", label: "Segment", color: COLORS.primary },
];
// Slot 1 (top): clock only — no picker
// Slot 2 (middle): sunset default, picker: sunset, homeTime, travelTime
// Slot 3 (bottom): accel variants
const SLOT2_IDS = ["sunset", "sunsetTime", "sunriseCountdown", "sunriseTime"];
const DEFAULT_DASH_CELLS = ["clock", "segment", "accel"];

// Accel range definitions: startSpeed, endSpeed
const ACCEL_RANGES = {
  accel: [0, 100], accel0_60: [0, 60], accel0_130: [0, 130], accel0_200: [0, 200],
  accel60_120: [60, 120], accel100_200: [100, 200],
};

const loadCellConfig = (key, defaults) => {
  try {
    const r = localStorage.getItem(key);
    if (r) {
      const p = JSON.parse(r);
      // Pad with defaults if stored config is shorter, trim if longer
      const result = defaults.map((def, i) => p[i] !== undefined ? p[i] : def);
      return result;
    }
  } catch (e) {}
  return [...defaults];
};
const saveCellConfig = (key, cfg) => { try { localStorage.setItem(key, JSON.stringify(cfg)); } catch (e) {} };


const TRIVIA_FAREWELLS = [
  "Odcházím jako Rossi z Yamahy. S gustem.",
  "Bye! Tvůj gyroskop na mě nezapomene.",
  "Čau! Aspoň víš, co je chicken strips. Nebo víš?",
];
const REACTIONS_GOOD = [
  "Přesně! Rossi by tleskal.",
  "Správně. Jsi génius. Nebo Google.",
  "Jo! Máš to v hlavě jak Marquez zatáčky.",
  "Výborně. Kawasaki by tě vzala.",
  "Správně! ABS tvého mozku funguje.",
  "Perfektní. Marc Marquez se bojí.",
  "Správně. Na Isle of Man by tě rozuměli.",
  "Jo! Takhle mluví jezdci po závodě.",
];
const MOTO_TRIVIA = [
  { q: "Jaká je nejrychlejší sériová motorka na světě?", a: "Kawasaki Ninja H2R — přes 400 km/h. Tvůj skútr se snaží." },
  { q: "Kolik váží MotoGP stroj?", a: "Minimálně 157 kg. To je asi jako ty po vánoční večeři." },
  { q: "Kdo má nejvíc titulů v MotoGP?", a: "Giacomo Agostini — 15 titulů. A ty máš problém zaparkovat." },
  { q: "Kdy byla vyrobena první motorka?", a: "1885, Gottlieb Daimler. Měla dřevěný rám. A žádný ABS." },
  { q: "Jaký úhel náklonu dosahují jezdci v MotoGP?", a: "Až 64°! Pokud se ti to podaří, pošli video. Nebo záchranka." },
  { q: "Kolik G zažívá jezdec při brzdění v MotoGP?", a: "Až 1.5G. To je jako kdyby ti na hrudi seděl tvůj kámoš." },
  { q: "Jaká motorka se prodala nejvíc v historii?", a: "Honda Super Cub — přes 100 milionů kusů. Legenda." },
  { q: "Co znamená 'highside'?", a: "Zadní kolo chytne grip a vycvakne tě jak z katapultu. Zábava pro diváky." },
  { q: "Kdo vynalezl ABS pro motorky?", a: "BMW v roce 1988. Od té doby méně líbání asfaltu." },
  { q: "Kolik stojí motor z MotoGP?", a: "Kolem 2 milionů euro. Za to bys mohl mít 40 Octavií." },
  { q: "Jaká je maximální rychlost na Isle of Man TT?", a: "Přes 330 km/h. Na veřejných silnicích. S kamennými zdmi po stranách." },
  { q: "Co je to 'tank slapper'?", a: "Řídítka se nekontrolovatelně třesou. Říká se tomu i 'death wobble'. Fun times." },
  { q: "Proč mají závodní motorky číslo 46?", a: "Valentino Rossi. Devět titulů mistra světa. GOAT motocyklového sportu." },
  { q: "Proč motorkáři zdraví levou rukou?", a: "Pravá drží plyn a brzdu. Zdravit pravou = buď hrdina, nebo idiot." },
  { q: "Kolik HP má MotoGP stroj?", a: "Přes 280 HP při 160 kg. Víc než většina supersportů na čtyřech kolech." },
  { q: "Co je 'chicken strips'?", a: "Nepoužitý okraj pneumatiky. Čím užší, tím víc nakláníš. Nebo tím víc lžeš." },
  { q: "Co je to lowside?", a: "Přední nebo zadní kolo ztratí grip a motorka ti ujede pod tebou. Klasika v dešti." },
  { q: "Co je to countersteering?", a: "Tlačíš řídítka doprava, jedeš doleva. Fyzika je divná, ale funguje to." },
  { q: "Jaký je nejstarší moto závod na světě?", a: "Isle of Man TT, od roku 1907. Přes 260 jezdců tam zahynulo. A pořád se jezdí." },
  { q: "Co je to slipper clutch?", a: "Prokluzová spojka. Při řazení dolů zabrání zablokování zadního kola. Tvoje kolena děkují." },
  { q: "Co je to quickshifter?", a: "Řadíš bez spojky a bez zavření plynu. Jako v F1, ale na dvou kolech." },
  { q: "Co je to traction control?", a: "Elektronika hlídá prokluz zadního kola. Zachrání ti život 10x denně a ty o tom nevíš." },
  { q: "Co je to stoppie?", a: "Jízda na předním kole. Opak wheelie. Efektní, ale riskantní." },
  { q: "Co je to launch control?", a: "Elektronický systém pro optimální start. Držíš plyn naplno, elektronika řeší zbytek." },
  { q: "Jaký je nejdelší moto trip v historii?", a: "Emilio Scotto: 10 let, 735 000 km. Na jedné Honda Gold Wing. Legenda." },
  { q: "Co je to burnout?", a: "Stojíš na místě a točíš zadním kolem. Dým, pach, sousedé volají policii." },
  { q: "Co je to wheelie control?", a: "Elektronika, která brání motorce v přetočení přes zadek. Nudné, ale praktické." },
  { q: "Proč jsou LED světla na motorce lepší?", a: "Jasnější, menší spotřeba, delší životnost. A vypadáš futuristicky." },
  { q: "Co je to shaft drive?", a: "Pohon kardanem místo řetězu. Žádné mazání, žádné napínání. BMW a Moto Guzzi klasika." },
  { q: "Co je to V-twin?", a: "Dvouválcový motor ve tvaru V. Harley, Ducati, Indian. Charakteristický zvuk." },
];

const COUNTER_COMMENTS = {
  yearly: ["Celý rok na dvou kolech. Tvá pojišťovna pláče.", "365 dní příležitostí líbat asfalt.", "Roční přehled: benzín, vítr a pár nadávek řidičům.", "Další rok, další tisíce km v helmě. Kdo potřebuje účes?"],
  trip: ["Na výletě se počítá každý kilometr. A každá pumpa.", "Výlet = svoboda + bolavý zadek.", "Kam vítr, tam cesta. Kam benzín, tam pumpa.", "Pamatuj: GPS je jen návrh, ne příkaz."],
  daily: ["Denní dávka adrenalinu splněna.", "Dnešek: motorka 1, auto 0.", "Zase jsi přežil. Gratulace!", "Denní report: zero spadnutí = dobrý den."],
  section: ["Úsek jako ze závodní tratě. Nebo spíš z okresky.", "Tento úsek sponzoruje tvoje kolena.", "Měříš úsek? Někdo tu bere motorku vážně.", "Úsek dokončen. Pneumatiky děkují za přestávku."],
};

const getCrashComment = (count) => {
  if (count === 0) return "Nula pádů. Buď jezdíš opatrně, nebo máš vypnutý gyroskop.";
  if (count === 1) return "Jeden pád. Stává se i nejlepším. Hlavně nikomu neříkej.";
  if (count <= 3) return "Pár pádů. Říká se, že kdo nespadne, nejezdí. Tak jedeš!";
  if (count <= 5) return "Docela padáš. Zvažoval jsi tříkolku?";
  return "Mistře pádů, tvoje pojišťovna ti posílá vánoční přání.";
};

// ─── HELPERS ─────────────────────────────────────────────
const formatSpeed = (v) => Math.round(v || 0);
const formatDist = (m) => { if (m < 1000) return `${Math.round(m)} m`; return `${(m / 1000).toFixed(1)} km`; };
const formatTime = (ms) => {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`; if (m > 0) return `${m}m ${sec}s`; return `${sec}s`;
};
const formatTimeHM = (ms) => {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
};
const formatAccel = (ms) => ms ? `${(ms / 1000).toFixed(1)}s` : "—";
const formatAlt = (a) => a !== null && a !== undefined ? `${Math.round(a)} m` : "—";
const formatLean = (a) => a !== null && a !== undefined ? `${Math.round(Math.abs(a))}°` : "—";
const formatGps = (pos) => { if (!pos) return "—"; return `${pos[0].toFixed(4)}, ${pos[1].toFixed(4)}`; };
const T = () => Date.now();
const msToKmh = (ms) => (ms || 0) * 3.6;

// ─── LEAN CALIBRATION ────────────────────────────────────
const loadLeanCalibration = () => { try { const v = localStorage.getItem("motogauge_lean_offset"); return v ? parseFloat(v) : 0; } catch (e) { return 0; } };

// ─── SUNSET CALCULATOR ──────────────────────────────────
const getSunsetTime = (lat, lng) => {
  // Simplified sunset calculation (accuracy ~5 min)
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const zenith = 90.833;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const lngHour = lng / 15;
  const t = dayOfYear + ((18 - lngHour) / 24);
  const M = (0.9856 * t) - 3.289;
  let L = M + (1.916 * Math.sin(M * D2R)) + (0.020 * Math.sin(2 * M * D2R)) + 282.634;
  L = ((L % 360) + 360) % 360;
  let RA = R2D * Math.atan(0.91764 * Math.tan(L * D2R));
  RA = ((RA % 360) + 360) % 360;
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(L * D2R);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * D2R) - (sinDec * Math.sin(lat * D2R))) / (cosDec * Math.cos(lat * D2R));
  if (cosH > 1 || cosH < -1) return null; // no sunset
  const H = R2D * Math.acos(cosH) / 15;
  const T = H + RA - (0.06571 * t) - 6.622;
  let UT = ((T - lngHour) % 24 + 24) % 24;
  // Convert to local time
  const offsetHours = -now.getTimezoneOffset() / 60;
  let local = UT + offsetHours;
  if (local < 0) local += 24;
  if (local >= 24) local -= 24;
  const h = Math.floor(local);
  const m = Math.round((local - h) * 60);
  const sunset = new Date(now);
  sunset.setHours(h, m, 0, 0);
  return sunset;
};

const formatSunsetCountdown = (lat, lng) => {
  if (!lat || !lng) return "—";
  const sunset = getSunsetTime(lat, lng);
  if (!sunset) return "—";
  return `${String(sunset.getHours()).padStart(2,"0")}:${String(sunset.getMinutes()).padStart(2,"0")}`;
};

const getSunriseTime = (lat, lng) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const zenith = 90.833;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const lngHour = lng / 15;
  const t = dayOfYear + ((6 - lngHour) / 24); // sunrise uses 6 instead of 18
  const M = (0.9856 * t) - 3.289;
  let L = M + (1.916 * Math.sin(M * D2R)) + (0.020 * Math.sin(2 * M * D2R)) + 282.634;
  L = ((L % 360) + 360) % 360;
  let RA = R2D * Math.atan(0.91764 * Math.tan(L * D2R));
  RA = ((RA % 360) + 360) % 360;
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(L * D2R);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * D2R) - (sinDec * Math.sin(lat * D2R))) / (cosDec * Math.cos(lat * D2R));
  if (cosH > 1 || cosH < -1) return null;
  const H = (360 - R2D * Math.acos(cosH)) / 15; // sunrise: 360 - acos
  const T = H + RA - (0.06571 * t) - 6.622;
  let UT = ((T - lngHour) % 24 + 24) % 24;
  const offsetHours = -now.getTimezoneOffset() / 60;
  let local = UT + offsetHours;
  if (local < 0) local += 24;
  if (local >= 24) local -= 24;
  const h = Math.floor(local);
  const m = Math.round((local - h) * 60);
  const sunrise = new Date(now);
  sunrise.setHours(h, m, 0, 0);
  return sunrise;
};

const formatHHMM = (d) => d ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` : "—";
const formatCountdownHHMM = (target) => {
  if (!target) return "—";
  const diff = target - new Date();
  if (diff < 0) return formatHHMM(target);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}:${String(m).padStart(2,"0")}`;
};

const saveLeanCalibration = (offset) => { try { localStorage.setItem("motogauge_lean_offset", String(offset)); } catch (e) {} };

// ─── AUTO-CALIBRATION CONFIG ────────────────────────────
const AUTO_CALIB_STABLE_MS = 3000;
const AUTO_CALIB_VARIANCE_THRESHOLD = 2;

// ─── REVERSE GEOCODING (Nominatim OSM) ─────────────────
const geoCache = {}; // "lat,lng" → "city name"
const reverseGeocode = async (lat, lng) => {
  // Round to ~100m precision for caching
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geoCache[key]) return geoCache[key];
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`, {
      headers: { "Accept-Language": "cs", "User-Agent": "MotoGauge/1.0" }
    });
    if (r.status === 429) {
      const retryAfter = parseInt(r.headers.get("Retry-After") || "60", 10);
      return { blocked: true, retryAfter };
    }
    if (!r.ok) return null;
    const d = await r.json();
    const a = d.address || {};
    const name = a.city || a.town || a.village || a.municipality || a.county || d.display_name?.split(",")[0] || null;
    if (name) geoCache[key] = name;
    return name;
  } catch (e) { return null; }
};
// ─── SEGMENT STORAGE & HELPERS ──────────────────────────
const SEG_STORAGE_KEY = "motogauge_segments";
const SEG_ACTIVE_KEY = "motogauge_active_segment";
const SEG_DETECT_RADIUS = 60;   // metres — auto-start průjezdu
const SEG_FINISH_RADIUS = 40;   // metres — auto-stop průjezdu
const SEG_MAX = 20;

const gpsDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const loadSegments = () => {
  try { const r = localStorage.getItem(SEG_STORAGE_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; }
};
const saveSegments = (segs) => {
  try { localStorage.setItem(SEG_STORAGE_KEY, JSON.stringify(segs)); } catch(e) {}
};
const loadActiveSegId = () => {
  try { return localStorage.getItem(SEG_ACTIVE_KEY) || null; } catch(e) { return null; }
};
const saveActiveSegId = (id) => {
  try { if (id) localStorage.setItem(SEG_ACTIVE_KEY, id); else localStorage.removeItem(SEG_ACTIVE_KEY); } catch(e) {}
};

const createSegment = (startLat, startLng, name) => ({
  id: `seg_${Date.now()}`,
  name,
  startLat, startLng,
  endLat: null, endLng: null,
  pr: null,           // ms — personal record
  history: [],        // [{time, date, temp, weather, delta}]
  route: [],          // [{lat, lng}] — GPS body trasy
  distanceKm: null,   // délka segmentu v km
  createdAt: Date.now(),
});

// ─── LOCALSTORAGE WITH QUOTA HANDLING ───────────────────
const safeSave = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22) {
      // Try to free space: remove oldest snapshots from all counter types
      try {
        COUNTER_TYPES.forEach(ty => {
          const sk = `motogauge_snapshots_${ty}`;
          const snaps = JSON.parse(localStorage.getItem(sk) || "[]");
          if (snaps.length > 5) {
            localStorage.setItem(sk, JSON.stringify(snaps.slice(-5)));
          }
        });
        // Retry
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e2) { return false; }
    }
    return false;
  }
};

const getStorageKey = (type) => `motogauge_counter_${type}`;
const getSessionKey = (type) => `motogauge_session_${type}`;
const loadCounter = (type) => {
  const normalize = (d) => {
    if (!d) return null;
    if (!d.crashes) d.crashes = []; if (!d.crashCount) d.crashCount = 0; if (!d.rideCount) d.rideCount = 0;
    if (!d.maxLeanLeft) d.maxLeanLeft = 0; if (!d.maxLeanRight) d.maxLeanRight = 0;
    if (!d.maxDistFromStart) d.maxDistFromStart = 0; if (!d.ascent) d.ascent = 0; if (!d.descent) d.descent = 0;
    if (d.lastAlt === undefined) d.lastAlt = null; if (!d.speedSum) d.speedSum = 0; if (!d.speedCount) d.speedCount = 0;
    if (!d.endPos) d.endPos = null; if (!d.maxSpeed) d.maxSpeed = 0;
    if (!d.startLabel) d.startLabel = ""; if (!d.endLabel) d.endLabel = "";
    return d;
  };
  let ls = null, ss = null;
  try { const r = localStorage.getItem(getStorageKey(type)); if (r) ls = JSON.parse(r); } catch (e) {}
  try { const r = sessionStorage.getItem(getSessionKey(type)); if (r) ss = JSON.parse(r); } catch (e) {}
  // Use whichever has more distance (fresher data) — protects against localStorage quota failures
  if (ls && ss) return normalize(ss.distance >= ls.distance ? ss : ls);
  if (ls) return normalize(ls);
  if (ss) return normalize(ss);
  return createEmptyCounter(type);
};
const saveCounter = (type, data) => {
  safeSave(getStorageKey(type), data);
  try { sessionStorage.setItem(getSessionKey(type), JSON.stringify(data)); } catch (e) {}
};

// ─── COUNTER SNAPSHOT HISTORY ────────────────────────────
const getSnapshotKey = (type) => `motogauge_snapshots_${type}`;
const loadSnapshots = (type) => {
  try { const r = localStorage.getItem(getSnapshotKey(type)); if (r) return JSON.parse(r); } catch (e) {}
  return [];
};
const saveSnapshot = (type, counter) => {
  // Only save if counter has meaningful data (distance > 10m or time > 60s)
  if (counter.distance < 10 && counter.time < 60000) return;
  const snap = {
    date: counter.startedAt, endDate: T(),
    distance: counter.distance, time: counter.time,
    minAlt: counter.minAlt, maxAlt: counter.maxAlt,
    ascent: counter.ascent || 0, descent: counter.descent || 0,
    bestAccel: counter.bestAccel, maxSpeed: counter.maxSpeed || 0,
    speedSum: counter.speedSum || 0, speedCount: counter.speedCount || 0,
    maxLeanLeft: counter.maxLeanLeft || 0, maxLeanRight: counter.maxLeanRight || 0,
    crashCount: counter.crashCount || 0,
    startPos: counter.startPos, endPos: counter.endPos,
    startLabel: counter.startLabel || "", endLabel: counter.endLabel || "",
    rideCount: counter.rideCount || 0,
  };
  const hist = loadSnapshots(type);
  hist.push(snap);
  // Keep last 20
  const trimmed = hist.slice(-20);
  safeSave(getSnapshotKey(type), trimmed);
};
const createEmptyCounter = (type) => ({
  type, distance: 0, time: 0, startedAt: T(),
  minAlt: null, maxAlt: null, minAltPos: null, maxAltPos: null,
  bestAccel: null, bestAccelPos: null, maxLean: 0, maxLeanPos: null,
  maxLeanLeft: 0, maxLeanRight: 0, maxSpeed: 0,
  crashCount: 0, crashes: [], track: [], lastUpdate: T(),
  rideCount: 0, maxDistFromStart: 0, maxDistFromStartPos: null, startPos: null, endPos: null,
  startLabel: "", endLabel: "",
  ascent: 0, descent: 0, lastAlt: null,
  speedSum: 0, speedCount: 0,
});
const loadAccelHistory = () => { try { const r = localStorage.getItem("motogauge_accel_history"); if (r) return JSON.parse(r); } catch (e) {} return []; };
const saveAccelHistory = (h) => { try { localStorage.setItem("motogauge_accel_history", JSON.stringify(h.slice(-10))); } catch (e) {} };
const loadStopwatchHistory = () => { try { const r = localStorage.getItem("motogauge_stopwatch"); if (r) return JSON.parse(r); } catch (e) {} return []; };
const saveStopwatchHistory = (h) => { try { localStorage.setItem("motogauge_stopwatch", JSON.stringify(h.slice(-10))); } catch (e) {} };

// ─── MOTO ENGLISH — 100 flashcards ──────────────────────
const MOTO_ENGLISH = [
  { en: "helmet", cz: "helma" },
  { en: "visor", cz: "plexi / hledí" },
  { en: "gloves", cz: "rukavice" },
  { en: "jacket", cz: "bunda" },
  { en: "boots", cz: "boty" },
  { en: "throttle", cz: "plyn" },
  { en: "clutch", cz: "spojka" },
  { en: "brake", cz: "brzda" },
  { en: "front brake", cz: "přední brzda" },
  { en: "rear brake", cz: "zadní brzda" },
  { en: "gear / shift", cz: "řadicí páka / rychlost" },
  { en: "neutral", cz: "neutrál" },
  { en: "handlebar", cz: "řídítka" },
  { en: "mirror", cz: "zrcátko" },
  { en: "turn signal", cz: "blinkr" },
  { en: "exhaust", cz: "výfuk" },
  { en: "fuel tank", cz: "nádrž" },
  { en: "gas station", cz: "benzínka / pumpa" },
  { en: "chain", cz: "řetěz" },
  { en: "tire / tyre", cz: "pneumatika" },
  { en: "flat tire", cz: "prázdná pneumatika" },
  { en: "tire pressure", cz: "tlak v pneumatice" },
  { en: "suspension", cz: "pérování" },
  { en: "fork", cz: "přední vidlice" },
  { en: "seat", cz: "sedlo" },
  { en: "fairing", cz: "kapotáž" },
  { en: "engine", cz: "motor" },
  { en: "horsepower", cz: "koňská síla" },
  { en: "torque", cz: "točivý moment" },
  { en: "RPM / revs", cz: "otáčky" },
  { en: "top speed", cz: "maximální rychlost" },
  { en: "lean angle", cz: "úhel náklonu" },
  { en: "countersteering", cz: "protiřízení" },
  { en: "ABS", cz: "antiblokovací systém" },
  { en: "traction control", cz: "kontrola trakce" },
  { en: "quickshifter", cz: "rychlořazení" },
  { en: "slipper clutch", cz: "prokluzová spojka" },
  { en: "wheelie", cz: "jízda na zadním" },
  { en: "highside", cz: "přehoz přes motorku" },
  { en: "lowside", cz: "pád na stranu" },
  { en: "hairpin turn", cz: "ostrá zatáčka / vlásenka" },
  { en: "overtaking", cz: "předjíždění" },
  { en: "road trip", cz: "výlet na motorce" },
  { en: "breakdown", cz: "porucha" },
  { en: "insurance", cz: "pojištění" },
];


// ─── TRACK MAP SVG ───────────────────────────────────────
function TrackMap({ track, markers, crashes, height = 220 }) {
  if (!track || track.length < 2) return <div style={{ color: COLORS.white, textAlign: "center", padding: 30, fontSize: 17, fontFamily: "Rajdhani, sans-serif" }}>Žádná trasa k zobrazení</div>;
  const lats = track.map(p => p[0]), lngs = track.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 24, w = 320;
  const rangeX = maxLng - minLng || 0.001, rangeY = maxLat - minLat || 0.001;
  const sc = Math.min((w - pad * 2) / rangeX, (height - pad * 2) / rangeY);
  const toX = (lng) => pad + (lng - minLng) * sc, toY = (lat) => height - pad - (lat - minLat) * sc;
  const points = track.map(p => `${toX(p[1])},${toY(p[0])}`).join(" ");
  const mS = { maxAlt: "MAX", minAlt: "MIN", bestAccel: "ACC", maxLean: "LN" };
  const mC = { maxAlt: COLORS.primary, minAlt: COLORS.primary, bestAccel: COLORS.red, maxLean: COLORS.purple };
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", background: COLORS.bg, borderRadius: 12 }}>
      <polyline points={points} fill="none" stroke={COLORS.primary} strokeWidth="2.5" strokeLinejoin="round" opacity="0.8" />
      {markers && Object.entries(markers).map(([k, pos]) => pos && (
        <g key={k}><circle cx={toX(pos[1])} cy={toY(pos[0])} r="10" fill={mC[k]} opacity="0.25" />
          <text x={toX(pos[1])} y={toY(pos[0]) + 5} fill={mC[k]} fontSize="12" textAnchor="middle" fontWeight="bold">{mS[k]}</text></g>
      ))}
      {crashes && crashes.map((c, i) => c.pos && (
        <g key={`cr-${i}`}><circle cx={toX(c.pos[1])} cy={toY(c.pos[0])} r="10" fill={COLORS.crashRed} opacity="0.3" />
          <text x={toX(c.pos[1])} y={toY(c.pos[0]) + 5} fill={COLORS.crashRed} fontSize="10" textAnchor="middle" fontWeight="bold">!</text></g>
      ))}
    </svg>
  );
}

// ─── COUNTER BAR CHART ──────────────────────────────────
function CounterBarChart({ items, metrics, color }) {
  const [metricIdx, setMetricIdx] = useState(0);
  const metric = metrics[metricIdx];
  const values = items.map(d => metric.get(d));
  const maxVal = Math.max(...values, 0.01);

  const W = 320, H = 160, padL = 40, padR = 10, padT = 10, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.min(30, (chartW / Math.max(items.length, 1)) * 0.7);
  const gap = items.length > 1 ? Math.max(0, (chartW - barW * items.length) / (items.length - 1)) : 0;

  return (
    <div style={{ marginTop: 12, background: COLORS.bgCard, borderRadius: 12, padding: "10px 8px", border: `1px solid ${COLORS.border}` }}>
      {/* Metric selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        {metrics.map((m, i) => (
          <button key={m.id} onClick={() => setMetricIdx(i)}
            style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 17, fontWeight: 700,
              fontFamily: "Rajdhani, sans-serif", cursor: "pointer", border: "none",
              background: i === metricIdx ? color : COLORS.bg,
              color: i === metricIdx ? COLORS.white : COLORS.white,
              opacity: i === metricIdx ? 1 : 0.5,
            }}>{m.label}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        {/* Y axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = padT + chartH * (1 - f);
          const val = (maxVal * f);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={COLORS.border} strokeWidth="0.5" />
              <text x={padL - 4} y={y + 4} fill={COLORS.white} fontSize="9" textAnchor="end" fontFamily="Rajdhani, sans-serif">
                {val >= 100 ? Math.round(val) : val >= 10 ? val.toFixed(0) : val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {items.map((d, i) => {
          const v = metric.get(d);
          const barH = maxVal > 0 ? (v / maxVal) * chartH : 0;
          const x = padL + i * (barW + gap);
          const y = padT + chartH - barH;
          const isLast = i === items.length - 1;
          const dateStr = d.date.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(barH, 1)} rx={3}
                fill={isLast ? color : `${color}88`} />
              {/* Value on top */}
              {barH > 14 && (
                <text x={x + barW / 2} y={y - 3} fill={COLORS.white} fontSize="9" textAnchor="middle" fontFamily="Rajdhani, sans-serif" fontWeight="700">
                  {v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1)}
                </text>
              )}
              {/* Date label */}
              <text x={x + barW / 2} y={H - padB + 12} fill={isLast ? COLORS.white : COLORS.grayDark} fontSize="8" textAnchor="middle" fontFamily="Rajdhani, sans-serif" fontWeight={isLast ? "700" : "400"}>
                {dateStr}
              </text>
            </g>
          );
        })}
        {/* Unit label */}
        <text x={W - padR} y={padT + 10} fill={COLORS.white} fontSize="9" textAnchor="end" fontFamily="Rajdhani, sans-serif">{metric.unit}</text>
      </svg>
    </div>
  );
}
// ─── COUNTER DETAIL ──────────────────────────────────────
function CounterDetail({ counter, onClose, onReset, color, onUpdateCounter }) {
  const canReset = counter.type === "trip" || counter.type === "section";
  const markers = { maxAlt: counter.maxAltPos, minAlt: counter.minAltPos, bestAccel: counter.bestAccelPos, maxLean: counter.maxLeanPos };
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editText, setEditText] = useState("");
  const editPressTimer = useRef(null);

  const startEdit = (field) => {
    setEditingField(field);
    setEditText(field === "start" ? (counter.startLabel || "") : (counter.endLabel || ""));
  };
  const handleEditDown = (field) => {
    editPressTimer.current = setTimeout(() => startEdit(field), 1000);
  };
  const handleEditUp = () => { clearTimeout(editPressTimer.current); };
  const handleEditCancel = () => { clearTimeout(editPressTimer.current); };
  const saveEdit = () => {
    if (!editingField || !onUpdateCounter) return;
    const key = editingField === "start" ? "startLabel" : "endLabel";
    onUpdateCounter(counter.type, key, editText);
    setEditingField(null);
  };

  // Build columns: current (live) + history snapshots (newest first)
  const snapshots = loadSnapshots(counter.type);
  const formatSnapshotValues = (s) => {
    const avg = s.speedCount > 0 ? Math.round(s.speedSum / s.speedCount) : 0;
    const d = new Date(s.date);
    return [
      d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "2-digit" }),
      s.startLabel || formatGps(s.startPos),
      computeViaLabel(s.startPos, s.endPos, null, null),
      s.endLabel || formatGps(s.endPos),
      formatDist(s.distance),
      formatTime(s.time),
      `${avg} km/h`,
      `${Math.round(s.maxSpeed || 0)} km/h`,
      formatAlt(s.maxAlt),
      formatAlt(s.minAlt),
      `${Math.round(s.ascent || 0)} m`,
      `${Math.round(s.descent || 0)} m`,
    ];
  };

  // "Přes" — via point: farthest from start if loop, else midpoint of track
  const computeViaLabel = (startPos, endPos, maxDistFromStartPos, track) => {
    if (!startPos) return "—";
    const samePlace = endPos ? (() => {
      const dl = endPos[0] - startPos[0], dn = endPos[1] - startPos[1];
      return Math.sqrt(dl * dl + dn * dn) * 111320 < 500;
    })() : true;
    if (samePlace) {
      // Loop — show farthest point from start
      if (maxDistFromStartPos) return formatGps(maxDistFromStartPos);
      if (track && track.length > 2) {
        let best = null, bestD = 0;
        track.forEach(pt => {
          const dl = pt[0] - startPos[0], dn = pt[1] - startPos[1];
          const d = Math.sqrt(dl * dl + dn * dn) * 111320;
          if (d > bestD) { bestD = d; best = pt; }
        });
        return best ? formatGps(best) : "—";
      }
      return "—";
    } else {
      // One-way — midpoint of track
      if (track && track.length >= 3) {
        const mid = track[Math.floor(track.length / 2)];
        return formatGps(mid);
      }
      return "—";
    }
  };

  // Current live values
  const avgSpeed = counter.speedCount > 0 ? Math.round(counter.speedSum / counter.speedCount) : 0;
  const curDate = new Date(counter.startedAt);

  const currentValues = [
    curDate.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "2-digit" }),
    counter.startLabel || formatGps(counter.startPos),
    computeViaLabel(counter.startPos, counter.endPos, counter.maxDistFromStartPos, counter.track),
    counter.endLabel || formatGps(counter.endPos),
    formatDist(counter.distance),
    formatTime(counter.time),
    `${avgSpeed} km/h`,
    `${Math.round(counter.maxSpeed || 0)} km/h`,
    formatAlt(counter.maxAlt),
    formatAlt(counter.minAlt),
    `${Math.round(counter.ascent || 0)} m`,
    `${Math.round(counter.descent || 0)} m`,
  ];

  const labels = [
    "Datum", "Start", "Přes", "Cíl", "Vzdálenost",
    "Čas celkem", "Prům. rychlost", "Max rychlost",
    "Max výška", "Min výška", "Nastoupáno", "Sestoupáno",
  ];

  // Row indices for editable fields (Start=1, Cíl=2)
  const EDIT_START_ROW = 1;
  const EDIT_END_ROW = 3;

  // All columns: current first, then snapshots newest→oldest
  const allColumns = [currentValues, ...[...snapshots].reverse().map(formatSnapshotValues)];
  const colHeaders = ["", ...snapshots.slice().reverse().map((s, i) => `#${snapshots.length - i}`)];

  const ROW_H = 40;
  const LABEL_W = 130;
  const COL_W = 130;

  // Number of frozen rows at top: Datum(0), Start(1), Cíl(2), Přes(3)
  const FROZEN_ROWS = 4;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10500, fontFamily: "Rajdhani, sans-serif", background: COLORS.bg, display: "flex", flexDirection: "column" }}>

      {/* Close button row — above table, outside scroll */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "flex-end", padding: "4px 10px 0" }}>
        <button onClick={onClose} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.white, width: 48, height: 48, fontSize: 24, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>X</button>
      </div>

      {/* Edit overlay */}
      {editingField && (
        <div style={{ flexShrink: 0, padding: "8px 20px", background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 17, color: COLORS.white, fontWeight: 600, flexShrink: 0 }}>{editingField === "start" ? "Start" : "Cíl"}:</span>
          <input type="text" value={editText} maxLength={30} autoFocus
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${color}`, background: COLORS.bg, color: COLORS.white, fontSize: 17, fontWeight: 600, fontFamily: "Rajdhani, sans-serif", outline: "none" }}
            placeholder="Název místa..." />
          <button onClick={saveEdit} style={{ padding: "8px 16px", borderRadius: 8, background: color, border: "none", color: COLORS.white, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif", flexShrink: 0 }}>OK</button>
          <button onClick={() => setEditingField(null)} style={{ padding: "8px 12px", borderRadius: 8, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, color: COLORS.white, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif", flexShrink: 0 }}>X</button>
        </div>
      )}

      {/* Single scroll container — both axes */}
      <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", background: COLORS.bg }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: LABEL_W + allColumns.length * COL_W, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
          <thead style={{ background: COLORS.bg }}>
            {/* Row 1: counter name — sticky */}
            <tr style={{ position: "sticky", top: 0, zIndex: 4, background: COLORS.bg, transform: "translateZ(0)" }}>
              <th colSpan={allColumns.length + 1} style={{ position: "sticky", left: 0, zIndex: 5, height: 36, padding: "0 10px", textAlign: "left", background: COLORS.bg, fontSize: 17, color, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>{COUNTER_LABELS[counter.type]}</th>
            </tr>
            {labels.slice(0, FROZEN_ROWS).map((label, ri) => {
              return (
              <tr key={ri}>
                <td style={{ position: "sticky", left: 0, zIndex: 2, width: LABEL_W, height: ROW_H, padding: "0 10px", borderBottom: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)', background: COLORS.bg, fontSize: 17, color: COLORS.white, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</td>
                {allColumns.map((col, ci) => {
                  const isEditableCell = ci === 0 && (ri === EDIT_START_ROW || ri === EDIT_END_ROW);
                  const editField = ri === EDIT_START_ROW ? "start" : "end";
                  return (
                    <td key={ci}
                      onPointerDown={isEditableCell ? () => handleEditDown(editField) : undefined}
                      onPointerUp={isEditableCell ? handleEditUp : undefined}
                      onPointerLeave={isEditableCell ? handleEditCancel : undefined}
                      style={{ width: COL_W, height: ROW_H, textAlign: "center", borderBottom: '1px solid rgba(255,255,255,0.2)', borderLeft: ci > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none', background: COLORS.bg, cursor: isEditableCell ? "pointer" : "default", fontSize: 17, fontWeight: 600, color: COLORS.white, padding: "0 2px", wordBreak: "break-all", lineHeight: 1.2, touchAction: isEditableCell ? "none" : "auto" }}>
                      {col[ri]}
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </thead>
          <tbody>
            {labels.slice(FROZEN_ROWS).map((label, ri) => {
              const origRi = ri + FROZEN_ROWS;
              return (
                <tr key={ri}>
                  <td style={{ position: "sticky", left: 0, zIndex: 2, width: LABEL_W, height: ROW_H, padding: "0 10px", borderBottom: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)', background: COLORS.bg, fontSize: 17, color: COLORS.white, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</td>
                  {allColumns.map((col, ci) => {
                    const val = col[origRi];
                    const isRide = origRi === labels.length - 1 && typeof val === "object";
                    return (
                      <td key={ci}
                        style={{ width: COL_W, height: ROW_H, textAlign: "center", borderBottom: '1px solid rgba(255,255,255,0.2)', borderLeft: ci > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none', background: COLORS.bg, fontSize: 17, fontWeight: 600, color: COLORS.white, padding: "0 2px", wordBreak: "break-all", lineHeight: 1.2 }}>
                        {isRide ? <><span style={{ fontSize: 22 }}>{val.score}<span style={{ fontSize: 17, opacity: 0.7 }}>%</span></span><br /><span style={{ fontSize: 17, opacity: 0.9 }}>{val.label}</span></> : val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>
      {/* Reset buttons — OUTSIDE scroll, same pattern as close button */}
      {canReset && (
        <div style={{ flexShrink: 0, padding: "10px 20px 20px", background: COLORS.bg }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)}
              style={{ width: "100%", padding: "18px", background: "transparent", border: `2px solid ${COLORS.red}`, borderRadius: 14, color: COLORS.red, fontSize: 20, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>
              RESETOVAT
            </button>
          ) : (
            <div style={{ background: `${COLORS.red}22`, borderRadius: 14, padding: "14px", border: `2px solid ${COLORS.red}` }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, marginBottom: 10, textAlign: "center" }}>Opravdu resetovat {COUNTER_LABELS[counter.type]}?</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmReset(false)}
                  style={{ flex: 1, padding: "16px", background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, color: COLORS.white, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>NE</button>
                <button onClick={() => onReset()}
                  style={{ flex: 1, padding: "16px", background: COLORS.red, border: "none", borderRadius: 12, color: COLORS.white, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>ANO</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



// ─── TRIVIA WIDGET ───────────────────────────────────────
function TriviaWidget({ onDisable, disableRef }) {
  // Track dismissed questions in localStorage
  const [dismissed, setDismissed] = useState(() => {
    try { const v = localStorage.getItem("motogauge_trivia_dismissed"); return v ? JSON.parse(v) : []; } catch(e) { return []; }
  });
  const remaining = MOTO_TRIVIA.filter((_, i) => !dismissed.includes(i));
  const [idx, setIdx] = useState(() => {
    if (remaining.length === 0) return 0;
    return MOTO_TRIVIA.indexOf(remaining[Math.floor(Math.random() * remaining.length)]);
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const [farewell, setFarewell] = useState(null);

  const pickNext = (newDismissed) => {
    const rem = MOTO_TRIVIA.filter((_, i) => !newDismissed.includes(i));
    if (rem.length === 0) return 0;
    return MOTO_TRIVIA.indexOf(rem[Math.floor(Math.random() * rem.length)]);
  };

  const handleGreen = () => {
    const nd = [...dismissed, idx];
    setDismissed(nd);
    try { localStorage.setItem("motogauge_trivia_dismissed", JSON.stringify(nd)); } catch(e) {}
    setIdx(pickNext(nd));
    setShowAnswer(false);
  };

  const handleRed = () => {
    setIdx(pickNext(dismissed));
    setShowAnswer(false);
  };

  const resetAll = () => {
    setDismissed([]);
    try { localStorage.removeItem("motogauge_trivia_dismissed"); } catch(e) {}
    setIdx(Math.floor(Math.random() * MOTO_TRIVIA.length));
    setShowAnswer(false);
  };

  // Při vypnutí — zobraz hodnocení podle poměru správných odpovědí
  const handleDisable = () => {
    const good = dismissed.length;
    const reaction = REACTIONS_GOOD[Math.floor(Math.random() * REACTIONS_GOOD.length)];
    setFarewell({ text: reaction, good: true });
    setTimeout(() => onDisable(), 2500);
  };

  // Registruj handleDisable do ref pro oranžové tlačítko
  useEffect(() => {
    if (disableRef) disableRef.current = handleDisable;
    return () => { if (disableRef) disableRef.current = null; };
  });

  const trivia = MOTO_TRIVIA[idx];
  const total = MOTO_TRIVIA.length;
  const done = dismissed.length;

  if (farewell) {
    const isGood = farewell.good;
    return (
      <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "20px 18px", border: `1px solid ${isGood ? "#2ecc40" : COLORS.red}44`, marginTop: 12, fontFamily: "Rajdhani, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 19, color: isGood ? "#2ecc40" : COLORS.red, fontWeight: 700, lineHeight: 1.5 }}>{farewell.text}</div>
      </div>
    );
  }

  if (done >= total) {
    return (
      <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid #2ecc4033`, marginTop: 12, fontFamily: "Rajdhani, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 22, color: "#2ecc40", fontWeight: 700, marginBottom: 8 }}>HOTOVO!</div>
        <div style={{ fontSize: 17, color: COLORS.white, marginBottom: 12 }}>Všech {total} otázek zodpovězeno!</div>
        <button onClick={resetAll} style={{ padding: "12px 24px", background: COLORS.primary, border: "none", borderRadius: 12, color: COLORS.white, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>ZAČÍT ZNOVU</button>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid ${COLORS.primary}33`, marginTop: 12, fontFamily: "Rajdhani, sans-serif" }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 17, color: COLORS.primary, fontWeight: 700, letterSpacing: 2 }}>MOTO KVÍZ</span>
      </div>
      <div style={{ fontSize: 18, color: COLORS.white, fontWeight: 600, lineHeight: 1.4, marginBottom: 10 }}>{trivia.q}</div>
      {showAnswer ? (
        <>
          <div style={{ fontSize: 17, color: COLORS.primaryLight, lineHeight: 1.4, marginBottom: 12, padding: "10px 14px", background: `${COLORS.primary}11`, borderRadius: 10 }}>{trivia.a}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRed} style={{ flex: 1, padding: "14px", background: COLORS.red + "22", border: `2px solid ${COLORS.red}`, borderRadius: 14, color: COLORS.red, fontSize: 22, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>NE</button>
            <button onClick={handleGreen} style={{ flex: 1, padding: "14px", background: "#2ecc4022", border: "2px solid #2ecc40", borderRadius: 14, color: "#2ecc40", fontSize: 22, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>ANO</button>
          </div>
        </>
      ) : (
        <button onClick={() => setShowAnswer(true)} style={{ width: "100%", padding: "16px", background: "transparent", border: `2px solid ${COLORS.primary}`, borderRadius: 14, color: COLORS.primary, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>UKÁZAT ODPOVĚĎ</button>
      )}
    </div>
  );
}

const ENGLISH_FAREWELLS = [
  "Bye! Your vocabulary is officially on your own.",
  "Odcházím. Aspoň víš, co je slipper clutch. Nebo víš?",
  "Na shledanou! Rider bez vocabulary je jen... řidič.",
];

// ─── MOTO ENGLISH FLASHCARDS ────────────────────────────
function MotoEnglishWidget({ onDisable, disableRef }) {
  // State: { "idx_dir": { greenCount, lastSeen } } — each direction needs 2 greens
  const [cardState, setCardState] = useState(() => {
    try { const v = localStorage.getItem("motogauge_english_state"); return v ? JSON.parse(v) : {}; } catch(e) { return {}; }
  });
  const [showAnswer, setShowAnswer] = useState(false);
  const [farewell, setFarewell] = useState(null);
  const [card, setCard] = useState(null);

  const saveState = (s) => { try { localStorage.setItem("motogauge_english_state", JSON.stringify(s)); } catch(e) {} };
  const getKey = (i, dir) => `${i}_${dir}`;
  const getGreen = (state, i, dir) => (state[getKey(i, dir)] || {}).greenCount || 0;

  // Word is done when BOTH directions have 2+ greens
  const countDone = (state) => MOTO_ENGLISH.filter((_, i) =>
    getGreen(state, i, "en") >= 2 && getGreen(state, i, "cz") >= 2
  ).length;

  const pickCard = (state) => {
    const now = Date.now();
    const pool = [];
    MOTO_ENGLISH.forEach((_, i) => {
      ["en", "cz"].forEach(dir => {
        const g = getGreen(state, i, dir);
        if (g >= 2) return;
        const last = (state[getKey(i, dir)] || {}).lastSeen || 0;
        if (g === 1 && now - last < 30000) return;
        pool.push({ wordIdx: i, dir });
      });
    });
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  useEffect(() => { if (!card) setCard(pickCard(cardState)); }, []);

  const done = countDone(cardState);
  const total = MOTO_ENGLISH.length;

  const handleGreen = () => {
    const ns = { ...cardState };
    const key = getKey(card.wordIdx, card.dir);
    const cur = ns[key] || { greenCount: 0 };
    ns[key] = { greenCount: cur.greenCount + 1, lastSeen: Date.now() };
    setCardState(ns); saveState(ns);
    setCard(pickCard(ns));
    setShowAnswer(false);
  };

  const handleRed = () => {
    const ns = { ...cardState };
    const key = getKey(card.wordIdx, card.dir);
    ns[key] = { greenCount: 0, lastSeen: Date.now() };
    setCardState(ns); saveState(ns);
    setCard(pickCard(ns));
    setShowAnswer(false);
  };

  const resetAll = () => {
    setCardState({}); saveState({});
    setCard({ wordIdx: Math.floor(Math.random() * MOTO_ENGLISH.length), dir: Math.random() > 0.5 ? "en" : "cz" });
    setShowAnswer(false);
  };

  const handleDisable = () => {
    const reaction = REACTIONS_GOOD[Math.floor(Math.random() * REACTIONS_GOOD.length)];
    setFarewell({ text: reaction, good: true });
    setTimeout(() => onDisable(), 2500);
  };

  useEffect(() => {
    if (disableRef) disableRef.current = handleDisable;
    return () => { if (disableRef) disableRef.current = null; };
  });

  if (farewell) {
    return (
      <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "20px 18px", border: `1px solid ${farewell.good ? "#2ecc40" : COLORS.red}44`, marginTop: 8, fontFamily: "Rajdhani, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 19, color: farewell.good ? "#2ecc40" : COLORS.red, fontWeight: 700, lineHeight: 1.5 }}>{farewell.text}</div>
      </div>
    );
  }

  if (!card || done >= total) {
    return (
      <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid #2ecc4033`, marginTop: 8, fontFamily: "Rajdhani, sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: 22, color: "#2ecc40", fontWeight: 700, marginBottom: 8 }}>ALL DONE!</div>
        <div style={{ fontSize: 17, color: COLORS.white, marginBottom: 12 }}>Všech {total} slovíček zvládnuto oběma směry!</div>
        <button onClick={resetAll} style={{ padding: "12px 24px", background: COLORS.primary, border: "none", borderRadius: 12, color: COLORS.white, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>ZAČÍT ZNOVU</button>
      </div>
    );
  }

  const word = MOTO_ENGLISH[card.wordIdx];
  const isEnToCz = card.dir === "en";
  const question = isEnToCz ? word.en : word.cz;
  const answer = isEnToCz ? word.cz : word.en;

  return (
    <div style={{ background: COLORS.bgCard, borderRadius: 16, padding: "16px 18px", border: `1px solid ${COLORS.primary}33`, marginTop: 8, fontFamily: "Rajdhani, sans-serif" }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 17, color: COLORS.primary, fontWeight: 700, letterSpacing: 2 }}>MOTO ENGLISH</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.white, marginBottom: 6, lineHeight: 1.2 }}>{question}</div>
      {showAnswer ? (
        <>
          <div style={{ fontSize: 20, color: COLORS.primaryLight, marginBottom: 14, padding: "10px 14px", background: `${COLORS.primary}11`, borderRadius: 10, fontWeight: 600 }}>{answer}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRed} style={{ flex: 1, padding: "14px", background: COLORS.red + "22", border: `2px solid ${COLORS.red}`, borderRadius: 14, color: COLORS.red, fontSize: 22, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>NE</button>
            <button onClick={handleGreen} style={{ flex: 1, padding: "14px", background: "#2ecc4022", border: "2px solid #2ecc40", borderRadius: 14, color: "#2ecc40", fontSize: 22, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>ANO</button>
          </div>
        </>
      ) : (
        <button onClick={() => setShowAnswer(true)} style={{ width: "100%", padding: "16px", background: "transparent", border: `2px solid ${COLORS.primary}`, borderRadius: 14, color: COLORS.primary, fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>UKÁZAT PŘEKLAD</button>
      )}
    </div>
  );
}

// ─── CELL PICKER (long-press menu) ──────────────────────
function CellPicker({ currentId, onSelect, onClose, excludeIds, includeIds }) {
  const filteredOptions = includeIds ? CELL_OPTIONS.filter(o => includeIds.includes(o.id)) : excludeIds ? CELL_OPTIONS.filter(o => !excludeIds.includes(o.id)) : CELL_OPTIONS;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, fontFamily: "Rajdhani, sans-serif" }}
      onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 340, margin: "auto", marginTop: "20vh", padding: "16px", background: COLORS.bgCard, borderRadius: 16, border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>ZOBRAZIT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {filteredOptions.map(opt => (
            <button key={opt.id} onClick={() => { onSelect(opt.id); onClose(); }}
              style={{
                padding: "14px 10px", borderRadius: 12, cursor: "pointer",
                background: opt.id === currentId ? `${opt.color}22` : COLORS.bg,
                border: `2px solid ${opt.id === currentId ? opt.color : COLORS.border}`,
                color: opt.id === currentId ? opt.color : COLORS.white,
                fontSize: 17, fontWeight: 700, fontFamily: "Rajdhani, sans-serif",
                textAlign: "center",
              }}>
              {opt.label}
              {opt.note && <div style={{ fontSize: 17, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>{opt.note}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CONFIGURABLE CELL ──────────────────────────────────
function ConfigCell({ cellId, data, onLongPress, compact }) {
  const pressTimer = useRef(null);
  const didLongPress = useRef(false);

  const handleDown = () => {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => { didLongPress.current = true; onLongPress(); }, 1000);
  };
  const handleUp = () => { clearTimeout(pressTimer.current); };
  const handleCancel = () => { clearTimeout(pressTimer.current); };

  const opt = CELL_OPTIONS.find(o => o.id === cellId) || CELL_OPTIONS[0];
  let value = "—";
  switch (cellId) {
    case "speed": value = `${Math.round(data.speed || 0)}`; break;
    case "maxSpeed": value = `${Math.round(data.maxSpeed || 0)}`; break;
    case "altitude": value = data.altitude !== null && data.altitude !== undefined ? `${Math.round(data.altitude)}` : "—"; break;
    case "distSection": value = formatDist(data.counters?.section?.distance || 0); break;
    case "distDaily": value = formatDist(data.counters?.daily?.distance || 0); break;
    case "distTrip": value = formatDist(data.counters?.trip?.distance || 0); break;
    case "clock": value = new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }); break;
    case "accel": {
      const r100 = data.accelResults?.["0_100"] || data.accelFinalDisplay;
      const live = data.accelLiveTime;
      if (r100) value = (r100/1000).toFixed(1);
      else if (live) value = (live/1000).toFixed(1);
      else value = "—";
      break;
    }
    case "maxAltDaily": { const dc = data.counters?.daily; value = dc && dc.maxAlt !== null ? `${Math.round(dc.maxAlt)}` : "—"; break; }
    case "minAltDaily": { const dc = data.counters?.daily; value = dc && dc.minAlt !== null ? `${Math.round(dc.minAlt)}` : "—"; break; }
    case "sunset": { const lp = data.lastPos; value = lp ? formatSunsetCountdown(lp.lat, lp.lng) : "—"; break; }
    case "timezone": { const off = -new Date().getTimezoneOffset(); const sign = off >= 0 ? "+" : "−"; const h = Math.floor(Math.abs(off) / 60); const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop().replace(/_/g, " "); value = `UTC${sign}${h} ${tz}`; break; }
  }

  if (compact) {
    // HUD bar compact mode
    return (
      <div
        onPointerDown={handleDown} onPointerUp={handleUp} onPointerLeave={handleCancel}
        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 4px", gap: 0, touchAction: "none" }}>
        <span style={{ fontSize: 17, color: COLORS.white, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1 }}>{opt.label}</span>
        <span style={{ fontSize: 26, fontWeight: 700, color: opt.color, lineHeight: 1, fontFamily: "Rajdhani, sans-serif" }}>{value}</span>
        {opt.unit && <span style={{ fontSize: 17, color: COLORS.white, lineHeight: 1, marginTop: 1 }}>{opt.unit}</span>}
      </div>
    );
  }

  // Dashboard card mode
  return (
    <div
      onPointerDown={handleDown} onPointerUp={handleUp} onPointerLeave={handleCancel}
      style={{ background: COLORS.bgCard, borderRadius: 14, padding: "12px 10px", border: `1px solid ${COLORS.border}`, touchAction: "none" }}>
      <div style={{ fontSize: 17, color: COLORS.white, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{opt.label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: opt.color }}>{value}</div>
    </div>
  );
}

// ─── HUD BAR ─────────────────────────────────────────────
function HudBar({ data, cells, onCellChange, onExpand }) {
  const [pickingIdx, setPickingIdx] = useState(null);

  const barStyle = {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
    height: 64,
    paddingTop: "env(safe-area-inset-top, 0px)",
    background: "rgba(10, 10, 15, 0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: `2px solid ${COLORS.primary}55`,
    display: "flex", alignItems: "stretch",
    fontFamily: "Rajdhani, sans-serif",
    boxShadow: "0 2px 20px rgba(0,0,0,0.6)",
  };

  return (
    <>
      <div style={barStyle} onClick={onExpand}>
        {cells.map((cellId, i) => (
          <div key={i} style={{ flex: 1, borderRight: i < 2 ? `1px solid ${COLORS.border}` : "none", display: "flex" }}>
            <ConfigCell cellId={cellId} data={data} compact
              onLongPress={() => { setPickingIdx(i); }} />
          </div>
        ))}
        <div style={{
          position: "absolute", right: 6, bottom: 3,
          fontSize: 17, color: `${COLORS.primary}77`,
          letterSpacing: 1, fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
        }}>▼ ROZBALIT</div>
      </div>
      {pickingIdx !== null && (
        <CellPicker
          currentId={cells[pickingIdx]}
          onSelect={(id) => onCellChange(pickingIdx, id)}
          onClose={() => setPickingIdx(null)}
        />
      )}
    </>
  );
}

// ─── DEMO PANEL (manual slider control) ─────────────────
function DemoPanel({ demo, onToggle, demoSpeed, onSpeedChange }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 8000, fontFamily: "Rajdhani, sans-serif", background: demo ? COLORS.bgCard : "transparent", borderTop: demo ? `2px solid ${COLORS.red}55` : "none", padding: demo ? "10px 20px 16px" : "10px 10px", display: "flex", flexDirection: "column", alignItems: demo ? "stretch" : "flex-end" }}>
      {demo && (
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 17, color: COLORS.white, fontWeight: 700, minWidth: 60 }}>{Math.round(demoSpeed)} km/h</span>
          <input type="range" min="0" max="200" step="1" value={demoSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            style={{ flex: 1, height: 44, accentColor: COLORS.red, cursor: "pointer" }} />
        </div>
      )}
      <button onClick={onToggle} style={{
        background: demo ? COLORS.red : COLORS.bgCard,
        border: `2px solid ${demo ? COLORS.red : COLORS.border}`,
        borderRadius: 16, padding: "10px 18px",
        color: demo ? COLORS.white : COLORS.grayDark,
        fontSize: 17, fontWeight: 700, letterSpacing: 2,
        cursor: "pointer", fontFamily: "Rajdhani, sans-serif",
        alignSelf: demo ? "stretch" : "flex-end",
      }}>
        {demo ? "UKONČIT DEMO" : "DEMO"}
      </button>
    </div>
  );
}


// ─── COUNTER TILE (scroll-safe tap: cancel if finger moves >10px) ───
function CounterTile({ type, counter, color, onTap, onShare, snapshotCount = 0, borderBottom = false }) {
  const pressTimer = useRef(null);
  const startPos = useRef(null);
  const moved = useRef(false);

  const handleDown = (e) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    pressTimer.current = setTimeout(() => {}, 1000);
  };
  const handleMove = (e) => {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x, dy = e.clientY - startPos.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { moved.current = true; clearTimeout(pressTimer.current); }
  };
  const handleUp = () => {
    clearTimeout(pressTimer.current);
    if (!moved.current) onTap();
    startPos.current = null;
  };
  const handleCancel = () => { clearTimeout(pressTimer.current); startPos.current = null; };

  return (
    <div
      onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp} onPointerLeave={handleCancel}
      style={{
        background: COLORS.bg, borderRadius: 14, padding: "12px 16px",
        border: `1px solid ${color}33`, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}>
      {/* Left: name + snapshot badge */}
      <div style={{ minWidth: 80, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 18, color: COLORS.white, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{COUNTER_LABELS[type]}</div>
          {snapshotCount > 0 && (
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, background: `${COLORS.primary}22`, border: `1px solid ${COLORS.primary}55`, borderRadius: 10, padding: "1px 6px", lineHeight: 1.4 }}>
              {snapshotCount}×
            </div>
          )}
        </div>
      </div>
      {/* Center: distance (big) */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.white, lineHeight: 1 }}>{formatDist(counter.distance)}</div>
      </div>
      {/* Right: time */}
      <div style={{ textAlign: "right", minWidth: 75 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.white }}>{formatTimeHM(counter.time)}</div>
      </div>
    </div>
  );
}

// ─── SIDE CELLS (3 orange: clock fixed + 2 configurable) ─
// Home timezone: saved when user first opens app, used for "Čas doma"
const getHomeTimezone = () => { try { const v = localStorage.getItem("motogauge_home_tz"); if (v) return v; } catch(e) {} return null; };
const saveHomeTimezone = (tz) => { try { localStorage.setItem("motogauge_home_tz", tz); } catch(e) {} };
// Auto-save home timezone on first load
if (!getHomeTimezone()) saveHomeTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

function SideCells({ cells, data, onCellChange, onAccelTap, onCloseAccel, onSegmentTap }) {
  const [pickingIdx, setPickingIdx] = useState(null);
  // Slot 0 = clock (fixed), Slot 1 = sunset (picker), Slot 2 = accel (fixed, no picker)
  const SLOT_IDS = [null, SLOT2_IDS, null];

  const getCellValue = (cellId) => {
    switch (cellId) {
      case "clock": return new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
      case "altitude": { const a = data.altitude; return a !== null && a !== undefined ? `${Math.round(a)}` : "—"; }
      case "homeTime": {
        const homeTz = getHomeTimezone();
        if (!homeTz) return "—";
        const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (homeTz === currentTz) return "= místní";
        try {
          const homeTime = new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", timeZone: homeTz });
          const city = homeTz.split("/").pop().replace(/_/g, " ");
          return `${homeTime} ${city}`;
        } catch(e) { return "—"; }
      }
      case "travelTime": {
        const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const city = currentTz.split("/").pop().replace(/_/g, " ");
        const off = -new Date().getTimezoneOffset();
        const sign = off >= 0 ? "+" : "−";
        const h = Math.floor(Math.abs(off) / 60);
        const time = new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
        return `${time} UTC${sign}${h}`;
      }
      case "sunset": {
        const lp = data.lastPos;
        if (!lp) return "—";
        const sunset = getSunsetTime(lp.lat, lp.lng);
        const sunrise = getSunriseTime(lp.lat, lp.lng);
        const now = new Date();
        if (sunset && sunrise && now > sunset && now < sunrise) return "Jdi spát";
        return lp ? formatSunsetCountdown(lp.lat, lp.lng) : "—";
      }
      case "sunsetTime": {
        const lp = data.lastPos;
        if (!lp) return "—";
        const sunset = getSunsetTime(lp.lat, lp.lng);
        const sunrise = getSunriseTime(lp.lat, lp.lng);
        const now = new Date();
        if (sunset && sunrise && now > sunset && now < sunrise) return "Jdi spát";
        return formatHHMM(sunset);
      }
      case "sunriseCountdown": {
        const lp = data.lastPos;
        if (!lp) return "—";
        const sunset = getSunsetTime(lp.lat, lp.lng);
        const sunrise = getSunriseTime(lp.lat, lp.lng);
        const now = new Date();
        if (sunset && sunrise && now > sunset && now < sunrise) return "Jdi spát";
        return formatCountdownHHMM(sunrise);
      }
      case "sunriseTime": {
        const lp = data.lastPos;
        if (!lp) return "—";
        const sunset = getSunsetTime(lp.lat, lp.lng);
        const sunrise = getSunriseTime(lp.lat, lp.lng);
        const now = new Date();
        if (sunset && sunrise && now > sunset && now < sunrise) return "Jdi spát";
        return formatHHMM(sunrise);
      }
      default: {
        if (cellId && cellId.startsWith("accel")) {
          const range = ACCEL_RANGES[cellId];
          if (range) {
            const key = `${range[0]}_${range[1]}`;
            const result = data.accelResults?.[key];
            const live = data.accelLiveResults?.[key];
            if (result) return (result / 1000).toFixed(1);
            if (live) return (live / 1000).toFixed(1);
            return "—";
          }
        }
        return "—";
      }
    }
  };

  const isAccelCell = (id) => id && id.startsWith("accel");

  const getAccelRanges = (activeCellId) => {
    const get = (key) => {
      const r = data.accelResults?.[key];
      const l = data.accelLiveResults?.[key];
      // For 0→100, also use accelLiveTime (frozen after stop)
      const lt = key === "0_100" ? data.accelLiveTime : null;
      return r ? `${(r/1000).toFixed(1)}s` : lt ? `${(lt/1000).toFixed(1)}s` : l ? `${(l/1000).toFixed(1)}s` : "—";
    };
    return [
      { id: "accel",        label: "0→100",  value: get("0_100") },
      { id: "accel0_60",    label: "0→60",   value: get("0_60") },
      { id: "accel0_130",   label: "0→130",  value: get("0_130") },
      { id: "accel0_200",   label: "0→200",  value: get("0_200") },
      { id: "accel60_120",  label: "60→120", value: get("60_120") },
      { id: "accel100_200", label: "100→200",value: get("100_200") },
    ].map(r => ({ ...r, active: r.id === activeCellId }));
  };

  return (
    <>
      {/* Slot 0: clock (fixed), Slot 1: sunset, Slot 2: accel */}
      {cells.map((cellId, i) => {
        const opt = CELL_OPTIONS.find(o => o.id === cellId) || CELL_OPTIONS[0];
        const value = getCellValue(cellId);
        const hasPicker = SLOT_IDS[i] !== null;
        // Segment cell — special component
        if (cellId === "segment") {
          return <SegmentCell key={i} activeSeg={data.activeSeg} runState={data.segRunState} onTap={onSegmentTap} />;
        }
        return (
          <SideCellItem key={i} label={opt.label} value={value} unit={opt.unit}
            cellId={cellId}
            accelRanges={isAccelCell(cellId) ? getAccelRanges(cellId) : null}
            accelExpanded={false}
            accelIsResult={isAccelCell(cellId) && (!!data.accelResults?.["0_100"] || !!data.accelFinalDisplay)}
            onTap={isAccelCell(cellId) ? () => onAccelTap() : undefined}
            onLongPress={!isAccelCell(cellId) && hasPicker ? () => setPickingIdx(i) : () => {}} />
        );
      })}
      {pickingIdx !== null && SLOT_IDS[pickingIdx] && (
        <CellPicker
          currentId={cells[pickingIdx]}
          onSelect={(id) => onCellChange(pickingIdx, id)}
          onClose={() => setPickingIdx(null)}
          includeIds={SLOT_IDS[pickingIdx]}
        />
      )}
    </>
  );
}

function SideCellItem({ label, value, unit, cellId, onLongPress, onTap, accelRanges, accelExpanded, accelIsResult }) {
  const pressTimer = useRef(null);
  const didLong = useRef(false);
  const [pressed, setPressed] = useState(false);
  const handleDown = () => {
    didLong.current = false;
    setPressed(true);
    pressTimer.current = setTimeout(() => { didLong.current = true; onLongPress(); }, 1000);
  };
  const handleUp = () => { clearTimeout(pressTimer.current); setPressed(false); };

  if (accelRanges) {
    const active = accelRanges.find(r => r.active) || accelRanges[0];
    return (
      <div
        onPointerDown={handleDown} onPointerUp={handleUp} onPointerLeave={handleUp}
        onClick={onTap ? (e) => { e.stopPropagation(); if (!didLong.current) onTap(); } : undefined}
        style={{
          background: pressed ? COLORS.primaryLight : COLORS.primary,
          borderRadius: 10, padding: "4px 12px",
          cursor: "pointer", boxSizing: "border-box",
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 0,
        }}>
        {(() => {
          const r100 = accelRanges.find(r => r.id === "accel");
          const val = r100 ? r100.value : "—";
          return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>0→100</span>
              <span style={{ fontSize: 29, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif" }}>{val}<span style={{ fontSize: 17, fontWeight: 400, opacity: 0.7, marginLeft: 2 }}>s</span></span>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div
      onPointerDown={handleDown} onPointerUp={handleUp} onPointerLeave={handleUp}
      onClick={onTap ? (e) => { e.stopPropagation(); if (!didLong.current) onTap(); } : undefined}
      style={{
        background: COLORS.primary, borderRadius: 10, padding: "0 12px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", height: 52, boxSizing: "border-box",
      }}>
      <span style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Rajdhani, sans-serif" }}>{label}</span>
      <span style={{ fontSize: 29, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif" }}>
        {value}{unit ? <span style={{ fontSize: 17, fontWeight: 400, opacity: 0.7, marginLeft: 2 }}>{unit}</span> : null}
      </span>
    </div>
  );
}

// ─── LEAFLET MAP ─────────────────────────────────────────
function LeafletMap({ route, height = 180 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Dynamicky načteme Leaflet JS pokud ještě není
    if (window.L) { setLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || !route || route.length < 2) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    const latlngs = route.map(p => [p.lat, p.lng]);
    const poly = L.polyline(latlngs, { color: "#ff6b00", weight: 4, opacity: 0.9 }).addTo(map);
    // Start marker — zelený
    L.circleMarker(latlngs[0], { radius: 7, fillColor: "#2ecc40", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map);
    // End marker — červený
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 7, fillColor: "#ff3b30", color: "#fff", weight: 2, fillOpacity: 1 }).addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [20, 20] });
    mapInstanceRef.current = map;
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [loaded, route]);

  if (!route || route.length < 2) return null;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
      {!loaded && (
        <div style={{ height, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 17, color: COLORS.white }}>Načítám mapu…</span>
        </div>
      )}
      <div ref={mapRef} style={{ height, display: loaded ? "block" : "none" }} />
    </div>
  );
}

// ─── SEGMENT MODAL ──────────────────────────────────────
function SegmentModal({ onClose, lastPos, onSegmentSaved, onActiveChange }) {
  const [view, setView] = useState("list"); // "list" | "detail"
  const [segments, setSegments] = useState(() => loadSegments());
  const [activeSegId, setActiveSegId] = useState(() => loadActiveSegId());
  const [detailSeg, setDetailSeg] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [editNameText, setEditNameText] = useState("");

  // Recording state — inline v horní liště
  const [recMode, setRecMode] = useState("idle"); // "idle"|"countdown"|"recording"
  const [recCountdown, setRecCountdown] = useState(10);
  const [recElapsed, setRecElapsed] = useState(0);
  const [recGeoName, setRecGeoName] = useState("");
  const recIntervalRef = useRef(null);
  const recStartPosRef = useRef(null);
  const recStartTimeRef = useRef(null);
  const recRouteRef = useRef([]);   // GPS body sbírané během nahrávání
  const recMaxSpeedRef = useRef(0); // Max rychlost během nahrávání

  // Geocode start position
  const geocodeStart = async (lat, lng) => {
    const name = await reverseGeocode(lat, lng);
    if (name && typeof name === "string") setRecGeoName(name);
  };

  const doStartRecording = () => {
    const pos = lastPos;
    if (!pos) return;
    recStartPosRef.current = { lat: pos.lat, lng: pos.lng };
    recStartTimeRef.current = Date.now();
    recRouteRef.current = [{ lat: pos.lat, lng: pos.lng, alt: pos.alt || null }];
    recMaxSpeedRef.current = 0;
    setRecMode("recording");
    setRecElapsed(0);
    setRecGeoName("");
    geocodeStart(pos.lat, pos.lng);
    recIntervalRef.current = setInterval(() => {
      setRecElapsed(Date.now() - recStartTimeRef.current);
      if (lastPos) {
        const spd = lastPos.speed || 0;
        if (spd > recMaxSpeedRef.current) recMaxSpeedRef.current = spd;
        const elapsed = Date.now() - recStartTimeRef.current;
        if (elapsed % 2000 < 120) {
          const last = recRouteRef.current[recRouteRef.current.length - 1];
          if (!last || last.lat !== lastPos.lat || last.lng !== lastPos.lng) {
            recRouteRef.current.push({ lat: lastPos.lat, lng: lastPos.lng, alt: lastPos.alt || null });
          }
        }
      }
    }, 100);
  };

  const startImmediate = () => { doStartRecording(); };

  const startCountdown = () => {
    setRecMode("countdown");
    setRecCountdown(10);
    let c = 10;
    const iv = setInterval(() => {
      c--;
      setRecCountdown(c);
      if (c <= 0) { clearInterval(iv); doStartRecording(); }
    }, 1000);
  };

  const startAfterMove = () => {
    setRecMode("countdown");
    setRecCountdown(null);
    const iv = setInterval(() => {
      if (lastPos && (lastPos.speed || 0) * 3.6 > 5) {
        clearInterval(iv);
        doStartRecording();
      }
    }, 500);
    setTimeout(() => { clearInterval(iv); if (recMode === "countdown") doStartRecording(); }, 30000);
  };

  const stopRecording = () => {
    clearInterval(recIntervalRef.current);
    const pos = lastPos;
    const startPos = recStartPosRef.current;
    const elapsed = Date.now() - (recStartTimeRef.current || Date.now());
    if (!startPos || !pos) { setRecMode("idle"); return; }
    const route = [...recRouteRef.current];
    if (pos && (route.length === 0 || route[route.length - 1].lat !== pos.lat)) {
      route.push({ lat: pos.lat, lng: pos.lng });
    }
    // Délka trasy
    let distanceKm = 0;
    for (let i = 1; i < route.length; i++) {
      distanceKm += gpsDistance(route[i-1].lat, route[i-1].lng, route[i].lat, route[i].lng);
    }
    distanceKm = Math.round(distanceKm * 100) / 100;
    // Převýšení
    const alts = route.filter(p => p.alt != null).map(p => p.alt);
    let elevGain = null;
    if (alts.length >= 2) {
      let gain = 0;
      for (let i = 1; i < alts.length; i++) { const d = alts[i] - alts[i-1]; if (d > 0.5) gain += d; }
      elevGain = Math.round(gain);
    }
    const avgSpeed = distanceKm > 0 && elapsed > 0 ? Math.round(distanceKm / (elapsed / 3600000) * 10) / 10 : null;
    const newSeg = createSegment(startPos.lat, startPos.lng, recGeoName || "Nový segment");
    newSeg.endLat = pos.lat;
    newSeg.endLng = pos.lng;
    newSeg.pr = elapsed;
    newSeg.route = route;
    newSeg.distanceKm = distanceKm > 0 ? distanceKm : null;
    newSeg.elevGain = elevGain;
    newSeg.history = [{ time: elapsed, date: Date.now(), temp: null, weather: null, delta: 0, avgSpeed, maxSpeed: recMaxSpeedRef.current || null, accel: null }];
    const updated = [newSeg, ...segments].slice(0, SEG_MAX);
    setSegments(updated);
    saveSegments(updated);
    setActiveSegId(newSeg.id);
    saveActiveSegId(newSeg.id);
    onActiveChange(newSeg);
    setRecMode("idle");
    recRouteRef.current = [];
    recMaxSpeedRef.current = 0;
    onSegmentSaved && onSegmentSaved(newSeg);
  };

  const cancelRecording = () => {
    clearInterval(recIntervalRef.current);
    setRecMode("idle");
    setRecCountdown(10);
    setRecElapsed(0);
  };

  const deleteSegment = (id) => {
    const updated = segments.filter(s => s.id !== id);
    setSegments(updated);
    saveSegments(updated);
    if (activeSegId === id) { setActiveSegId(null); saveActiveSegId(null); onActiveChange(null); }
    setDetailSeg(null);
    setView("list");
  };

  const activateSegment = (seg) => {
    setActiveSegId(seg.id);
    saveActiveSegId(seg.id);
    onActiveChange(seg);
    onClose();
  };

  const saveNameEdit = (seg) => {
    const updated = segments.map(s => s.id === seg.id ? { ...s, name: editNameText } : s);
    setSegments(updated);
    saveSegments(updated);
    setDetailSeg(prev => prev ? { ...prev, name: editNameText } : prev);
    setEditingName(null);
  };

  const formatSegTime = (ms) => {
    if (!ms && ms !== 0) return "—";
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60), sec = s % 60;
    return min > 0 ? `${min}:${String(sec).padStart(2, "0")}` : `${s}.${String(Math.floor((ms % 1000) / 100))}s`;
  };

  const overlay = { position: "fixed", inset: 0, background: COLORS.bg, zIndex: 3000, display: "flex", flexDirection: "column", fontFamily: "Rajdhani, sans-serif" };
  const btnClose = { background: "none", border: "none", color: COLORS.white, fontSize: 28, cursor: "pointer", padding: "0 4px", lineHeight: 1 };

  const weatherEmoji = (code) => {
    if (code == null) return "";
    if (code === 0) return "SLUNNO";
    if (code <= 2) return "POLOJ.";
    if (code <= 3) return "OBLAC.";
    if (code <= 49) return "MLHA";
    if (code <= 59) return "MRHOLÍ";
    if (code <= 69) return "DÉŠŤ";
    if (code <= 79) return "SNÍH";
    if (code <= 82) return "PRŠÍ";
    if (code <= 86) return "VÁNICE";
    if (code <= 99) return "BOUŘKA";
    return "";
  };

  // ── Horní lišta nahrávání ─────────────────────────────
  const recBarJsx = recMode === "recording" ? (
    <div style={{ padding: "10px 12px", background: "#1a0000", borderBottom: `2px solid ${COLORS.red}` }}>
      <div onClick={stopRecording} style={{ background: COLORS.red, borderRadius: 10, height: 73, display: "flex", alignItems: "center", padding: "0 12px", cursor: "pointer" }}>
        <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: COLORS.white, textAlign: "left", whiteSpace: "nowrap" }}>Nový segment</span>
        <span style={{ width: 1, height: 32, background: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 30, fontWeight: 700, color: COLORS.white, textAlign: "center" }}>{formatSegTime(recElapsed)}</span>
        <span style={{ width: 1, height: 32, background: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 26, fontWeight: 700, color: COLORS.white, textAlign: "right" }}>Stop</span>
      </div>
    </div>
  ) : recMode === "countdown" ? (
    <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#001a00", borderBottom: `2px solid #2ecc40` }}>
      <div style={{ flex: 1, background: "#1a3a1a", border: `2px solid #2ecc40`, borderRadius: 10, height: 73, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#2ecc40" }}>START ZA</span>
        <span style={{ fontSize: 36, fontWeight: 700, color: "#2ecc40" }}>{recCountdown ?? "…"}</span>
      </div>
      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, height: 73, width: 73, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={cancelRecording}>
        <span style={{ fontSize: 26, color: COLORS.white }}>X</span>
      </div>
    </div>
  ) : (
    <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
      <button onClick={startImmediate} disabled={!lastPos}
        style={{ flex: 1, height: 73, background: lastPos ? "#1a3a1a" : COLORS.bgCard, border: `2px solid ${lastPos ? "#2ecc40" : COLORS.border}`, borderRadius: 10, fontSize: 17, fontWeight: 700, color: lastPos ? "#2ecc40" : COLORS.white, cursor: lastPos ? "pointer" : "default", letterSpacing: 0.5, lineHeight: 1.3 }}>
        Nový segment<br />Start
      </button>
      <button onClick={startCountdown} disabled={!lastPos}
        style={{ flex: 1, height: 73, background: lastPos ? "#1a3a1a" : COLORS.bgCard, border: `2px solid ${lastPos ? "#2ecc40" : COLORS.border}`, borderRadius: 10, fontSize: 17, fontWeight: 700, color: lastPos ? "#2ecc40" : COLORS.white, cursor: lastPos ? "pointer" : "default", letterSpacing: 0.5, lineHeight: 1.3 }}>
        Nový segment<br />10s
      </button>
      <button onClick={doStartRecording} disabled={!lastPos}
        style={{ flex: 1, height: 73, background: lastPos ? "#1a3a1a" : COLORS.bgCard, border: `2px solid ${lastPos ? "#2ecc40" : COLORS.border}`, borderRadius: 10, fontSize: 17, fontWeight: 700, color: lastPos ? "#2ecc40" : COLORS.white, cursor: lastPos ? "pointer" : "default", letterSpacing: 0.5, lineHeight: 1.3 }}>
        Nový segment<br />Po rozjetí
      </button>
    </div>
  );

  // DETAIL view
  if (view === "detail" && detailSeg) {
    const seg = segments.find(s => s.id === detailSeg.id) || detailSeg;
    const prEntry = seg.history.find(h => h.delta === 0);
    const prDate = prEntry ? new Date(prEntry.date).toLocaleDateString("cs-CZ") : null;
    const avgTimes = seg.history.length > 0 ? Math.round(seg.history.reduce((s, h) => s + h.time, 0) / seg.history.length) : null;
    const slowest = seg.history.length > 0 ? Math.max(...seg.history.map(h => h.time)) : null;
    const sortedHistory = [...seg.history].sort((a, b) => a.time - b.time);

    return (
      <div style={overlay}>
        {recBarJsx}

        {/* ── HLAVIČKA ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, gap: 10 }}>
          <button style={{ background: "none", border: "none", color: COLORS.white, fontSize: 20, fontWeight: 700, cursor: "pointer", padding: 0, lineHeight: 1, fontFamily: "Rajdhani, sans-serif" }} onClick={() => setView("list")}>ZPET</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName === seg.id ? (
              <input autoFocus value={editNameText} onChange={e => setEditNameText(e.target.value)}
                onBlur={() => saveNameEdit(seg)} onKeyDown={e => e.key === "Enter" && saveNameEdit(seg)}
                style={{ width: "100%", background: COLORS.bgCard, border: `1px solid ${COLORS.primary}`, borderRadius: 8, color: COLORS.white, fontSize: 20, fontWeight: 700, padding: "4px 8px", fontFamily: "Rajdhani, sans-serif", boxSizing: "border-box" }} />
            ) : (
              <div onClick={() => { setEditingName(seg.id); setEditNameText(seg.name); }}
                style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {seg.name}
              </div>
            )}
            <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
              {seg.distanceKm && <span style={{ fontSize: 17, color: COLORS.white }}>{seg.distanceKm.toFixed(2)} km</span>}
              {seg.elevGain != null && <span style={{ fontSize: 17, color: COLORS.white }}>{seg.elevGain} m převýšení</span>}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── MAPA ─────────────────────────────────────────── */}
          {seg.route && seg.route.length >= 2
            ? <LeafletMap route={seg.route} height={220} />
            : <div style={{ height: 100, background: COLORS.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 17, color: COLORS.white }}>Bez záznamu trasy</span>
              </div>
          }

          <div style={{ padding: "0 16px 80px", display: "flex", flexDirection: "column", gap: 0 }}>

            {(() => {
              // Výpočty pro "O trase"
              const alts = seg.route ? seg.route.filter(p => p.alt != null).map(p => p.alt) : [];
              const minAlt = alts.length ? Math.round(Math.min(...alts)) : null;
              const maxAlt = alts.length ? Math.round(Math.max(...alts)) : null;
              const slope = seg.distanceKm && seg.elevGain ? ((seg.elevGain / (seg.distanceKm * 1000)) * 100).toFixed(1) : null;
              // Směr trasy
              let direction = null;
              if (seg.startLat != null && seg.endLat != null) {
                const dLng = seg.endLng - seg.startLng, dLat = seg.endLat - seg.startLat;
                const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
                const dirs = ["S","SV","V","JV","J","JZ","Z","SZ"];
                direction = dirs[Math.round(((angle % 360) + 360) % 360 / 45) % 8];
              }
              // Statistiky průjezdů
              const bestMaxSpeed = seg.history.length ? Math.max(...seg.history.map(h => h.maxSpeed || 0)) || null : null;
              const bestAccel = seg.history.length ? Math.min(...seg.history.filter(h => h.accel).map(h => h.accel)) || null : null;
              const LABEL = 14, VALUE = Math.round(14 * 1.3); // 30% větší číslo

              const Cell = ({ label, value, unit, color }) => (
                <div style={{ flex: 1, textAlign: "center", padding: "10px 4px" }}>
                  <div style={{ fontSize: LABEL, color: COLORS.white, letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: VALUE, fontWeight: 700, color: color || COLORS.white, lineHeight: 1 }}>
                    {value ?? "—"}{unit ? <span style={{ fontSize: LABEL }}> {unit}</span> : null}
                  </div>
                </div>
              );

              const Divider = () => <div style={{ borderBottom: `1px solid ${COLORS.border}` }} />;
              const Row = ({ children }) => (
                <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
                  {React.Children.map(children, (child, i) => (
                    <>
                      {i > 0 && <div style={{ width: 1, background: COLORS.border, alignSelf: "stretch" }} />}
                      {child}
                    </>
                  ))}
                </div>
              );

              return (
                <>
                  {/* ── O TRASE ───────────────────────────────── */}
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, letterSpacing: 2, paddingTop: 16, paddingBottom: 8 }}>O TRASE</div>
                  <Row>
                    <Cell label="Vzdálenost" value={seg.distanceKm?.toFixed(2)} unit="km" />
                    <Cell label="Převýšení" value={seg.elevGain} unit="m" />
                    <Cell label="Sklon" value={slope} unit="%" />
                  </Row>
                  <Row>
                    <Cell label="Min výška" value={minAlt} unit="m" />
                    <Cell label="Max výška" value={maxAlt} unit="m" />
                    <Cell label="Směr" value={direction} />
                  </Row>
                  <div style={{ fontSize: 17, color: COLORS.white, paddingTop: 8, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
                    Vytvořeno: {new Date(seg.createdAt).toLocaleDateString("cs-CZ")}
                  </div>

                  {/* ── STATISTIKY PRŮJEZDŮ ───────────────────── */}
                  <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, letterSpacing: 2, paddingTop: 16, paddingBottom: 8 }}>STATISTIKY</div>
                  <Row>
                    <Cell label="PR" value={formatSegTime(seg.pr)} color={COLORS.primary} />
                    <Cell label="Datum PR" value={prDate || "—"} />
                    <Cell label="Průjezdů" value={seg.history.length} />
                  </Row>
                  <Row>
                    <Cell label="Průměr" value={avgTimes ? formatSegTime(avgTimes) : null} />
                    <Cell label="Max rychlost" value={bestMaxSpeed} unit={bestMaxSpeed ? "km/h" : null} />
                    <Cell label="0→100" value={bestAccel ? `${(bestAccel/1000).toFixed(1)}s` : null} color={bestAccel ? COLORS.red : null} />
                  </Row>
                </>
              );
            })()}

            {/* ── PRŮJEZDY — seznam ────────────────────────── */}
            <div style={{ paddingTop: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 2, marginBottom: 12 }}>VŠECHNY PRŮJEZDY</div>
              {seg.history.length === 0 && <div style={{ fontSize: 17, color: COLORS.white }}>Žádné průjezdy zatím.</div>}
              {sortedHistory.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", paddingTop: 12, paddingBottom: 12, borderBottom: `1px solid ${COLORS.border}` }}>
                  {/* Pořadí */}
                  <div style={{ width: 32, fontSize: 17, fontWeight: 700, color: i === 0 ? COLORS.primary : COLORS.white }}>#{i + 1}</div>
                  {/* Čas + detaily */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: h.delta === 0 ? COLORS.primary : COLORS.white, lineHeight: 1.2 }}>
                      {formatSegTime(h.time)} {h.delta === 0 && <span style={{ fontSize: 17, color: COLORS.primary }}>PR</span>}
                    </div>
                    <div style={{ fontSize: 17, color: COLORS.white, marginTop: 2 }}>
                      {new Date(h.date).toLocaleDateString("cs-CZ")}
                      {h.temp != null ? `  ${weatherEmoji(h.weatherCode)} ${h.temp}°C` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                      {h.avgSpeed != null && <span style={{ fontSize: 17, color: COLORS.white }}>{h.avgSpeed} km/h prům.</span>}
                      {h.maxSpeed != null && <span style={{ fontSize: 17, color: COLORS.white }}>{h.maxSpeed} km/h max</span>}
                      {h.maxAlt != null && <span style={{ fontSize: 17, color: COLORS.white }}>{h.minAlt != null ? `${h.minAlt}–` : ""}{h.maxAlt} m</span>}
                      {h.accel != null && <span style={{ fontSize: 17, color: COLORS.red }}>0→100: {(h.accel/1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                  {/* Delta */}
                  {h.delta !== 0 && (
                    <div style={{ fontSize: 19, fontWeight: 700, color: h.delta < 0 ? "#2ecc40" : COLORS.red, textAlign: "right" }}>
                      {h.delta < 0 ? "▲ −" : "▼ +"}{formatSegTime(Math.abs(h.delta))}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── SMAZAT tlačítko dole ─────────────────────────── */}
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${COLORS.border}` }}>
          <button onClick={() => deleteSegment(seg.id)}
            style={{ width: "100%", height: 52, background: "none", border: `1px solid ${COLORS.red}`, borderRadius: 12, fontSize: 17, fontWeight: 700, color: COLORS.red, cursor: "pointer" }}>
            SMAZAT SEGMENT
          </button>
        </div>
      </div>
    );
  }

  // LIST view
  return (
    <div style={overlay}>
      {recBarJsx}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary, letterSpacing: 1 }}>SEGMENTY</span>
        <button style={btnClose} onClick={onClose}>X</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {segments.length === 0 && (
          <div style={{ color: COLORS.white, fontSize: 17, textAlign: "center", marginTop: 40, lineHeight: 2 }}>
            Žádné segmenty.<br />Použij tlačítka nahoře pro nahrání prvního segmentu.
          </div>
        )}
        {segments.map(seg => {
          const isActive = activeSegId === seg.id;
          const lastRun = seg.history.length > 0 ? seg.history[seg.history.length - 1] : null;
          const lastDate = lastRun ? new Date(lastRun.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : null;
          const trend = lastRun ? lastRun.delta : null;
          // SVG minitrasa
          const renderMiniRoute = (route) => {
            if (!route || route.length < 2) return null;
            const lats = route.map(p => p.lat), lngs = route.map(p => p.lng);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            const pad = 8, W = 120, H = 60;
            const scaleX = maxLng === minLng ? 1 : (W - pad*2) / (maxLng - minLng);
            const scaleY = maxLat === minLat ? 1 : (H - pad*2) / (maxLat - minLat);
            const scale = Math.min(scaleX, scaleY);
            const pts = route.map(p => [
              pad + (p.lng - minLng) * scale,
              H - pad - (p.lat - minLat) * scale
            ]);
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
            return (
              <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
                <polyline points={pts.map(p => p.join(",")).join(" ")} fill="none" stroke={isActive ? COLORS.primary : COLORS.border} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill="#2ecc40" />
                <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill={COLORS.red} />
              </svg>
            );
          };
          return (
            <div key={seg.id} onClick={() => { setDetailSeg(seg); setView("detail"); setActiveSegId(seg.id); saveActiveSegId(seg.id); onActiveChange(seg); }}
              style={{ background: COLORS.bgCard, borderRadius: 14, border: `1px solid ${isActive ? COLORS.primary : COLORS.border}`, cursor: "pointer", padding: "8px 14px" }}>
              {/* Řádek 1: název + vzdálenost + PR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {seg.name}{seg.distanceKm ? <span style={{ fontSize: 17, fontWeight: 400, color: COLORS.white, marginLeft: 8 }}>{seg.distanceKm.toFixed(1)} km</span> : null}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.white, marginLeft: 12, flexShrink: 0 }}>PR {formatSegTime(seg.pr)}</div>
              </div>
              {/* Řádek 2: datum vlevo, trend uprostřed, čas vpravo */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 23, fontWeight: 600, color: COLORS.white, flex: 1 }}>{lastDate || "—"}</div>
                <div style={{ fontSize: 23, fontWeight: 700, flex: 1, textAlign: "center" }}>
                  {trend !== null && trend !== 0 && (
                    <span style={{ color: trend < 0 ? "#2ecc40" : COLORS.red }}>
                      {trend < 0 ? "▲ −" : "▼ +"}{formatSegTime(Math.abs(trend))}
                    </span>
                  )}
                  {trend === 0 && <span style={{ color: "#2ecc40" }}>PR ▲</span>}
                </div>
                <div style={{ fontSize: 23, fontWeight: 700, color: COLORS.white, flex: 1, textAlign: "right" }}>
                  {lastRun ? formatSegTime(lastRun.time) : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SEGMENT DASHBOARD CELL ─────────────────────────────
function SegmentCell({ activeSeg, runState, onTap }) {
  const formatSegTime = (ms) => {
    if (!ms && ms !== 0) return "—";
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60), sec = s % 60;
    return min > 0 ? `${min}:${String(sec).padStart(2, "0")}` : `${s}.${String(Math.floor((ms % 1000) / 100))}s`;
  };

  // Idle — no active segment
  if (!activeSeg) {
    return (
      <div onClick={onTap} style={{ background: COLORS.primary, borderRadius: 10, padding: "0 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", height: 52, boxSizing: "border-box" }}>
        <span style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Rajdhani, sans-serif" }}>Segment</span>
        <span style={{ fontSize: 29, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif" }}>—</span>
      </div>
    );
  }

  // Active but not running
  if (!runState) {
    return (
      <div onClick={onTap} style={{ background: COLORS.primary, borderRadius: 10, padding: "0 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", height: 52, boxSizing: "border-box" }}>
        <span style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "Rajdhani, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45%" }}>Segment</span>
        <span style={{ fontSize: 29, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "52%", textAlign: "right" }}>{activeSeg.pr ? formatSegTime(activeSeg.pr) : "—"}</span>
      </div>
    );
  }

  // Running — show time + pacer
  const isBetter = runState.pacer !== null && runState.pacer <= 0;
  const isWorse = runState.pacer !== null && runState.pacer > 0;
  const runBg = isBetter ? "#1a4a1a" : isWorse ? "#4a1a1a" : COLORS.primary;
  const runColor = isBetter ? "#2ecc40" : isWorse ? COLORS.red : COLORS.white;
  return (
    <div onClick={onTap} style={{ background: runBg, borderRadius: 10, padding: "0 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", height: 52, boxSizing: "border-box", border: `2px solid ${runColor}` }}>
      <span style={{ fontSize: 17, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: 1, fontFamily: "Rajdhani, sans-serif" }}>Segment</span>
      <span style={{ fontSize: 29, fontWeight: 700, color: runColor, fontFamily: "Rajdhani, sans-serif" }}>
        {formatSegTime(runState.elapsed)}
        {runState.pacer !== null && <span style={{ fontSize: 17, fontWeight: 700, marginLeft: 4, opacity: 0.9 }}>{isBetter ? " −" : " +"}{formatSegTime(Math.abs(runState.pacer))}</span>}
      </span>
    </div>
  );
}

// ─── QUICK GREETING MODAL ───────────────────────────────
function QuickGreetingModal({ onClose, lastPos, altitude, riderName: initialName }) {
  const [step, setStep] = useState("photo");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [selfieData, setSelfieData] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [temperature, setTemperature] = useState(null);
  const [signature, setSignature] = useState(() => {
    try { return localStorage.getItem("motogauge_greeting_signature") || initialName || ""; } catch { return initialName || ""; }
  });
  const [editingSig, setEditingSig] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [sigInput, setSigInput] = useState(signature);
  const [rememberSig, setRememberSig] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Demo data — zobrazeno dokud GPS/API neodpoví
  const demoLocation = "Brno";
  const demoAlt = 247;
  const demoTemp = 22;
  const demoSig = "Martin";

  const altText = altitude !== null && altitude !== undefined ? Math.round(altitude) + " m n.m." : (demoAlt + " m n.m.");
  const displayLocation = locationLabel || demoLocation;
  const displayTemp = temperature !== null ? temperature : demoTemp;
  const displaySig = signature || demoSig;
  const infoLine = [displayLocation, altText, displayTemp + "°C"].join("  ·  ");

  // Reverse geocode
  useEffect(() => {
    if (!lastPos) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lastPos.lat}&lon=${lastPos.lng}&format=json`)
      .then(r => r.json())
      .then(d => {
        const a = d.address || {};
        const label = a.city || a.town || a.village || a.hamlet || a.county || a.state || "";
        if (label) setLocationLabel(label);
      }).catch(() => {});
  }, []);

  // Fetch temperature
  useEffect(() => {
    if (!lastPos) return;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lastPos.lat.toFixed(4)}&longitude=${lastPos.lng.toFixed(4)}&current_weather=true`)
      .then(r => r.json())
      .then(d => {
        if (d.current_weather?.temperature !== undefined) setTemperature(Math.round(d.current_weather.temperature));
      }).catch(() => {});
  }, []);

  // Camera stream — cleanup on unmount and facingMode/step change
  const activeStreamRef = useRef(null);

  const startCamera = () => {
    // getUserMedia musí být voláno přímo v event handleru (iOS requirement)
    navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })
      .then(stream => {
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach(t => t.stop());
        }
        activeStreamRef.current = stream;
        setCameraStream(stream);
        setCameraStarted(true);
        setCameraReady(false);
      })
      .catch(() => { setCameraReady(false); });
  };

  useEffect(() => {
    if (step !== "photo") return;
    let cancelled = false;
    setCameraReady(false);
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(t => t.stop());
      activeStreamRef.current = null;
    }
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        activeStreamRef.current = stream;
        setCameraStream(stream);
      } catch(e) { setCameraReady(false); }
    })();
    return () => {
      cancelled = true;
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(t => t.stop());
        activeStreamRef.current = null;
      }
      setCameraStream(null);
      setCameraReady(false);
    };
  }, [step, facingMode]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.onloadedmetadata = () => setCameraReady(true);
    }
  }, [cameraStream]);

  const takeSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const tmp = document.createElement("canvas");
    tmp.width = video.videoWidth || 1280; tmp.height = video.videoHeight || 960;
    const tc = tmp.getContext("2d");
    if (facingMode === "user") {
      tc.save(); tc.scale(-1, 1); tc.drawImage(video, -tmp.width, 0, tmp.width, tmp.height); tc.restore();
    } else { tc.drawImage(video, 0, 0, tmp.width, tmp.height); }
    setSelfieData(tmp.toDataURL("image/jpeg", 0.93));
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setStep("preview");
  };

  // Draw final postcard — same layout as ShareModal
  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 1080, H = 1440;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const infoY = Math.round(H * 0.75); // bottom quarter starts here

    const doRender = () => {
      // ── Foto přes celou kartu ────────────────────────────
      ctx.drawImage(bgImg, 0, 0, W, H);

      // ── Header overlay + "POZDRAV Z CEST" ───────────────
      const headerH = 180;
      const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH + 60);
      headerGrad.addColorStop(0, "rgba(0,0,0,0.82)");
      headerGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, W, headerH + 60);

      ctx.textAlign = "center";
      ctx.font = "bold 118px Arial Black, Arial";
      ctx.shadowColor = "#000000"; ctx.shadowBlur = 24; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("POZDRAV Z CEST", W/2, 140);
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

      // ── Spodní info panel ────────────────────────────────
      const infoH = H - infoY;
      const infoGrad = ctx.createLinearGradient(0, infoY, 0, H);
      infoGrad.addColorStop(0, "rgba(80,80,80,0)");
      infoGrad.addColorStop(0.15, "rgba(80,80,80,0.5)");
      infoGrad.addColorStop(1, "rgba(40,40,40,0.5)");
      ctx.fillStyle = infoGrad;
      ctx.fillRect(0, infoY, W, infoH);

      const pad = 60;

      // ── Podpis — vpravo nad spodním blokem ───────────────
      if (displaySig) {
        const nameX = W - pad - 20;
        const nameY = infoY - 180;
        ctx.save();
        ctx.translate(nameX, nameY);
        ctx.rotate(-0.175);
        ctx.shadowColor = "#000"; ctx.shadowBlur = 14; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
        ctx.font = "bold 108px 'Pacifico', cursive";
        ctx.fillStyle = "#ffffffee";
        ctx.textAlign = "right";
        ctx.fillText(displaySig, 0, 0);
        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.restore();
      }

      // ── Info blok: poloha · výška · teplota ─────────────
      let y = infoY + 48;
      const blockH = 130;
      ctx.fillStyle = "rgba(80,80,80,0.5)";
      ctx.beginPath(); ctx.roundRect(pad - 16, y - 12, W - pad*2 + 32, blockH + 24, 14); ctx.fill();

      // Poloha — velký řádek
      ctx.textAlign = "left";
      ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
      ctx.font = "bold 34px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText("POLOHA", pad, y);
      y += 44;
      ctx.font = "bold 58px Arial";
      ctx.fillStyle = "#ffffff";
      const locVal = displayLocation;
      ctx.fillText(locVal.length > 20 ? locVal.slice(0, 20) + "…" : locVal, pad, y);
      ctx.shadowBlur = 0;

      // Výška + teplota vpravo na stejném řádku
      const rightItems = [
        { l: "VÝŠKA", v: altText },
        { l: "TEPLOTA", v: displayTemp + "°C" },
      ];
      {
        const colW = (W - pad*2) / rightItems.length;
        rightItems.forEach((item, i) => {
          const cx = pad + (W - pad*2) / 2 + colW * i;
          ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
          ctx.font = "bold 28px Arial";
          ctx.fillStyle = "rgba(255,255,255,0.65)";
          ctx.textAlign = "left";
          ctx.fillText(item.l, cx + (i > 0 ? 22 : 0), infoY + 60);
          ctx.font = "bold 50px Arial";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(item.v, cx + (i > 0 ? 22 : 0), infoY + 108);
          if (i > 0) {
            ctx.strokeStyle = "#ffffff20"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, infoY + 30); ctx.lineTo(cx, infoY + 130); ctx.stroke();
          }
          ctx.shadowBlur = 0;
        });
      }

      // Footer: QR kód vlevo + URL vpravo
      y = infoY + blockH + 48 + 24;
      ctx.strokeStyle = "#ffffff10"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      y += 20;

      // Branding — URL text
      ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
      ctx.textAlign = "left";
      ctx.font = "bold 32px Arial"; ctx.fillStyle = "#ff6b00";
      ctx.fillText("Trip", pad, y + 38);
      ctx.beginPath(); ctx.roundRect(pad + 62, y + 12, 84, 36, 6); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillText("Grip", pad + 72, y + 38);
      ctx.font = "28px Arial"; ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText("tripgrip.app", pad, y + 72);
      ctx.shadowBlur = 0;
    };

    const bgSrc = selfieData || null;
    const bgImg = new Image();
    bgImg.src = bgSrc;
    bgImg.onload = doRender;
  };

  useEffect(() => {
    if (step === "preview") setTimeout(drawCard, 50);
  }, [step, signature, locationLabel, temperature]);

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setShareError(null);
    canvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], "pozdrav-z-cest.png", { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Pozdrav z cest — TripGrip", text: locationLabel || "" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "pozdrav-z-cest.png"; a.click();
        }
      } catch(e) {
        if (e?.name !== "AbortError") setShareError("Sdílení selhalo. Zkus znovu.");
      }
    }, "image/png");
  };

  const confirmSig = () => {
    setSignature(sigInput);
    if (rememberSig) { try { localStorage.setItem("motogauge_greeting_signature", sigInput); } catch {} }
    setEditingSig(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10500, background: "#000", display: "flex", flexDirection: "column", fontFamily: "Rajdhani, sans-serif" }}
      onClick={step === "preview" ? undefined : onClose}>

      {/* ── FOTO STEP ── živý náhled pohlednice ─────────────── */}
      {step === "photo" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000", position: "relative" }} onClick={e => e.stopPropagation()}>

          {/* Ilustrační obrázek — demo pozadí dokud kamera není aktivní */}
          <div style={{ position: "absolute", inset: 0, background: "#000", zIndex: 0 }} />
          {/* Kamera na popředí */}
          <video ref={videoRef} autoPlay playsInline muted
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: facingMode === "user" ? "scaleX(-1)" : "none", zIndex: 1, opacity: cameraReady ? 1 : 0 }} />

          {/* POZDRAV Z CEST — nahoře, lineární přechod */}
          <div style={{ position: "relative", zIndex: 2, background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)", padding: "20px 16px 28px", textAlign: "center" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap');.pzc-title{font-family:'Oswald',Impact,'Arial Narrow',Arial,sans-serif;font-weight:700;font-size:40px;letter-spacing:3px;color:rgba(255,255,255,0.2);-webkit-text-stroke:2.5px #fff;paint-order:stroke fill;text-shadow:none;line-height:1.1;}`}</style>
            <div className="pzc-title">POZDRAV Z CEST</div>
          </div>

          {/* Průhledná střední část */}
          <div style={{ flex: 1, position: "relative", zIndex: 1 }} />

          {/* Spodní lišta — moderní camera app styl */}
          <div style={{ position: "relative", zIndex: 2, background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0) 100%)", paddingTop: 32 }} onClick={e => e.stopPropagation()}>

            {/* Podpis — střed, Pacifico */}
            <div style={{ textAlign: "right", paddingRight: 24, marginBottom: 12, minHeight: 54 }}>
              {editingSig ? (
                <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <input autoFocus value={sigInput} onChange={e => setSigInput(e.target.value)}
                    placeholder="Tvůj podpis…"
                    style={{ background: "rgba(255,255,255,0.08)", border: "none", borderBottom: "2px solid #ff6b00", borderRadius: 0, padding: "6px 0", color: "#fff", fontSize: 32, fontFamily: "'Pacifico', cursive", width: "100%", boxSizing: "border-box", outline: "none", textAlign: "right" }} />
                  {/* Zapamatovat — větší, výraznější */}
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, cursor: "pointer" }}>
                    <span style={{ fontSize: 17, color: rememberSig ? "#ff6b00" : "#888", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, letterSpacing: 0.5 }}>ZAPAMATOVAT</span>
                    <div onClick={e => { e.preventDefault(); setRememberSig(r => !r); }}
                      style={{ width: 48, height: 28, borderRadius: 14, background: rememberSig ? "#ff6b00" : "#333", border: `2px solid ${rememberSig ? "#ff6b00" : "#555"}`, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: rememberSig ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </div>
                  </label>
                  <div onClick={confirmSig}
                    style={{ background: "#ff6b00", borderRadius: 14, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px #ff6b0055" }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>ULOŽIT PODPIS</span>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setSigInput(signature); setEditingSig(true); }} style={{ cursor: "pointer", display: "inline-block", transform: "rotate(-5deg)", transformOrigin: "right center", paddingRight: 4 }}>
                  <span style={{ fontSize: 48, fontFamily: "'Pacifico', cursive", color: "#fff", textShadow: "2px 3px 12px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8)" }}>{displaySig}</span>
                </div>
              )}
            </div>

            {/* Data: poloha · výška · teplota */}
            <div style={{ display: "flex", gap: 0, justifyContent: "space-between", marginBottom: 20, padding: "0 16px" }}>
              {[
                { l: "POLOHA", v: displayLocation.slice(0, 14) },
                { l: "VÝŠKA", v: altText },
                { l: "TEPLOTA", v: displayTemp + "°C" },
              ].map((d, i) => (
                <div key={i} style={{ textAlign: "center", flex: 1, borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
                  <div style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", fontWeight: 700, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>{d.l}</div>
                  <div style={{ fontSize: 30, color: "#fff", fontWeight: 700, fontFamily: "Rajdhani, sans-serif", lineHeight: 1.1, textShadow: "1px 2px 6px rgba(0,0,0,0.9)" }}>{d.v}</div>
                </div>
              ))}
            </div>

            {/* Hlavní lišta kamer — tři sekce: ZPĚT | velké tlačítko | přepínač */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px 36px" }}>

              {/* ZPĚT */}
              <div onClick={onClose}
                style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "Rajdhani, sans-serif" }}>X</span>
              </div>

              {/* Hlavní tlačítko vyfotit — otevře kameru nebo vyfotí */}
              <div onClick={() => {
                  if (cameraReady) {
                    takeSelfie();
                  } else {
                    const video = videoRef.current;
                    if (!video) return;
                    const p = navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
                    // Nastavíme srcObject ihned jak stream přijde — iOS to akceptuje
                    p.then(stream => {
                      activeStreamRef.current = stream;
                      video.srcObject = stream;
                      video.onloadedmetadata = () => setCameraReady(true);
                      setCameraStarted(true);
                    }).catch(() => {});
                  }
                }}
                style={{ width: 80, height: 80, borderRadius: "50%", background: "#fff", border: "4px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 0 6px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.5)", transition: "all 0.2s" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: cameraReady ? "rgba(0,0,0,0.08)" : COLORS.primary }} />
              </div>

              {/* Přepínač přední / zadní — ikona otočení */}
              <div onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}
                style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif" }}>FLIP</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "Rajdhani, sans-serif", letterSpacing: 0.5 }}>{facingMode === "user" ? "PŘEDNÍ" : "ZADNÍ"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW STEP ── canvas + sdílet ─────────────────── */}
      {step === "preview" && (
        <>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }} onClick={e => e.stopPropagation()}>
            <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 12, boxShadow: "0 0 40px rgba(212,168,64,0.3)" }} />
          </div>
          <div style={{ flexShrink: 0, padding: "0 20px 44px" }} onClick={e => e.stopPropagation()}>
            <div onClick={handleShare} style={{ background: "#ff6b00", borderRadius: 16, height: 60, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 10, boxShadow: "0 6px 24px #ff6b0088" }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>SDÍLET</span>
            </div>
            <button onClick={onClose} style={{ width: "100%", padding: "14px", background: "transparent", border: "1px solid #2a2a3a", borderRadius: 14, color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "Rajdhani, sans-serif" }}>ZAVŘÍT</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── STORY MODAL — AI příběh z cest ──────────────────────
const STORY_STYLES = [
  { id: "cestopis", label: "CESTOPIS", withData: false, prompt: "Napiš cestopisný příběh z motocyklové jízdy. Popisný styl, důraz na místa, krajinu, geografii. Bez technických dat o rychlosti. Maximálně 4 věty v první osobě." },
  { id: "kamaradi", label: "KAMARÁDI", withData: false, prompt: "Napiš příběh z motocyklové jízdy jako zprávu kamarádům. Uvolněný, vtipný tón, žádná formálnost. Bez technických dat. Maximálně 4 věty v první osobě." },
  { id: "crazy",    label: "CRAZY",    withData: true,  prompt: "Napiš šílený, přehnaný, humorný příběh z motocyklové jízdy. Nadsázka, dramatické zvolání, absurdní přirovnání, chaos. Klidně přehánět data. Maximálně 4 věty v první osobě." },
  { id: "rodina",   label: "RODINA",   withData: false, prompt: "Napiš příběh z motocyklové jízdy pro rodinu. Klidný, bezpečný tón, žádné rychlosti. Důraz na pohodu a krajinu. Maximálně 4 věty v první osobě." },
  { id: "logbook",  label: "LOGBOOK",  withData: true,  prompt: "Napiš precizní logbook záznam z motocyklové jízdy. Strukturovaný, věcný, všechna dostupná data přirozeně zakomponuj. Maximálně 4 věty v první osobě." },
  { id: "poeta",    label: "POETA",    withData: false, prompt: "Napiš poetický příběh z motocyklové jízdy. Melancholický, romantický tón, emoce, atmosféra, svoboda. Maximálně 4 věty v první osobě." },
];

function StoryModal({ onClose, counter, accelHistory }) {
  const [activeStyle, setActiveStyle] = useState("cestopis");
  const [stories, setStories] = useState({});
  const [loading, setLoading] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [noteListening, setNoteListening] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [copied, setCopied] = useState(false);
  const noteRecognitionRef = useRef(null);
  const noteDebounceRef = useRef(null);

  const tripData = counter || {};
  const currentStory = stories[activeStyle] || null;

  const fmt = (m) => m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m||0)} m`;
  const fmtT = (ms) => { const s=Math.floor((ms||0)/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}min`:`${m} min`; };

  const buildPrompt = (style, note) => {
    const start = tripData.startLabel || "výchozího místa";
    const end = tripData.endLabel || "cíle";
    const dist = fmt(tripData.distance);
    const time = fmtT(tripData.time);
    const maxSpd = Math.round(tripData.maxSpeed || 0);
    const avgSpd = tripData.speedCount > 0 ? Math.round(tripData.speedSum / tripData.speedCount) : 0;
    const ascent = Math.round(tripData.ascent || 0);
    const maxAlt = tripData.maxAlt !== null && tripData.maxAlt !== undefined ? Math.round(tripData.maxAlt) : null;
    const bestAccel = accelHistory && accelHistory.length > 0 ? Math.min(...accelHistory.map(a => a.time || Infinity)) : null;

    let dataStr = `Trasa: ${start} → ${end}\nVzdálenost: ${dist}\nČas jízdy: ${time}`;
    if (style.withData) {
      if (maxSpd > 0) dataStr += `\nMax rychlost: ${maxSpd} km/h`;
      if (avgSpd > 0) dataStr += `\nPrůměrná rychlost: ${avgSpd} km/h`;
      if (bestAccel && isFinite(bestAccel)) dataStr += `\nNejlepší 0→100: ${(bestAccel/1000).toFixed(1)} s`;
    }
    if (ascent > 10) dataStr += `\nNastoupáno: ${ascent} m`;
    if (maxAlt !== null) dataStr += `\nMax výška: ${maxAlt} m n.m.`;
    if (note && note.trim()) dataStr += `\n\nDůležité: Začni příběh větou která přirozeně zahrnuje tuto poznámku: "${note.trim()}". Teprve pak pokračuj příběhem z dat jízdy.`;
    if (note && note.trim()) {
      return `Uživatel napsal začátek příběhu z motocyklové jízdy: "${note.trim()}"\n\nDopokračuj přirozeně v tomto příběhu. ${style.prompt}\n\nNepřepisuj začátek, navazuj přímo. Celý příběh (včetně začátku) max 4 věty.\n\nData z jízdy:\n${dataStr}`;
    }
    return `${style.prompt}\n\nPravidla:\n- Žádné klišé, žádné úvody jako "Tento výlet byl..." nebo "Dnes jsem..."\n- Začni přímo akcí nebo atmosférou\n\nData:\n${dataStr}`;
  };

  const OFFLINE = {
    cestopis: (d) => `Z ${d.start} vede cesta přes zvlněné kopce až do ${d.end} — ${d.dist} krajiny, která se mění pomalu a spolehlivě. Stará vesnička za prvním průsmykem, pak les, pak otevřená rovina. Po ${d.time} v sedle jsem dorazil tam, kde silnice končí u tržiště.`,
    racing:   (d) => `Výjezd z ${d.start}, hned první rovinka — ${d.maxSpd}, motor táhne bez zaváhání. ${d.dist} za ${d.time}, průměr ${d.avgSpd}. Čísla říkají vše.`,
    kamaradi: (d) => `Tak jo, ${d.dist} z ${d.start} do ${d.end} za ${d.time} — mohlo být hůř, mohlo být líp. Dorazil jsem celý, motorka taky, to se počítá.`,
    rodina:   (d) => `Krásná jízda z ${d.start} do ${d.end}, ${d.dist} po hezkých silnicích. Počasí přálo, cesta byla klidná. Po ${d.time} jsem dorazil v pořádku.`,
    logbook:  (d) => `Výjezd: ${d.start}. Cíl: ${d.end}. Vzdálenost: ${d.dist}. Čas: ${d.time}. Max rychlost: ${d.maxSpd}, průměr: ${d.avgSpd}. Stav techniky: bez závad.`,
    poeta:    (d) => `Za ${d.start} se silnice ztrácí v mlze a já s ní — ${d.dist} mezi nebem a asfaltem, ${d.time} ticha přerušovaného jen větrem. ${d.end} přišlo příliš brzy.`,
    crazy:    (d) => `POZOR SVĚTE — vyrazil jsem z ${d.start} jak vystřelený z katapultu, ${d.dist} zmizelo pod koly dřív než jsem stihnul zamrkat! ${d.time} čistého šílenství, motor řval jak rozezlený drak, ${d.maxSpd} bylo teprve zahřívání. ${d.end} mě přivítalo s úlevou že jsem vůbec dorazil.`,
  };

  const generate = async (styleId, note) => {
    const style = STORY_STYLES.find(s => s.id === styleId);
    setLoading(true);
    const d = {
      start: tripData.startLabel || "výchozího místa",
      end: tripData.endLabel || "cíle",
      dist: fmt(tripData.distance),
      time: fmtT(tripData.time),
      maxSpd: `${Math.round(tripData.maxSpeed||0)} km/h`,
      avgSpd: tripData.speedCount>0 ? `${Math.round(tripData.speedSum/tripData.speedCount)} km/h` : "—",
    };
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, messages: [{ role: "user", content: buildPrompt(style, note) }] }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error("err");
      const text = (data.content||[]).find(b=>b.type==="text")?.text||"";
      if (!text) throw new Error("empty");
      setStories(p => ({ ...p, [styleId]: text.trim() }));
    } catch(e) {
      const fn = OFFLINE[styleId] || OFFLINE.cestopis;
      const base = fn(d);
      const withNote = note && note.trim()
        ? `${note.trim()} ${base}`
        : base;
      setStories(p => ({ ...p, [styleId]: withNote }));
    }
    setLoading(false);
  };

  useEffect(() => { generate("cestopis", ""); }, []);

  const switchStyle = (styleId) => {
    setActiveStyle(styleId);
    if (!stories[styleId]) generate(styleId, userNote);
  };

  const handleNoteChange = (val) => {
    setUserNote(val);
    // Invalidovat cache aktuálního stylu — uživatel musí zmáčknout ↺ pro regeneraci
  };

  const refreshWithNote = () => {
    setStories(p => { const u = {...p}; delete u[activeStyle]; return u; });
    generate(activeStyle, userNote);
  };

  const toggleNoteVoice = () => {
    if (noteListening) { noteRecognitionRef.current?.stop(); setNoteListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "cs-CZ"; r.continuous = true; r.interimResults = false;
    r.onresult = (e) => setUserNote(Array.from(e.results).map(r=>r[0].transcript).join(" "));
    r.onend = () => setNoteListening(false);
    r.onerror = () => setNoteListening(false);
    noteRecognitionRef.current = r; r.start(); setNoteListening(true);
  };

  const shareStory = async () => {
    if (!currentStory) return;
    try {
      await navigator.clipboard.writeText(currentStory);
    } catch(e) {
      const ta = document.createElement("textarea");
      ta.value = currentStory;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10500, background: COLORS.bg, fontFamily: "Rajdhani, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Zavřít */}
      <div onClick={onClose} style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 12px)", right: 14, width: 48, height: 48, borderRadius: 12, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, fontWeight: 700, color: COLORS.white, zIndex: 2, fontFamily: "Rajdhani, sans-serif" }}>X</div>

      {/* Overlay okno poznámky */}
      {noteOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: COLORS.bgCard, borderRadius: "20px 20px 0 0", padding: "20px 16px calc(env(safe-area-inset-bottom,0px) + 20px)", border: `1px solid ${COLORS.primary}44` }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, letterSpacing: 2, marginBottom: 12 }}>POZNÁMKA</div>
            <textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              autoFocus
              placeholder="Začni příběh sám… Vyrážíme s Pepíkem a Honzou…"
              maxLength={300}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box",
                background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: "12px 14px",
                color: COLORS.white, fontSize: 20, fontWeight: 600,
                fontFamily: "Rajdhani, sans-serif", lineHeight: 1.5,
                resize: "none", outline: "none", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => { setNoteOpen(false); setNoteListening(false); noteRecognitionRef.current?.stop(); }}
                style={{ flex: 1, height: 52, borderRadius: 12, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white }}>ZRUŠIT</span>
              </div>
              <div onClick={() => {
                  const note = noteInput;
                  setUserNote(note);
                  setNoteOpen(false);
                  setNoteListening(false);
                  noteRecognitionRef.current?.stop();
                  setStories(p => { const u = {...p}; delete u[activeStyle]; return u; });
                  generate(activeStyle, note);
                }}
                style={{ flex: 2, height: 52, borderRadius: 12, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 1 }}>PŘIDAT DO PŘÍBĚHU</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vygenerovaný text */}
      <div style={{ flex: 1, overflowY: "auto", padding: "calc(env(safe-area-inset-top,0px) + 14px) 16px 12px" }}>
        {loading && !currentStory ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, letterSpacing: 2 }}>PÍŠU…</div>
          </div>
        ) : (
          <div style={{ fontSize: 20, color: COLORS.white, fontWeight: 600, lineHeight: 1.65, fontStyle: "italic" }}>
            {currentStory || ""}
            
          </div>
        )}
      </div>

      {/* Styly */}
      <div style={{ flexShrink: 0, display: "flex", gap: 6, overflowX: "auto", padding: "0 12px 8px" }}>
        {STORY_STYLES.map(s => {
          const isActive = s.id === activeStyle;
          return (
            <div key={s.id} onClick={() => switchStyle(s.id)} style={{ borderRadius: 10, padding: "7px 12px", flexShrink: 0, background: isActive ? `${COLORS.primary}22` : COLORS.bgCard, border: `1px solid ${isActive ? COLORS.primary : COLORS.border}`, cursor: "pointer" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: isActive ? COLORS.primary : COLORS.white, letterSpacing: 1 }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Poznámka tlačítko */}
      <div style={{ flexShrink: 0, padding: "0 12px 8px" }}>
        <div onClick={() => { setNoteInput(userNote); setNoteOpen(true); }}
          style={{ height: 48, borderRadius: 10, background: COLORS.bgCard, border: `1px solid ${userNote ? COLORS.primary + "88" : COLORS.border}`, display: "flex", alignItems: "center", padding: "0 14px", cursor: "pointer", overflow: "hidden" }}>
          {userNote
            ? <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.white, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userNote}</span>
            : <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.white }}>+ Přidat poznámku…</span>
          }
        </div>
      </div>

      {/* Overlay editace příběhu */}
      {editOpen && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: COLORS.bgCard, borderRadius: "20px 20px 0 0", padding: "20px 16px calc(env(safe-area-inset-bottom,0px) + 20px)", border: `1px solid ${COLORS.primary}44` }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, letterSpacing: 2, marginBottom: 12 }}>EDITOVAT PŘÍBĚH</div>
            <textarea
              value={editInput}
              onChange={e => setEditInput(e.target.value)}
              autoFocus
              rows={6}
              style={{
                width: "100%", boxSizing: "border-box",
                background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: "12px 14px",
                color: COLORS.white, fontSize: 18, fontWeight: 600,
                fontFamily: "Rajdhani, sans-serif", fontStyle: "italic", lineHeight: 1.5,
                resize: "none", outline: "none", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => setEditOpen(false)}
                style={{ flex: 1, height: 52, borderRadius: 12, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white }}>ZRUŠIT</span>
              </div>
              <div onClick={() => { if (editInput.trim()) setStories(p => ({ ...p, [activeStyle]: editInput.trim() })); setEditOpen(false); }}
                style={{ flex: 2, height: 52, borderRadius: 12, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 1 }}>ULOŽIT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDITOVAT + SDÍLET */}
      <div style={{ flexShrink: 0, padding: "0 12px calc(env(safe-area-inset-bottom,0px) + 14px)", display: "flex", gap: 8 }}>
        <div onClick={() => { setEditInput(currentStory || ""); setEditOpen(true); }}
          style={{ flex: 1, height: 56, borderRadius: 14, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white }}>EDITOVAT</span>
        </div>
        <div onClick={shareStory} style={{ flex: 1, height: 56, borderRadius: 14, background: copied ? "#2ecc40" : COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 1 }}>{copied ? "ZKOPÍROVÁNO" : "SDÍLET"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ACCEL HISTORY MODAL ─────────────────────────────────
function AccelHistoryModal({ history, onClose }) {
  const getT = (item, key) => {
    if (item.times?.[key]) return item.times[key];
    if (key === "0_100") return item.time || null;
    return null;
  };
  const best100 = history.length ? Math.min(...history.map(h => getT(h,"0_100")).filter(Boolean), Infinity) : Infinity;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10500, background: COLORS.bg, fontFamily: "Rajdhani, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 10px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.red, letterSpacing: 2 }}>ZRYCHLENÍ</div>
        <div onClick={onClose} style={{ width: 52, height: 52, borderRadius: 14, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif" }}>X</div>
      </div>
      {/* Column headers */}
      <div style={{ flexShrink: 0, display: "flex", padding: "0 16px 6px", gap: 4 }}>
        <div style={{ flex: 2, fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 1 }}>DATUM / ČAS</div>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 1, textAlign: "right" }}>0→100</div>
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px" }}>
        {history.length === 0 ? (
          <div style={{ textAlign: "center", color: COLORS.white, fontSize: 17, marginTop: 60 }}>Žádná měření</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...history].reverse().map((item, i) => {
              const t100 = getT(item, "0_100");
              const d = new Date(item.date);
              const dateStr = d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
              const timeStr = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
              const isBest = t100 && t100 === best100;
              return (
                <div key={i} style={{ background: COLORS.bgCard, borderRadius: 12, padding: "10px 14px", border: `1px solid ${isBest ? COLORS.red : COLORS.border}`, display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 17, color: COLORS.white, fontWeight: 600, lineHeight: 1.2 }}>{dateStr}</div>
                    <div style={{ fontSize: 18, color: COLORS.white, fontWeight: 700, lineHeight: 1.2 }}>{timeStr}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color: isBest ? COLORS.red : COLORS.white, lineHeight: 1 }}>{t100 ? formatAccel(t100) : "—"}</div>
                    {isBest && <div style={{ fontSize: 17, color: COLORS.red, fontWeight: 700, letterSpacing: 1 }}>BEST</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────
export default function MotoGauge() {
  const [speed, setSpeed] = useState(0);
  const [heartbeat, setHeartbeat] = useState(1);
  const [maxSpeed1m, setMaxSpeed1m] = useState(0);
  const [altitude, setAltitude] = useState(null);
  const [lean, setLean] = useState(0);

  const [gpsActive, setGpsActive] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [lastAccel, setLastAccel] = useState(null);
  const [accelLiveTime, setAccelLiveTime] = useState(null); // live elapsed ms during 0→100
  const accelLiveRef = useRef(null); // interval for live timer
  const [accelHistory, setAccelHistory] = useState(() => loadAccelHistory());
  // Multi-range accel results: { "0_100": ms, "0_60": ms, ... }
  const [accelResults, setAccelResults] = useState({});
  const [accelLiveResults, setAccelLiveResults] = useState({});
  const [accelFinalDisplay, setAccelFinalDisplay] = useState(null); // ms, shown 30s after measurement
  const accelFinalTimer = useRef(null);
  const accelMilestones = useRef({}); // { 60: timestamp, 100: timestamp, ... } during current run
  // Roll-on trackers: { "60_120": { startTime, active }, "100_200": { startTime, active } }
  const rollOnRef = useRef({});
  const [counters, setCounters] = useState(() => { const c = {}; COUNTER_TYPES.forEach(t => { c[t] = loadCounter(t); }); return c; });
  const [swState, setSwState] = useState("idle"); // idle | menu | countdown | waitGo | running | done
  const [swCountdown, setSwCountdown] = useState(10);
  const [swTime, setSwTime] = useState(0);
  const [swHistory, setSwHistory] = useState(() => loadStopwatchHistory());
  const swSpeedSamples = useRef([]); // {speed, time} samples during measurement
  const swMaxSpeed = useRef(0);
  const swMaxLeanL = useRef(0);
  const swMaxLeanR = useRef(0);
  const swStartPos = useRef(null);
  const swEndPos = useRef(null);
  const swResult = useRef({ time: 0, maxSpeed: 0, avgSpeed: 0 });
  const [detailCounter, setDetailCounter] = useState(null);
  const [showAccelHistory, setShowAccelHistory] = useState(false);
  const [showSwHistory, setShowSwHistory] = useState(false);
  const [triviaEnabled, setTriviaEnabled] = useState(() => { try { return localStorage.getItem("motogauge_trivia_enabled") === "true"; } catch (e) { return false; } });
  const [englishEnabled, setEnglishEnabled] = useState(() => { try { return localStorage.getItem("motogauge_english_enabled") === "true"; } catch (e) { return false; } });
  const triviaDisableRef = useRef(null);
  const englishDisableRef = useRef(null);
  const [permRequested, setPermRequested] = useState(() => { try { return localStorage.getItem("motogauge_perm_requested") === "true"; } catch { return false; } });
  const [riderName, setRiderName] = useState(() => { try { return localStorage.getItem("motogauge_rider_name") || ""; } catch { return ""; } });
  const leanCalibrationRef = useRef(loadLeanCalibration());
  const [autoCalibStatus, setAutoCalibStatus] = useState("");
  const autoCalibSamples = useRef([]);
  const autoCalibStableStart = useRef(null);
  const autoCalibDone = useRef(false);

  // ── Demo mode (manual slider control) ─────────────────
  const [demoMode, setDemoMode] = useState(false);
  const [demoSliderSpeed, setDemoSliderSpeed] = useState(0);
  const [demoValues, setDemoValues] = useState({
    speed: 0, maxSpeed: 0, lean: 0,
    altitude: 350, accel: 0,
  });
  const demoModeRef = useRef(false);
  const demoMaxSpeedRef = useRef(0);
  const demoSpeedHistory = useRef([]); // {speed, time} for demo 1min tracking
  const demoAccelStartRef = useRef(null);
  const demoAccelTimeRef = useRef(0);
  const demoPrevSpeedRef = useRef(0);
  const toggleDemo = useCallback(() => {
    setDemoMode(p => {
      demoModeRef.current = !p;
      if (!p) {
        demoMaxSpeedRef.current = 0; demoAccelStartRef.current = null; demoAccelTimeRef.current = 0; demoPrevSpeedRef.current = 0; setDemoSliderSpeed(0);
        // Nastavit demo data do trip counteru a lastPos
        const demoTrip = {
          ...createEmptyCounter("trip"),
          distance: 87400,
          time: 5820000,
          maxSpeed: 143,
          speedSum: 118 * 290,
          speedCount: 290,
          ascent: 620,
          descent: 580,
          maxAlt: 892,
          minAlt: 312,
          startLabel: "Karlovy Vary",
          endLabel: "Mariánské Lázně",
        };
        setCounters(prev => ({ ...prev, trip: demoTrip }));
        lastPos.current = { lat: 49.965, lng: 12.701, time: Date.now() };
      }
      return !p;
    });
  }, []);
  const demoSliderRef = useRef(0);
  const handleDemoSpeedChange = useCallback((spd) => {
    demoSliderRef.current = spd;
    setDemoSliderSpeed(spd);
  }, []);
  // Derive demo values from slider speed — use ref to avoid interval restart
  useEffect(() => {
    if (!demoMode) return;
    let prevSpd = 0;
    const iv = setInterval(() => {
      const spd = demoSliderRef.current;
      const now = Date.now() / 1000;
      const t = T();
      // Track 1-min max speed for demo
      demoSpeedHistory.current.push({ speed: spd, time: t });
      demoSpeedHistory.current = demoSpeedHistory.current.filter(e => t - e.time < 60000);
      const demoMax1m = demoSpeedHistory.current.length > 0 ? Math.max(...demoSpeedHistory.current.map(e => e.speed)) : 0;
      if (spd > demoMaxSpeedRef.current) demoMaxSpeedRef.current = spd;

      // Multi-range accel tracking in demo
      if (spd < 2) {
        demoAccelStartRef.current = { time: now, _milestones: {}, _rollOn: {} }; demoAccelTimeRef.current = 0;
        // Only clear results outside 30s display window
        if (accelResultsExpiryRef.current === 0 || T() >= accelResultsExpiryRef.current) {
          setAccelLiveTime(null); setAccelResults({}); setAccelLiveResults({}); setAccelFinalDisplay(null);
        }
      }
      else if (demoAccelStartRef.current) {
        const elapsed = (now - demoAccelStartRef.current.time) * 1000;
        // Live results for all incomplete 0→X
        const live = {};
        [60, 100, 130, 200].forEach(tgt => {
          if (spd < tgt) live[`0_${tgt}`] = elapsed;
        });
        setAccelLiveResults(live);
        // Živý čas pouze dokud nedosáhneme 100 — pak zmrazit
        if (!demoAccelStartRef.current._milestones[100]) {
          setAccelLiveTime(elapsed);
        }
        // Record milestones
        const results = {};
        // Record each milestone once via ref object
        const ms = demoAccelStartRef.current._milestones;
        [60, 100, 130, 200].forEach(tgt => {
          if (spd >= tgt && !ms[tgt]) {
            ms[tgt] = true;
            results[`0_${tgt}`] = elapsed;
          }
        });
        if (Object.keys(results).length > 0) {
          setAccelResults(p => ({ ...p, ...results }));
          if (results["0_100"]) {
            setLastAccel(results["0_100"]);
            setAccelHistory(p => { const n = [...p, { time: results["0_100"], times: { ...results }, date: t }].slice(-10); saveAccelHistory(n); return n; });
            if (accelDisplayTimer.current) clearTimeout(accelDisplayTimer.current);
            accelResultsExpiryRef.current = T() + 60000;
            accelDisplayTimer.current = setTimeout(() => { setLastAccel(null); setAccelResults({}); setAccelLiveTime(null); setAccelLiveResults({}); accelResultsExpiryRef.current = 0; }, 60000);
            if (accelFinalTimer.current) clearTimeout(accelFinalTimer.current);
            setAccelFinalDisplay(results["0_100"]);
            accelFinalTimer.current = setTimeout(() => { setAccelFinalDisplay(null); setAccelLiveTime(null); setAccelLiveResults({}); }, 60000);
            // Zastavit demo měření — nulovat ref aby interval dál nepřepisoval hodnoty
            demoAccelStartRef.current = null;
          }
        }
        // Demo roll-on tracking
        const dro = demoAccelStartRef.current._rollOn;
        // 60→120
        if (spd >= 60 && !dro["60_120_start"] && !dro["60_120_done"]) dro["60_120_start"] = now;
        if (dro["60_120_start"] && !dro["60_120_done"] && spd >= 120) {
          dro["60_120_done"] = true;
          setAccelResults(p => ({ ...p, "60_120": (now - dro["60_120_start"]) * 1000 }));
        }
        // 100→200
        if (spd >= 100 && !dro["100_200_start"] && !dro["100_200_done"]) dro["100_200_start"] = now;
        if (dro["100_200_start"] && !dro["100_200_done"] && spd >= 200) {
          dro["100_200_done"] = true;
          setAccelResults(p => ({ ...p, "100_200": (now - dro["100_200_start"]) * 1000 }));
        }
        // Demo live results for roll-on
        const demoLive = { ...live };
        if (dro["60_120_start"] && !dro["60_120_done"]) demoLive["60_120"] = (now - dro["60_120_start"]) * 1000;
        if (dro["100_200_start"] && !dro["100_200_done"]) demoLive["100_200"] = (now - dro["100_200_start"]) * 1000;
        setAccelLiveResults(demoLive);
      }
      // Simulate distance for counters (~speed * 0.2s converted to meters)
      if (spd > 2) {
        const dist = (spd / 3.6) * 0.2; // meters in 200ms
        setCounters(p => {
          const u = { ...p };
          COUNTER_TYPES.forEach(ty => {
            const c = { ...u[ty] };
            c.distance += dist;
            c.time = t - c.startedAt;
            if (spd > (c.maxSpeed || 0)) c.maxSpeed = spd;
            c.speedSum = (c.speedSum || 0) + spd;
            c.speedCount = (c.speedCount || 0) + 1;
            u[ty] = c; saveCounter(ty, c);
          });
          return u;
        });
      }
      // Simulate lean from speed changes
      const speedDelta = spd - demoPrevSpeedRef.current;
      const simulatedLean = Math.max(-45, Math.min(45, speedDelta * 3 + Math.sin(now * 0.7) * (spd / 100) * 15));
      demoPrevSpeedRef.current = spd;
      setDemoValues({
        speed: Math.round(spd),
        maxSpeed: Math.round(demoMax1m),
        lean: Math.round(simulatedLean),
        altitude: Math.round(350 + Math.sin(now * 0.05) * 80),
        accel: demoAccelTimeRef.current,
      });
    }, 200);
    return () => clearInterval(iv);
  }, [demoMode]); // only demoMode toggle, NOT slider value

  // ── Configurable cells ────────────────────────────────
  const [dashCells, setDashCells] = useState(() => loadCellConfig("motogauge_dash_cells", DEFAULT_DASH_CELLS));
  const handleDashCellChange = useCallback((idx, id) => {
    setDashCells(p => { const n = [...p]; n[idx] = id; saveCellConfig("motogauge_dash_cells", n); return n; });
  }, []);
  const [showQuickGreeting, setShowQuickGreeting] = useState(false);
  const [showStory, setShowStory] = useState(false);
  // Segment state
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segRecMode, setSegRecMode] = useState("idle"); // "idle"|"countdown"|"recording"
  const [segRecCountdown, setSegRecCountdown] = useState(10);
  const [segRecElapsed, setSegRecElapsed] = useState(0);
  const [segRecGeoName, setSegRecGeoName] = useState("");
  const segRecIntervalRef = useRef(null);
  const segRecStartPosRef = useRef(null);
  const [activeSeg, setActiveSeg] = useState(() => {
    const id = loadActiveSegId();
    if (!id) return null;
    const segs = loadSegments();
    return segs.find(s => s.id === id) || null;
  });
  const activeSegRef = useRef(null);
  const [segRunState, setSegRunState] = useState(null);
  const segRunRef = useRef(null);
  const segInZoneRef = useRef(false);
  // keep ref in sync
  useEffect(() => { activeSegRef.current = activeSeg; }, [activeSeg]);


  const swStartRef = useRef(null), swIntervalRef = useRef(null);
  const speedHistory1m = useRef([]), leanHistory1m = useRef([]);
  const speedRef = useRef(0), leanRef = useRef(0);
  const lastPos = useRef(null), accelTracking = useRef({ active: false, startTime: null });
  const accelDisplayTimer = useRef(null);
  const accelResultsExpiryRef = useRef(0);
  const accelResultsRef = useRef({}); // mirror of accelResults for sync access in GPS handler
  const countersRef = useRef(counters), crashCooldown = useRef(false);
  const wasStoppedRef = useRef(true);
  const stoppedSinceRef = useRef(null); // timestamp of first GPS tick under 2 km/h
  const prevSpeedRef = useRef(0); // previous GPS speed for deceleration detection
  const leanThrottleRef = useRef(0);
  const smoothedLeanRef = useRef(0); // EMA low-pass filter for display
  // Geocoding rate limiting
  const lastGeoTime = useRef(0);
  const lastTrackTimeRef = useRef({}); // per counter type — not stored in counter data
  const geoStartDone = useRef((() => {
    const d = {};
    COUNTER_TYPES.forEach(ty => { try { const r = localStorage.getItem(getStorageKey(ty)); if (r) { const c = JSON.parse(r); if (c.startLabel) d[ty] = true; } } catch(e) {} });
    return d;
  })());
  countersRef.current = counters;

  // Heartbeat: raz(white)–dva(red)–mezera — very pronounced
  // Cycle: 1600ms — raz@0 big pulse, dva@350ms smaller pulse, then long pause
  const effectiveSpeed = demoMode ? demoValues.speed : speed;
  const [hbPhase, setHbPhase] = useState("none"); // "raz"|"dva"|"none"
  useEffect(() => {
    if (formatSpeed(effectiveSpeed) > 0) { setHeartbeat(1); setHbPhase("none"); return; }
    let frame;
    const animate = () => {
      const t = (Date.now() % 1600) / 1600;
      let scale = 1;
      let phase = "none";
      // Raz: t=0–0.075 (120ms), strong pulse
      if (t < 0.075) { scale = 1 + 0.15 * Math.sin(t / 0.075 * Math.PI); phase = "raz"; }
      // Dva: t=0.22–0.29 (112ms), medium pulse
      else if (t > 0.22 && t < 0.29) { scale = 1 + 0.10 * Math.sin((t - 0.22) / 0.07 * Math.PI); phase = "dva"; }
      setHeartbeat(scale);
      setHbPhase(phase);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [effectiveSpeed]);

  // Clock tick for time cell (re-render every minute)
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const hasClock = dashCells.includes("clock") || dashCells.includes("sunset") || dashCells.includes("homeTime") || dashCells.includes("travelTime");
    if (!hasClock) return;
    const iv = setInterval(() => setClockTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, [dashCells]);

  // Wake Lock — keep screen on during ride
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      if (wakeLock) return; // already held
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => { wakeLock = null; });
        }
      } catch (e) {}
    };
    requestWakeLock();
    // Re-acquire on tab focus
    const onVisChange = () => { if (document.visibilityState === "visible") requestWakeLock(); };
    document.addEventListener("visibilitychange", onVisChange);
    // Retry every 30s — iOS Safari může wake lock tiše uvolnit
    const retryIv = setInterval(() => { if (!wakeLock) requestWakeLock(); }, 30000);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      clearInterval(retryIv);
      if (wakeLock) { try { wakeLock.release(); } catch (e) {} }
    };
  }, []);

  const disableTrivia = () => { setTriviaEnabled(false); try { localStorage.setItem("motogauge_trivia_enabled", "false"); } catch (e) {} };
  const disableEnglish = () => { setEnglishEnabled(false); try { localStorage.setItem("motogauge_english_enabled", "false"); } catch (e) {} };
  const enableEnglish = () => { setEnglishEnabled(true); setTriviaEnabled(false); try { localStorage.setItem("motogauge_english_enabled", "true"); localStorage.setItem("motogauge_trivia_enabled", "false"); } catch (e) {} };
  const enableTrivia = () => { setTriviaEnabled(true); setEnglishEnabled(false); try { localStorage.setItem("motogauge_trivia_enabled", "true"); localStorage.setItem("motogauge_english_enabled", "false"); } catch (e) {} };

  // Midnight resets
  useEffect(() => {
    const check = () => {
      const n = new Date();
      // Use local date string (YYYY-MM-DD) to correctly detect midnight in user's timezone
      const todayLocal = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      const d = countersRef.current.daily;
      const dStart = new Date(d.startedAt);
      const dStartLocal = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, "0")}-${String(dStart.getDate()).padStart(2, "0")}`;
      if (dStartLocal !== todayLocal) { saveSnapshot("daily", d); const f = createEmptyCounter("daily"); setCounters(p => ({ ...p, daily: f })); saveCounter("daily", f); geoStartDone.current.daily = false; }
      const y = countersRef.current.yearly;
      if (new Date(y.startedAt).getFullYear() !== n.getFullYear()) { saveSnapshot("yearly", y); const f = createEmptyCounter("yearly"); setCounters(p => ({ ...p, yearly: f })); saveCounter("yearly", f); geoStartDone.current.yearly = false; }
    };
    check(); const iv = setInterval(check, 60000); return () => clearInterval(iv);
  }, []);

  // Init geocode flags from existing labels
  useEffect(() => {
    COUNTER_TYPES.forEach(ty => { if (countersRef.current[ty]?.startLabel) geoStartDone.current[ty] = true; });
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition((pos) => {
      setGpsActive(true);
      const rawSpd = msToKmh(pos.coords.speed), alt = pos.coords.altitude, lat = pos.coords.latitude, lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || 999;

      // GPS noise filter: ignore speed from low-accuracy fixes (>50m)
      // and cap at physically plausible maximum (300 km/h)
      const validSpd = (rawSpd >= 0 && rawSpd < 300 && accuracy < 50) ? rawSpd : 0;

      // Filter distance jumps: if position jumped more than physically possible, skip distance update
      // Also skip distance updates from low-accuracy fixes
      let distJumpOk = accuracy < 50;
      if (lastPos.current) {
        const dt = (T() - lastPos.current.time) / 1000; // seconds since last fix
        if (dt > 0) {
          const dl = lat - lastPos.current.lat, dn = lng - lastPos.current.lng;
          const jumpDist = Math.sqrt(dl * dl + dn * dn) * 111320;
          const impliedSpeed = (jumpDist / dt) * 3.6; // km/h
          if (impliedSpeed > 350) distJumpOk = false; // physically impossible jump
        }
      }

      setSpeed(validSpd); speedRef.current = validSpd; setAltitude(alt);
      const t = T();
      // Only add moving speeds to 1min history (don't pollute with zeros when stopped)
      if (validSpd > 2) speedHistory1m.current.push({ speed: validSpd, time: t });
      speedHistory1m.current = speedHistory1m.current.filter(e => t - e.time < 60000);
      // Only update max if we have recent moving data (don't reset to 0 when stopped)
      if (speedHistory1m.current.length > 0) {
        setMaxSpeed1m(Math.max(...speedHistory1m.current.map(e => e.speed), 0));
      }

      // Accel reset: only after 2s continuously under 2 km/h (GPS dropout protection)
      if (validSpd < 2) {
        if (stoppedSinceRef.current === null) stoppedSinceRef.current = t;
        const stoppedMs = t - stoppedSinceRef.current;
        if (stoppedMs >= 2000) {
          // Genuine stop — reset accel tracking
          if (!accelTracking.current.active) accelTracking.current = { active: true, startTime: t };
          accelMilestones.current = {};
          rollOnRef.current = {};
          wasStoppedRef.current = true;
          if (accelLiveRef.current) { clearInterval(accelLiveRef.current); accelLiveRef.current = null; }
          // accelLiveTime stays visible — cleared by 30s timer or new ride
        }
      }
      else {
        stoppedSinceRef.current = null; // moving — reset stopped timer

        // ── New ride: transition from stopped to moving ──────
        if (wasStoppedRef.current) {
          wasStoppedRef.current = false;
          accelMilestones.current = {};
          prevSpeedRef.current = 0;
          // Clear results only if 60s display window has expired
          if (accelResultsExpiryRef.current === 0 || T() >= accelResultsExpiryRef.current) {
            setLastAccel(null); setAccelResults({});
            setAccelLiveTime(null); setAccelLiveResults({});
            setAccelFinalDisplay(null);
            if (accelDisplayTimer.current) clearTimeout(accelDisplayTimer.current);
            if (accelFinalTimer.current) clearTimeout(accelFinalTimer.current);
          }
          // Start fresh measurement
          accelTracking.current = { active: true, startTime: t, finished: false };
          if (accelLiveRef.current) clearInterval(accelLiveRef.current);
          accelLiveRef.current = setInterval(() => {
            if (!accelTracking.current.active || accelTracking.current.finished) {
              clearInterval(accelLiveRef.current); accelLiveRef.current = null; return;
            }
            if (accelMilestones.current[100]) {
              clearInterval(accelLiveRef.current); accelLiveRef.current = null; return;
            }
            setAccelLiveTime(T() - accelTracking.current.startTime);
          }, 100);
          setCounters(p => {
            const u = { ...p };
            COUNTER_TYPES.forEach(ty => { const c = { ...u[ty] }; c.rideCount = (c.rideCount || 0) + 1; u[ty] = c; saveCounter(ty, c); });
            return u;
          });
        }

        // ── Active measurement ───────────────────────────────
        if (accelTracking.current.active && !accelTracking.current.finished) {
          const startT = accelTracking.current.startTime;

          // Record milestones
          if (validSpd >= 100 && !accelMilestones.current[100]) {
            accelMilestones.current[100] = t;
          }

          const t100 = accelMilestones.current[100] ? accelMilestones.current[100] - startT : null;

          const doFinish = (res) => {
            accelTracking.current.finished = true;
            accelResultsRef.current = res; // sync ref pro segment handler
            if (accelLiveRef.current) { clearInterval(accelLiveRef.current); accelLiveRef.current = null; }
            setAccelResults(res);
            const el100 = res["0_100"];
              if (el100) {
              setAccelLiveTime(el100); // freeze display at 0→100 value
              setLastAccel(el100);
              setAccelHistory(p => { const n = [...p, { time: el100, times: res, date: t }].slice(-10); saveAccelHistory(n); return n; });
              setCounters(p => { const u = { ...p }; COUNTER_TYPES.forEach(ty => { const c = { ...u[ty] }; if (!c.bestAccel || el100 < c.bestAccel) { c.bestAccel = el100; c.bestAccelPos = [lat, lng]; } u[ty] = c; }); return u; });
            }
            const displayVal = el100;
            if (displayVal) {
              setAccelFinalDisplay(displayVal);
              accelResultsExpiryRef.current = T() + 60000;
              if (accelDisplayTimer.current) clearTimeout(accelDisplayTimer.current);
              if (accelFinalTimer.current) clearTimeout(accelFinalTimer.current);
              
              accelDisplayTimer.current = setTimeout(() => { setLastAccel(null); setAccelResults({}); setAccelLiveTime(null); setAccelLiveResults({}); accelResultsExpiryRef.current = 0; }, 60000);
              accelFinalTimer.current = setTimeout(() => { setAccelFinalDisplay(null); setAccelLiveTime(null); setAccelLiveResults({}); }, 60000);
            }
          };

          // Reached 100 → finish
          if (t100) {
            doFinish({ "0_100": t100 });
          }
        }

        prevSpeedRef.current = validSpd;
      }
      if (lastPos.current && distJumpOk) {
        const dl = lat - lastPos.current.lat, dn = lng - lastPos.current.lng;
        const dist = Math.sqrt(dl * dl + dn * dn) * 111320;
        // Track ride score every ~200m
        setCounters(p => {
          const u = { ...p };
          COUNTER_TYPES.forEach(ty => {
            const c = { ...u[ty] }; c.distance += dist; c.time = t - c.startedAt;
            // Track start position and max distance from start
            if (!c.startPos) c.startPos = [lat, lng];
            // Always update end position
            c.endPos = [lat, lng];
            if (c.startPos) {
              const dlStart = lat - c.startPos[0], dnStart = lng - c.startPos[1];
              const distFromStart = Math.sqrt(dlStart * dlStart + dnStart * dnStart) * 111320;
              if (distFromStart > (c.maxDistFromStart || 0)) c.maxDistFromStart = distFromStart;
            }
            if (alt !== null && alt !== undefined) {
              if (c.maxAlt === null || alt > c.maxAlt) { c.maxAlt = alt; c.maxAltPos = [lat, lng]; }
              if (c.minAlt === null || alt < c.minAlt) { c.minAlt = alt; c.minAltPos = [lat, lng]; }
              // Ascent / descent tracking
              if (c.lastAlt !== null && c.lastAlt !== undefined) {
                const altDiff = alt - c.lastAlt;
                if (altDiff > 0.5) c.ascent = (c.ascent || 0) + altDiff;
                else if (altDiff < -0.5) c.descent = (c.descent || 0) + Math.abs(altDiff);
              }
              c.lastAlt = alt;
            }
            // Average speed tracking (only when moving)
            if (validSpd > 2) {
              c.speedSum = (c.speedSum || 0) + validSpd;
              c.speedCount = (c.speedCount || 0) + 1;
              if (validSpd > (c.maxSpeed || 0)) {
c.maxSpeed = validSpd;
              }
            }
            // Limit track array to prevent localStorage overflow (keep last 5000 points)
            if (!c.track.length || dist > 20 || (t - (lastTrackTimeRef.current[ty] || 0) > 3000)) {
              c.track = [...c.track, [lat, lng]].slice(-5000);
              lastTrackTimeRef.current[ty] = t;
            }
            u[ty] = c; saveCounter(ty, c);
          });
          return u;
        });
      }
      lastPos.current = { lat, lng, time: t };

      // ── Segment detection ─────────────────────────────
      const seg = activeSegRef.current;
      if (seg && seg.startLat !== null) {
        const distToStart = gpsDistance(lat, lng, seg.startLat, seg.startLng);
        const distToEnd = seg.endLat !== null ? gpsDistance(lat, lng, seg.endLat, seg.endLng) : Infinity;

        if (!segRunRef.current) {
          // Not running — check if we entered start zone
          if (distToStart < SEG_DETECT_RADIUS && validSpd > 5) {
            if (!segInZoneRef.current) {
              segInZoneRef.current = true;
              const startTime = Date.now();
              segRunRef.current = { startTime, pr: seg.pr, maxSpeed: 0, speedSum: 0, speedCount: 0, maxAlt: alt || null, minAlt: alt || null };
              setSegRunState({ startTime, elapsed: 0, pacer: null });
            }
          } else if (distToStart > SEG_DETECT_RADIUS * 2) {
            segInZoneRef.current = false;
          }
        } else {
          // Track speed + altitude stats during run
          if (validSpd > 2) {
            if (validSpd > segRunRef.current.maxSpeed) segRunRef.current.maxSpeed = validSpd;
            segRunRef.current.speedSum += validSpd;
            segRunRef.current.speedCount += 1;
          }
          if (alt != null) {
            if (segRunRef.current.maxAlt === null || alt > segRunRef.current.maxAlt) segRunRef.current.maxAlt = alt;
            if (segRunRef.current.minAlt === null || alt < segRunRef.current.minAlt) segRunRef.current.minAlt = alt;
          }
          // Running — update elapsed + pacer
          const elapsed = Date.now() - segRunRef.current.startTime;
          const pr = segRunRef.current.pr;
          const pacer = pr ? elapsed - pr : null;
          setSegRunState({ startTime: segRunRef.current.startTime, elapsed, pacer });

          // Check finish zone
          if (distToEnd < SEG_FINISH_RADIUS) {
            const finalElapsed = elapsed;
            const finalPacer = pr ? finalElapsed - pr : 0;
            const distKm = seg.distanceKm || null;
            const avgSpeed = distKm && finalElapsed > 0 ? Math.round(distKm / (finalElapsed / 3600000) * 10) / 10 : null;
            const maxSpeed = segRunRef.current.maxSpeed > 0 ? Math.round(segRunRef.current.maxSpeed) : null;
            const maxAlt = segRunRef.current.maxAlt != null ? Math.round(segRunRef.current.maxAlt) : null;
            const minAlt = segRunRef.current.minAlt != null ? Math.round(segRunRef.current.minAlt) : null;
            // Zachytit aktuální accel 0→100 pokud bylo měřeno
            const accel = accelResultsRef.current?.["0_100"] || null;
            // Save result
            const segs = loadSegments();
            const idx = segs.findIndex(s => s.id === seg.id);
            if (idx !== -1) {
              const newEntry = { time: finalElapsed, date: Date.now(), temp: null, weatherCode: null, delta: finalPacer, avgSpeed, maxSpeed, maxAlt, minAlt, accel };
              segs[idx].history = [newEntry, ...segs[idx].history].slice(0, 10);
              if (!segs[idx].pr || finalElapsed < segs[idx].pr) {
                segs[idx].pr = finalElapsed;
                newEntry.delta = 0;
              }
              saveSegments(segs);
              setActiveSeg(segs[idx]);
              // Fetch počasí async po dokončení průjezdu
              (async () => {
                try {
                  const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`);
                  const wData = await wRes.json();
                  if (wData?.current) {
                    const temp = Math.round(wData.current.temperature_2m);
                    const weatherCode = wData.current.weather_code;
                    const segs2 = loadSegments();
                    const idx2 = segs2.findIndex(s => s.id === seg.id);
                    if (idx2 !== -1 && segs2[idx2].history.length > 0) {
                      segs2[idx2].history[0].temp = temp;
                      segs2[idx2].history[0].weatherCode = weatherCode;
                      saveSegments(segs2);
                      setActiveSeg(segs2[idx2]);
                    }
                  }
                } catch (e) {}
              })();
            }
            segRunRef.current = null;
            segInZoneRef.current = false;
            setSegRunState(null);
          }
        }
      }
      // ── End segment detection ─────────────────────────
      const geoDelay = lastGeoTime.current === 0 ? 5000 : 30000;
      if (t - lastGeoTime.current > geoDelay) {
        lastGeoTime.current = t;
        (async () => {
          try {
            // Helper: handle 429 backoff
            const handleGeoResult = (result) => {
              if (result && result.blocked) {
                // Push lastGeoTime forward so we wait retryAfter seconds before next attempt
                lastGeoTime.current = T() + (result.retryAfter * 1000) - 30000;
                return null;
              }
              return result;
            };
            // Geocode start positions for counters that don't have startLabel yet
            for (const ty of COUNTER_TYPES) {
              if (!geoStartDone.current[ty]) {
                geoStartDone.current[ty] = true;
                const raw = await reverseGeocode(lat, lng);
                const name = handleGeoResult(raw);
                if (name) {
                  setCounters(p => {
                    const c = p[ty];
                    // Only set startLabel if empty (first fix)
                    const updates = {};
                    if (!c.startLabel) updates.startLabel = name;
                    updates.endLabel = name; // always update end
                    const u = { ...p, [ty]: { ...c, ...updates } };
                    saveCounter(ty, u[ty]);
                    return u;
                  });
                }
                break; // one geocode per cycle (Nominatim rate limit)
              }
            }
            // Once all starts are done, update endLabel for all counters
            const allStartsDone = COUNTER_TYPES.every(ty => geoStartDone.current[ty]);
            if (allStartsDone) {
              const raw = await reverseGeocode(lat, lng);
              const endName = handleGeoResult(raw);
              if (endName) {
                setCounters(p => {
                  const u = { ...p };
                  COUNTER_TYPES.forEach(ty => {
                    if (u[ty].endLabel !== endName) {
                      u[ty] = { ...u[ty], endLabel: endName };
                      saveCounter(ty, u[ty]);
                    }
                  });
                  return u;
                });
              }
            }
          } catch (e) {}
        })();
      }
    }, () => setGpsActive(false), { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 });
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // DeviceMotion
  useEffect(() => {
    const h = (e) => {
      if (e.rotationRate) setGyroActive(true);
      if (e.accelerationIncludingGravity) {
        const { x, y, z } = e.accelerationIncludingGravity;
        const rawLa = Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
        const la = rawLa - leanCalibrationRef.current;
        const t = T();
        // Only add meaningful lean angles (skip noise when stationary)
        const recentSpdForLean = speedHistory1m.current.length > 0 ? speedHistory1m.current[speedHistory1m.current.length - 1].speed : 0;
        if (recentSpdForLean > 2 || Math.abs(la) > 3) leanHistory1m.current.push({ angle: la, time: t });

        // Auto-calibration: detect stable orientation while stationary
        if (!autoCalibDone.current) {
          const recentSpd = speedHistory1m.current.length > 0 ? speedHistory1m.current[speedHistory1m.current.length - 1].speed : 0;
          autoCalibSamples.current.push({ raw: rawLa, time: t });
          autoCalibSamples.current = autoCalibSamples.current.filter(s => t - s.time < AUTO_CALIB_STABLE_MS);
          if (recentSpd < 2 && autoCalibSamples.current.length >= 10) {
            const vals = autoCalibSamples.current.map(s => s.raw);
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
            if (variance < AUTO_CALIB_VARIANCE_THRESHOLD) {
              if (!autoCalibStableStart.current) autoCalibStableStart.current = t;
              if (t - autoCalibStableStart.current >= AUTO_CALIB_STABLE_MS) {
                leanCalibrationRef.current = mean;
                saveLeanCalibration(mean);
                setLean(0);
                autoCalibDone.current = true;
                setAutoCalibStatus("done");
                setTimeout(() => setAutoCalibStatus(""), 3000);
              }
            } else { autoCalibStableStart.current = null; }
          } else { autoCalibStableStart.current = null; }
        }

        // Throttle lean display and history cleanup (~5Hz = every 200ms)
        if (t - leanThrottleRef.current > 200) {
          leanThrottleRef.current = t;
          // EMA low-pass filter: smooths motor vibrations for display
          smoothedLeanRef.current = smoothedLeanRef.current * 0.8 + la * 0.2;
          setLean(smoothedLeanRef.current); leanRef.current = smoothedLeanRef.current;
          leanHistory1m.current = leanHistory1m.current.filter(e => t - e.time < 60000);
        }
        const abs = Math.abs(la);
        // Crash detection: require both high lean angle AND speed > 5 km/h
        // (prevents false triggers from stationary phone at an angle)
        const recentSpeed = speedHistory1m.current.length > 0 ? speedHistory1m.current[speedHistory1m.current.length - 1].speed : 0;
        if (abs >= CRASH_THRESHOLD && recentSpeed > 5 && !crashCooldown.current) {
          crashCooldown.current = true; setTimeout(() => { crashCooldown.current = false; }, 10000);
          const cd = { speed: speedHistory1m.current.length > 0 ? speedHistory1m.current[speedHistory1m.current.length - 1].speed : 0, pos: lastPos.current ? [lastPos.current.lat, lastPos.current.lng] : null, angle: la, time: t };
          setCounters(p => { const u = { ...p }; COUNTER_TYPES.forEach(ty => { const c = { ...u[ty] }; c.crashCount = (c.crashCount || 0) + 1; c.crashes = [...(c.crashes || []), cd].slice(-20); u[ty] = c; saveCounter(ty, c); }); return u; });
        }
        setCounters(p => {
          let ch = false; const u = { ...p };
          COUNTER_TYPES.forEach(ty => {
            const c = { ...u[ty] };
            let changed = false;
            if (abs > Math.abs(c.maxLean || 0)) {
              c.maxLean = la;
              if (lastPos.current) c.maxLeanPos = [lastPos.current.lat, lastPos.current.lng];
              changed = true;
            }
            if (la < 0 && abs > Math.abs(c.maxLeanLeft || 0)) { c.maxLeanLeft = la; changed = true; }
            if (la > 0 && abs > Math.abs(c.maxLeanRight || 0)) { c.maxLeanRight = la; changed = true; }
            if (changed) { u[ty] = c; saveCounter(ty, c); ch = true; }
          });
          return ch ? u : p;
        });

        // (end of lean/crash tracking)
      }
    };
    window.addEventListener("devicemotion", h);
    return () => window.removeEventListener("devicemotion", h);
  }, []);

  // Stopwatch
  // ── Stopwatch functions ──────────────────────────────
  const swStartMeasuring = useCallback(() => {
    swSpeedSamples.current = [];
    swMaxSpeed.current = 0;
    swMaxLeanL.current = 0;
    swMaxLeanR.current = 0;
    swStartPos.current = lastPos.current ? [lastPos.current.lat, lastPos.current.lng] : null;
    swEndPos.current = null;
    setSwState("running");
    swStartRef.current = T();
    swIntervalRef.current = setInterval(() => {
      const el = T() - swStartRef.current;
      setSwTime(el);
      // Sample speed from ref (avoids stale closure)
      const curSpd = demoModeRef.current ? 0 : speedRef.current;
      swSpeedSamples.current.push({ speed: curSpd, time: el });
      if (curSpd > swMaxSpeed.current) swMaxSpeed.current = curSpd;
      // Track lean from ref
      const curLean = leanRef.current;
      if (curLean < 0 && Math.abs(curLean) > swMaxLeanL.current) swMaxLeanL.current = Math.abs(curLean);
      if (curLean > 0 && curLean > swMaxLeanR.current) swMaxLeanR.current = curLean;
      // Track end position
      if (lastPos.current) swEndPos.current = [lastPos.current.lat, lastPos.current.lng];
    }, 50);
  }, []);

  const swStop = useCallback(() => {
    clearInterval(swIntervalRef.current);
    const el = T() - swStartRef.current;
    setSwTime(el);
    const samples = swSpeedSamples.current;
    const maxSpd = swMaxSpeed.current;
    const avgSpd = samples.length > 0 ? samples.reduce((a, s) => a + s.speed, 0) / samples.length : 0;
    const maxLL = Math.round(swMaxLeanL.current);
    const maxLR = Math.round(swMaxLeanR.current);
    // Final end position
    if (lastPos.current) swEndPos.current = [lastPos.current.lat, lastPos.current.lng];
    const startP = swStartPos.current;
    const endP = swEndPos.current;
    swResult.current = { time: el, maxSpeed: Math.round(maxSpd), avgSpeed: Math.round(avgSpd), maxLeanL: maxLL, maxLeanR: maxLR, startPos: startP, endPos: endP };
    setSwState("done");
    setSwHistory(p => {
      const n = [...p, { time: Math.round(el / 100) * 100, date: T(), maxSpeed: Math.round(maxSpd), avgSpeed: Math.round(avgSpd), maxLeanL: maxLL, maxLeanR: maxLR, startPos: startP, endPos: endP }].slice(-10);
      saveStopwatchHistory(n);
      return n;
    });
  }, []);

  const swStartImmediate = useCallback(() => {
    swStartMeasuring();
  }, [swStartMeasuring]);

  const swStartCountdown = useCallback(() => {
    setSwState("countdown"); setSwCountdown(10); let c = 10;
    const ci = setInterval(() => {
      c--; setSwCountdown(c);
      if (c <= 0) { clearInterval(ci); swStartMeasuring(); }
    }, 1000);
    swIntervalRef.current = ci;
  }, [swStartMeasuring]);

  const swStartOnGo = useCallback(() => {
    setSwState("waitGo");
  }, []);

  const resetStopwatch = useCallback(() => {
    clearInterval(swIntervalRef.current);
    setSwState("menu"); setSwTime(0);
    swSpeedSamples.current = []; swMaxSpeed.current = 0;
    swMaxLeanL.current = 0; swMaxLeanR.current = 0;
    swStartPos.current = null; swEndPos.current = null;
  }, []);

  const swBackToIdle = useCallback(() => {
    clearInterval(swIntervalRef.current);
    setSwState("idle"); setSwTime(0);
  }, []);

  // Detect motion start for "waitGo" mode
  useEffect(() => {
    if (swState !== "waitGo") return;
    const curSpd = demoMode ? demoValues.speed : speed;
    if (curSpd > 2) {
      swStartMeasuring();
    }
  }, [swState, speed, demoMode, demoValues.speed, swStartMeasuring]);

  // Track speed during running
  useEffect(() => {
    if (swState !== "running") return;
    const curSpd = demoMode ? demoValues.speed : speed;
    if (curSpd > swMaxSpeed.current) swMaxSpeed.current = curSpd;
  }, [swState, speed, demoMode, demoValues.speed]);
  const resetCounter = useCallback((type) => {
    const current = countersRef.current[type];
    if (current) saveSnapshot(type, current);
    const f = createEmptyCounter(type);
    setCounters(p => ({ ...p, [type]: f }));
    saveCounter(type, f);
    geoStartDone.current[type] = false; // allow re-geocoding of new start
    setDetailCounter(null);
  }, []);

  const updateCounterField = useCallback((type, key, value) => {
    setCounters(p => {
      const c = { ...p[type], [key]: value };
      saveCounter(type, c);
      return { ...p, [type]: c };
    });
  }, []);

  const requestPermissions = async () => {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      try { const s = await DeviceMotionEvent.requestPermission(); if (s === "granted") setGyroActive(true); } catch (e) {}
    }
    try { localStorage.setItem("motogauge_perm_requested", "true"); } catch {}
    setPermRequested(true);
  };

  // ── Demo-aware display values ────────────────────────
  const dSpeed = demoMode ? demoValues.speed : speed;
  const dMaxSpeed = demoMode ? demoValues.maxSpeed : maxSpeed1m;
  const dLean = demoMode ? demoValues.lean : lean;
  const dAltitude = demoMode ? demoValues.altitude : altitude;
  const dAccel = demoMode ? (demoValues.accel > 0 ? demoValues.accel * 1000 : null) : lastAccel;

  // Data object passed to configurable cells
  const cellData = {
    speed: dSpeed, maxSpeed: dMaxSpeed,
    altitude: dAltitude, counters, lastAccel: dAccel, accelLiveTime,
    accelResults, accelLiveResults, accelFinalDisplay,
    lastPos: lastPos.current,
    activeSeg, segRunState,
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Dancing+Script:wght@600;700&family=Pacifico&family=Oswald:wght@700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Full dashboard */}
      <div style={{
        fontFamily: "Rajdhani, sans-serif",
        background: COLORS.bg,
        color: COLORS.white,
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 10px) 14px 80px",
        WebkitUserSelect: "none",
        userSelect: "none",
        overflowX: "hidden",
      }}>

        {/* Header: LIVE (left) | PŘÍBĚH Z CEST (right) */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, padding: "6px 0" }}>
          <div onClick={() => setShowQuickGreeting(true)}
            style={{ flex: 1, minWidth: 0, background: "#111", border: `1px solid ${COLORS.border}`, borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>LIVE</span>
          </div>
          <div onClick={() => setShowStory(true)}
            style={{ flex: 1, minWidth: 0, background: COLORS.bgCard, border: `1px solid ${COLORS.primary}55`, borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>PŘÍBĚH Z CEST</span>
          </div>
        </div>

        {/* Speed display + configurable cells */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 10, padding: "6px 0" }}>
          {/* Left: Speed */}
          <div style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{
              fontSize: 140, fontWeight: 700, lineHeight: 0.9, color: COLORS.white,
              textShadow: `0 0 40px ${COLORS.primary}33`,
              transform: `scale(${hbPhase === "raz" ? heartbeat : 1})`,
              transformOrigin: "center",
            }}>{formatSpeed(dSpeed)}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.white, letterSpacing: 3 }}>KM/H</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginTop: 2 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 60, fontWeight: 700, color: COLORS.red, textShadow: `0 0 20px ${COLORS.red}33`, transform: `scale(${hbPhase === "dva" ? heartbeat : 1})`, transformOrigin: "center", lineHeight: 1 }}>{formatSpeed(dMaxSpeed)}</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: COLORS.white, letterSpacing: 1 }}>MAX 1 MIN</div>
              </div>
            </div>
          </div>
          {/* Right column: context-dependent based on stopwatch state */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            {swState === "idle" ? (
              <>
                <SideCells cells={dashCells} data={cellData} onCellChange={handleDashCellChange} onAccelTap={() => setShowAccelHistory(p => !p)} onCloseAccel={() => setShowAccelHistory(false)} onSegmentTap={() => setShowSegmentModal(true)} />
                <div onClick={() => setSwState("menu")}
                  style={{ background: COLORS.red, borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 27, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>STOPKY</span>
                </div>
              </>
            ) : swState === "menu" ? (
              <>
                <div onClick={swStartImmediate} style={{ background: "#2ecc40", borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 21, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>START</span>
                </div>
                <div onClick={swStartCountdown} style={{ background: "#2ecc40", borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>START 10s</span>
                </div>
                <div onClick={swStartOnGo} style={{ background: "#2ecc40", borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>PO ROZJETÍ</span>
                </div>
                <div onClick={showSwHistory ? () => { setShowSwHistory(false); swBackToIdle(); } : () => setShowSwHistory(p => !p)} style={{ background: COLORS.red, borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>{showSwHistory ? "STOPKY" : "HISTORIE"}</span>
                </div>
              </>
            ) : (swState === "countdown" || swState === "waitGo" || swState === "running") ? (
              <>
                <div onClick={swState === "running" ? swStop : undefined}
                  style={{ background: COLORS.bgCard, borderRadius: 10, border: `1px solid ${swState === "running" ? COLORS.red + "66" : COLORS.border}`, height: 108, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxSizing: "border-box", cursor: swState === "running" ? "pointer" : "default" }}>
                  {swState === "countdown" ? (
                    <>
                      <span style={{ fontSize: 62, fontWeight: 700, color: COLORS.primary, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>{swCountdown}</span>
                      <span style={{ fontSize: 17, color: COLORS.white, marginTop: 2, letterSpacing: 1 }}>ODPOČET</span>
                    </>
                  ) : swState === "waitGo" ? (
                    <>
                      <span style={{ fontSize: 21, fontWeight: 700, color: "#2ecc40", fontFamily: "Rajdhani, sans-serif", lineHeight: 1, textAlign: "center" }}>ČEKÁM NA ROZJETÍ</span>
                      <span style={{ fontSize: 17, color: COLORS.white, marginTop: 4, letterSpacing: 1 }}>&gt; 2 KM/H</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 68, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>{(swTime / 1000).toFixed(1)}</span>
                      <span style={{ fontSize: 17, color: COLORS.white, marginTop: 2, letterSpacing: 1 }}>SEKUND</span>
                    </>
                  )}
                </div>
                <div onClick={swStop} style={{ background: COLORS.red, borderRadius: 10, height: 108, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 29, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 2 }}>STOP</span>
                </div>
              </>
            ) : /* done */ (
              <>
                {/* Result display */}
                <div style={{ background: COLORS.bgCard, borderRadius: 10, border: `1px solid ${COLORS.border}`, height: 108, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxSizing: "border-box", padding: "4px 8px" }}>
                  <span style={{ fontSize: 52, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>{(swTime / 1000).toFixed(1)}s</span>
                  <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap", justifyContent: "center" }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.white }}>MAX {swResult.current.maxSpeed}</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.white }}>Ø {swResult.current.avgSpeed}</span>
                    {accelHistory.length > 0 && <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.red }}>0→100: {formatAccel(Math.min(...accelHistory.map(a => a.time)))}</span>}
                  </div>
                </div>
                {/* Orange RESET */}
                <div onClick={resetStopwatch} style={{ background: COLORS.primary, borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 21, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>RESET</span>
                </div>
                <div onClick={showSwHistory ? () => { setShowSwHistory(false); swBackToIdle(); } : () => setShowSwHistory(p => !p)} style={{ background: COLORS.red, borderRadius: 10, height: 52, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>{showSwHistory ? "STOPKY" : "HISTORIE"}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Inline stopwatch history — shown when HISTORIE is active */}
        {showSwHistory && swState !== "idle" && swHistory.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              HISTORIE ({swHistory.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[...swHistory].reverse().map((item, i) => {
                const d = new Date(item.date);
                const dateStr = d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
                const timeStr = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={i} style={{ background: COLORS.bgCard, borderRadius: 10, padding: "10px 14px", border: `1px solid ${COLORS.border}`, fontFamily: "Rajdhani, sans-serif" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 17, color: COLORS.white }}>{dateStr} {timeStr}</span>
                      <span style={{ fontSize: 29, fontWeight: 700, color: COLORS.white }}>{(item.time / 1000).toFixed(1)}s</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 17, color: COLORS.white }}>MAX {item.maxSpeed} km/h</span>
                      <span style={{ fontSize: 17, color: COLORS.white }}>Ø {item.avgSpeed} km/h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAccelHistory && <AccelHistoryModal history={accelHistory} onClose={() => setShowAccelHistory(false)} />}

        {/* Counters — full width, 1 column */}
        <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, letterSpacing: 2, textTransform: "uppercase", marginTop: 10, marginBottom: 4 }}>Počítadla</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {COUNTER_TYPES.map(type => {
            const c = counters[type];
            return (
              <CounterTile key={type} type={type} counter={c} color={COUNTER_COLORS[type]}
                snapshotCount={loadSnapshots(type).length}
                onTap={() => setDetailCounter(type)} />
            );
          })}
        </div>

        {/* Feature toolbar: Kvíz | Angličtina */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {/* Kvíz button */}
          <div onClick={() => triviaEnabled ? (triviaDisableRef.current && triviaDisableRef.current()) : enableTrivia()}
            style={{ flex: 1, background: triviaEnabled ? COLORS.primary : COLORS.grayDarker, borderRadius: 12, height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 1 }}>
            <span style={{ fontSize: 17, color: COLORS.white, fontWeight: 700, letterSpacing: 1, fontFamily: "Rajdhani, sans-serif" }}>KVÍZ</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>{triviaEnabled ? "ZAPNUTO" : "VYPNUTO"}</span>
          </div>
          {/* Angličtina button */}
          <div onClick={() => englishEnabled ? (englishDisableRef.current && englishDisableRef.current()) : enableEnglish()}
            style={{ flex: 1, background: englishEnabled ? COLORS.primary : COLORS.grayDarker, borderRadius: 12, height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 1 }}>
            <span style={{ fontSize: 17, color: COLORS.white, fontWeight: 700, letterSpacing: 1, fontFamily: "Rajdhani, sans-serif" }}>ENGLISH</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.white, fontFamily: "Rajdhani, sans-serif", lineHeight: 1 }}>{englishEnabled ? "ZAPNUTO" : "VYPNUTO"}</span>
          </div>
        </div>

        {/* Active widgets */}
        {triviaEnabled && <TriviaWidget onDisable={disableTrivia} disableRef={triviaDisableRef} />}
        {englishEnabled && <MotoEnglishWidget onDisable={disableEnglish} disableRef={englishDisableRef} />}

        {!permRequested && !gyroActive && (
          <button onClick={requestPermissions} style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "16px 32px", background: COLORS.primary, color: COLORS.white, border: "none", borderRadius: 16, fontSize: 20, fontWeight: 700, fontFamily: "Rajdhani, sans-serif", cursor: "pointer", zIndex: 500, boxShadow: `0 4px 20px ${COLORS.primary}66` }}>POVOLIT SENZORY</button>
        )}

        {detailCounter && <CounterDetail counter={counters[detailCounter]} color={COUNTER_COLORS[detailCounter]} onClose={() => setDetailCounter(null)} onReset={() => resetCounter(detailCounter)} onUpdateCounter={updateCounterField} />}
        {showQuickGreeting && <QuickGreetingModal onClose={() => setShowQuickGreeting(false)} lastPos={lastPos.current} altitude={altitude} riderName={riderName} />}
        {showSegmentModal && <SegmentModal onClose={() => setShowSegmentModal(false)} lastPos={lastPos.current} onSegmentSaved={() => {}} onActiveChange={(seg) => { setActiveSeg(seg); activeSegRef.current = seg; }} />}
    {showStory && <StoryModal onClose={() => setShowStory(false)} counter={counters.trip} accelHistory={accelHistory} />}

      </div>

      <DemoPanel demo={demoMode} onToggle={toggleDemo} demoSpeed={demoSliderSpeed} onSpeedChange={handleDemoSpeedChange} />
    </>
  );
}
