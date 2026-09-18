const API_ROOT = "https://api.frankfurter.dev/v2";
const WIKIVOYAGE_ENDPOINT = "https://en.wikivoyage.org/w/api.php";

export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson(url, { signal, fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(url, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the exchange-rate service. Check your connection and try again.");
  }

  if (!response.ok) {
    throw new ApiError(`The exchange-rate service returned HTTP ${response.status}. Please try again later.`, response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError("The exchange-rate service returned data that was not valid JSON.");
  }
}

export async function getCurrencies(options = {}) {
  const data = await requestJson(`${API_ROOT}/currencies`, options);
  if (!Array.isArray(data)) throw new ApiError("The currency service returned an unexpected response.");

  return data
    .filter((currency) => /^[A-Z]{3}$/.test(currency.iso_code) && currency.iso_code !== "USD" && !currency.iso_code.startsWith("X") && typeof currency.name === "string")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRateHistory(quote, { days = 30, now = new Date(), ...options } = {}) {
  if (!/^[A-Z]{3}$/.test(quote) || quote === "USD") throw new ApiError("Choose a valid destination currency.");
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new ApiError("History must be between 1 and 365 days.");

  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  const url = new URL(`${API_ROOT}/rates`);
  url.search = new URLSearchParams({
    base: "usd",
    quotes: quote.toLowerCase(),
    from: start.toISOString().slice(0, 10),
  });

  const data = await requestJson(url, options);
  if (!Array.isArray(data) || data.length === 0) throw new ApiError(`No recent USD/${quote} rates were available.`);

  const valid = data.filter((point) => point.base === "USD" && point.quote === quote && /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(point.rate) && point.rate > 0);
  if (valid.length === 0) throw new ApiError("The rate service returned no usable data points.");
  return valid.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getActivitySuggestion(destination, options = {}) {
  const { country, city, latitude, longitude } = destination;
  if (!country || !city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError("The destination does not have enough information for an activity search.");
  }

  const url = new URL(WIKIVOYAGE_ENDPOINT);
  url.search = new URLSearchParams({
    action: "query",
    generator: "geosearch",
    ggsprimary: "all",
    ggsnamespace: "0",
    ggsradius: "10000",
    ggslimit: "10",
    ggscoord: `${latitude}|${longitude}`,
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    inprop: "url",
    format: "json",
    origin: "*",
  });

  const data = await requestJson(url, options);
  const pages = Object.values(data.query?.pages ?? {})
    .filter((page) => typeof page.title === "string" && typeof page.extract === "string" && page.extract.trim() && /^https:\/\/en\.wikivoyage\.org\//.test(page.fullurl))
    .sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER));
  const suggestion = pages.find((page) => page.title.toLowerCase() !== city.toLowerCase()) ?? pages[0];
  if (!suggestion) return null;

  return {
    title: `Explore ${suggestion.title}`,
    description: suggestion.extract.replace(/\s+/g, " ").trim(),
    url: suggestion.fullurl,
    source: "Wikivoyage",
    country,
    city,
  };
}
