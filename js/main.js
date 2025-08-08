import WorkoutTracker from "./WorkoutTracker.js";

function parseLocalDate(yyyyMmDd) {
    const [year, month, day] = yyyyMmDd.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-based
}
  

const STORAGE_KEY = "workout-tracker-entries";
function getEntries() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return arr.map(e => ({ ...e, duration: Number(e.duration || 0) }));
  } catch {
    return [];
  }
}

let weeklyChart = null;
let splitChart = null;

function renderCharts() {
  const entries = getEntries();

  // Weekly minutes
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const byDay = new Array(7).fill(0);
  for (const e of entries) {
    const d = parseLocalDate(e.date);
    const idx = Number.isFinite(d.getDay()) ? d.getDay() : null;
    if (idx !== null) byDay[idx] += e.duration || 0;
  }
  const weeklyEl = document.getElementById("weeklyMinutes");
  if (weeklyEl) {
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(weeklyEl, {
      type: "bar",
      data: { labels: days, datasets: [{ label: "Minutes", data: byDay }] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  // Exercise split
  const byExercise = {};
  for (const e of entries) {
    const key = (e.workout || "Unknown").trim();
    byExercise[key] = (byExercise[key] || 0) + e.duration || 0;
  }
  const exLabels = Object.keys(byExercise);
  const exData = exLabels.map(k => byExercise[k]);
  const splitEl = document.getElementById("exerciseSplit");
  if (splitEl) {
    if (splitChart) splitChart.destroy();
    splitChart = new Chart(splitEl, {
      type: "doughnut",
      data: { labels: exLabels, datasets: [{ data: exData }] }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const wt = new WorkoutTracker(app);
  window.wt = wt;

  renderCharts();
  window.addEventListener("entries-changed", renderCharts);
});
