import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, getActivitySuggestion, getCurrencies, getRateHistory } from "../src/api.js";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

test("getCurrencies filters non-currency units and sorts names", async () => {
  const body = [
    { iso_code: "XAU", name: "Gold", symbol: "oz" },
    { iso_code: "USD", name: "United States Dollar", symbol: "$" },
    { iso_code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { iso_code: "EUR", name: "Euro", symbol: "€" },
    { iso_code: "BAD", name: null },
  ];
  const result = await getCurrencies({ fetchImpl: async () => jsonResponse(body) });
  assert.deepEqual(result.map((item) => item.iso_code), ["EUR", "JPY"]);
});

test("getRateHistory constructs a safely parameterized v2 request", async () => {
  let requestedUrl;
  const body = [{ date: "2026-08-19", base: "USD", quote: "EUR", rate: 0.86 }];
  const rates = await getRateHistory("EUR", {
    days: 30,
    now: new Date("2026-09-18T12:00:00Z"),
    fetchImpl: async (url) => { requestedUrl = new URL(url); return jsonResponse(body); },
  });
  assert.equal(requestedUrl.pathname, "/v2/rates");
  assert.equal(requestedUrl.searchParams.get("base"), "usd");
  assert.equal(requestedUrl.searchParams.get("quotes"), "eur");
  assert.equal(requestedUrl.searchParams.get("from"), "2026-08-19");
  assert.equal(rates[0].rate, 0.86);
});

test("getRateHistory removes malformed points and sorts by date", async () => {
  const body = [
    { date: "2026-09-18", base: "USD", quote: "EUR", rate: 0.87 },
    { date: "not-a-date", base: "USD", quote: "EUR", rate: 4 },
    { date: "2026-09-17", base: "USD", quote: "EUR", rate: 0.86 },
    { date: "2026-09-16", base: "GBP", quote: "EUR", rate: 1.2 },
  ];
  const rates = await getRateHistory("EUR", { fetchImpl: async () => jsonResponse(body) });
  assert.deepEqual(rates.map((item) => item.date), ["2026-09-17", "2026-09-18"]);
});

test("HTTP failures become ApiErrors with status", async () => {
  await assert.rejects(
    getCurrencies({ fetchImpl: async () => jsonResponse({}, { ok: false, status: 429 }) }),
    (error) => error instanceof ApiError && error.status === 429 && error.message.includes("HTTP 429"),
  );
});

test("empty rate history gives a specific error", async () => {
  await assert.rejects(
    getRateHistory("EUR", { fetchImpl: async () => jsonResponse([]) }),
    /No recent USD\/EUR rates/,
  );
});

test("getActivitySuggestion searches Wikivoyage near the destination city", async () => {
  let requestedUrl;
  const response = {
    query: {
      pages: {
        1: { title: "Paris", index: 0, extract: "Paris city guide.", fullurl: "https://en.wikivoyage.org/wiki/Paris" },
        2: { title: "Left Bank", index: -1, extract: "Walk the river and explore the Latin Quarter.", fullurl: "https://en.wikivoyage.org/wiki/Left_Bank" },
      },
    },
  };
  const activity = await getActivitySuggestion(
    { country: "France", city: "Paris", latitude: 48.8566, longitude: 2.3522 },
    { fetchImpl: async (url) => { requestedUrl = new URL(url); return jsonResponse(response); } },
  );

  assert.equal(requestedUrl.hostname, "en.wikivoyage.org");
  assert.equal(requestedUrl.searchParams.get("generator"), "geosearch");
  assert.equal(requestedUrl.searchParams.get("ggscoord"), "48.8566|2.3522");
  assert.equal(requestedUrl.searchParams.get("origin"), "*");
  assert.deepEqual(activity, {
    title: "Explore Left Bank",
    description: "Walk the river and explore the Latin Quarter.",
    url: "https://en.wikivoyage.org/wiki/Left_Bank",
    source: "Wikivoyage",
    country: "France",
    city: "Paris",
  });
});

test("getActivitySuggestion returns null when no usable guide is available", async () => {
  const activity = await getActivitySuggestion(
    { country: "France", city: "Paris", latitude: 48.8566, longitude: 2.3522 },
    { fetchImpl: async () => jsonResponse({ batchcomplete: "" }) },
  );
  assert.equal(activity, null);
});
