import { ApiError, getActivitySuggestion, getCurrencies, getRateHistory } from "./api.js";
import { calculateBudget, chartPoints, formatMoney, percentChange } from "./budget.js";

const DESTINATIONS = [
  { code: "AR", country: "Argentina", currency: "ARS", city: "Buenos Aires", latitude: -34.6037, longitude: -58.3816 },
  { code: "AU", country: "Australia", currency: "AUD", city: "Sydney", latitude: -33.8688, longitude: 151.2093 },
  { code: "BR", country: "Brazil", currency: "BRL", city: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729 },
  { code: "CA", country: "Canada", currency: "CAD", city: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  { code: "CZ", country: "Czechia", currency: "CZK", city: "Prague", latitude: 50.0755, longitude: 14.4378 },
  { code: "DK", country: "Denmark", currency: "DKK", city: "Copenhagen", latitude: 55.6761, longitude: 12.5683 },
  { code: "FR", country: "France", currency: "EUR", city: "Paris", latitude: 48.8566, longitude: 2.3522 },
  { code: "DE", country: "Germany", currency: "EUR", city: "Berlin", latitude: 52.52, longitude: 13.405 },
  { code: "GR", country: "Greece", currency: "EUR", city: "Athens", latitude: 37.9838, longitude: 23.7275 },
  { code: "HU", country: "Hungary", currency: "HUF", city: "Budapest", latitude: 47.4979, longitude: 19.0402 },
  { code: "IE", country: "Ireland", currency: "EUR", city: "Dublin", latitude: 53.3498, longitude: -6.2603 },
  { code: "IT", country: "Italy", currency: "EUR", city: "Rome", latitude: 41.9028, longitude: 12.4964 },
  { code: "JP", country: "Japan", currency: "JPY", city: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { code: "MX", country: "Mexico", currency: "MXN", city: "Mexico City", latitude: 19.4326, longitude: -99.1332 },
  { code: "NL", country: "Netherlands", currency: "EUR", city: "Amsterdam", latitude: 52.3676, longitude: 4.9041 },
  { code: "NZ", country: "New Zealand", currency: "NZD", city: "Auckland", latitude: -36.8509, longitude: 174.7645 },
  { code: "NO", country: "Norway", currency: "NOK", city: "Oslo", latitude: 59.9139, longitude: 10.7522 },
  { code: "PL", country: "Poland", currency: "PLN", city: "Warsaw", latitude: 52.2297, longitude: 21.0122 },
  { code: "PT", country: "Portugal", currency: "EUR", city: "Lisbon", latitude: 38.7223, longitude: -9.1393 },
  { code: "SG", country: "Singapore", currency: "SGD", city: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { code: "ZA", country: "South Africa", currency: "ZAR", city: "Cape Town", latitude: -33.9249, longitude: 18.4241 },
  { code: "KR", country: "South Korea", currency: "KRW", city: "Seoul", latitude: 37.5665, longitude: 126.978 },
  { code: "ES", country: "Spain", currency: "EUR", city: "Madrid", latitude: 40.4168, longitude: -3.7038 },
  { code: "SE", country: "Sweden", currency: "SEK", city: "Stockholm", latitude: 59.3293, longitude: 18.0686 },
  { code: "CH", country: "Switzerland", currency: "CHF", city: "Zurich", latitude: 47.3769, longitude: 8.5417 },
  { code: "TH", country: "Thailand", currency: "THB", city: "Bangkok", latitude: 13.7563, longitude: 100.5018 },
  { code: "TR", country: "Turkey", currency: "TRY", city: "Istanbul", latitude: 41.0082, longitude: 28.9784 },
  { code: "GB", country: "United Kingdom", currency: "GBP", city: "London", latitude: 51.5072, longitude: -0.1276 },
];

const elements = {
  form: document.querySelector("#budget-form"),
  destination: document.querySelector("#destination"),
  daily: document.querySelector("#daily-budget"),
  days: document.querySelector("#trip-days"),
  submit: document.querySelector("#submit-button"),
  status: document.querySelector("#status"),
  statusText: document.querySelector("#status p"),
  results: document.querySelector("#results"),
  tripDaysCopy: document.querySelector("#trip-days-copy"),
  countryName: document.querySelector("#country-name"),
  rateDate: document.querySelector("#rate-date"),
  localTotal: document.querySelector("#local-total"),
  usdTotal: document.querySelector("#usd-total"),
  localDaily: document.querySelector("#local-daily"),
  usdDaily: document.querySelector("#usd-daily"),
  currentRate: document.querySelector("#current-rate"),
  rateChange: document.querySelector("#rate-change"),
  changeContext: document.querySelector("#change-context"),
  chart: document.querySelector("#chart"),
  chartStart: document.querySelector("#chart-start"),
  chartEnd: document.querySelector("#chart-end"),
  activityCard: document.querySelector("#activity-card"),
  activityTitle: document.querySelector("#activity-title"),
  activityDescription: document.querySelector("#activity-description"),
  activityLink: document.querySelector("#activity-link"),
};

let currencies = [];
let activeController;

function setStatus(message = "", type = "") {
  elements.status.className = `status${message ? " visible" : ""}${type ? ` ${type}` : ""}`;
  elements.statusText.textContent = message;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

function createSvg(tag, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}

function renderChart(rates, currency) {
  const points = chartPoints(rates);
  const svg = createSvg("svg", { viewBox: "0 0 800 220", preserveAspectRatio: "none", "aria-hidden": "true" });
  const defs = createSvg("defs");
  const gradient = createSvg("linearGradient", { id: "area-gradient", x1: "0", y1: "0", x2: "0", y2: "1" });
  gradient.append(createSvg("stop", { offset: "0%", "stop-color": "#aee6c6", "stop-opacity": ".7" }), createSvg("stop", { offset: "100%", "stop-color": "#aee6c6", "stop-opacity": "0" }));
  defs.append(gradient);
  svg.append(defs);
  [55, 110, 165].forEach((y) => svg.append(createSvg("line", { x1: 0, y1: y, x2: 800, y2: y, class: "chart-grid" })));

  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points.at(-1).x},220 L${points[0].x},220 Z`;
  svg.append(createSvg("path", { d: area, class: "chart-area" }), createSvg("path", { d: line, class: "chart-line" }));
  const last = points.at(-1);
  svg.append(createSvg("circle", { cx: last.x, cy: last.y, r: 5, class: "chart-dot" }));
  elements.chart.replaceChildren(svg);
  elements.chart.setAttribute("aria-label", `${rates.length}-point chart of US dollar to ${currency} rates from ${formatDate(rates[0].date)} to ${formatDate(last.date)}. The rate moved from ${rates[0].rate} to ${last.rate}.`);
  elements.chartStart.textContent = formatDate(rates[0].date);
  elements.chartEnd.textContent = formatDate(last.date);
}

function renderActivity(activity, destination) {
  if (!activity) {
    elements.activityTitle.textContent = `Explore ${destination.city}`;
    elements.activityDescription.textContent = "A travel suggestion is temporarily unavailable, but your trip budget is ready.";
    elements.activityLink.hidden = true;
    return;
  }

  const limit = 280;
  const description = activity.description.length > limit
    ? `${activity.description.slice(0, activity.description.lastIndexOf(" ", limit))}…`
    : activity.description;
  elements.activityTitle.textContent = activity.title;
  elements.activityDescription.textContent = description;
  elements.activityLink.href = activity.url;
  elements.activityLink.hidden = false;
}

function render(rates, destination, activity) {
  const code = destination.currency;
  const latest = rates.at(-1);
  const budget = calculateBudget(Number(elements.daily.value), Number(elements.days.value), latest.rate);
  const change = percentChange(rates[0].rate, latest.rate);

  elements.tripDaysCopy.textContent = elements.days.value;
  elements.countryName.textContent = destination.country;
  elements.rateDate.textContent = `Latest rate: ${formatDate(latest.date)}`;
  elements.localTotal.textContent = formatMoney(budget.localTotal, code);
  elements.usdTotal.textContent = `${formatMoney(budget.usdTotal, "USD")} planned`;
  elements.localDaily.textContent = formatMoney(budget.localDaily, code);
  elements.usdDaily.textContent = `${formatMoney(budget.usdDaily, "USD")} per day`;
  elements.currentRate.textContent = formatMoney(latest.rate, code);
  elements.rateChange.textContent = change === null ? "Not available" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  elements.rateChange.className = change === null ? "" : change >= 0 ? "positive" : "negative";
  elements.changeContext.textContent = change === null ? "Insufficient history" : change >= 0 ? "USD buys more than 30 days ago" : "USD buys less than 30 days ago";
  renderChart(rates, code);
  renderActivity(activity, destination);
  elements.results.hidden = false;
  setStatus();
  elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function initialize() {
  setStatus("Loading supported currencies…", "loading");
  try {
    currencies = await getCurrencies();
    const supported = new Set(currencies.map((currency) => currency.iso_code));
    const availableDestinations = DESTINATIONS.filter((destination) => supported.has(destination.currency));
    elements.destination.replaceChildren();
    availableDestinations.forEach((destination) => {
      const option = document.createElement("option");
      option.value = destination.code;
      option.textContent = `${destination.country} · ${destination.currency}`;
      option.selected = destination.code === "FR";
      elements.destination.append(option);
    });
    elements.destination.disabled = false;
    elements.submit.disabled = false;
    setStatus();
  } catch (error) {
    setStatus(error instanceof ApiError ? error.message : "Currencies could not be loaded.", "error");
  }
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;
  activeController?.abort();
  activeController = new AbortController();
  elements.results.hidden = true;
  const destination = DESTINATIONS.find((item) => item.code === elements.destination.value);
  if (!destination) {
    setStatus("Choose a supported destination country.", "error");
    return;
  }
  setStatus(`Building a budget and finding inspiration for ${destination.country}…`, "loading");
  try {
    const [ratesResult, activityResult] = await Promise.allSettled([
      getRateHistory(destination.currency, { signal: activeController.signal }),
      getActivitySuggestion(destination, { signal: activeController.signal }),
    ]);
    if (ratesResult.status === "rejected") throw ratesResult.reason;
    const activity = activityResult.status === "fulfilled" ? activityResult.value : null;
    render(ratesResult.value, destination, activity);
  } catch (error) {
    if (error.name === "AbortError") return;
    setStatus(error instanceof ApiError ? error.message : "Something unexpected happened. Please try again.", "error");
  }
});

initialize();
