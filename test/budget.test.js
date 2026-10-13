import test from "node:test";
import assert from "node:assert/strict";
import { calculateBudget, calculateHolidayBudget, chartPoints, formatMoney, percentChange } from "../src/budget.js";

test("calculateBudget converts daily and full-trip amounts", () => {
  assert.deepEqual(calculateBudget(100, 7, 0.85), {
    usdDaily: 100,
    usdTotal: 700,
    localDaily: 85,
    localTotal: 595,
  });
});

test("calculateBudget rejects invalid input", () => {
  assert.throws(() => calculateBudget(-5, 7, 1), RangeError);
  assert.throws(() => calculateBudget(100, 1.5, 1), RangeError);
});

test("percentChange reports directional movement", () => {
  assert.ok(Math.abs(percentChange(0.8, 0.84) - 5) < 1e-10);
  assert.equal(percentChange(0, 1), null);
});

test("chartPoints keeps every point inside the view box", () => {
  const points = chartPoints([{ rate: 2 }, { rate: 4 }, { rate: 3 }], 100, 50, 5);
  assert.deepEqual(points.map(({ x, y }) => [x, y]), [[5, 45], [50, 5], [95, 25]]);
});

test("formatMoney uses the requested ISO currency", () => {
  assert.match(formatMoney(12.5, "EUR", "en-US"), /€12\.50/);
});

test("calculateHolidayBudget includes additional spending", () => {
  const result = calculateHolidayBudget(100, 7, 150, 50);

  assert.equal(result.usdTotal, 700);
  assert.equal(result.holidaySpendingUsd, 50);
  assert.equal(result.adjustedUsdTotal, 750);
  assert.equal(result.adjustedLocalTotal, 112500);
});

test("calculateHolidayBudget handles zero additional spending", () => {
  const result = calculateHolidayBudget(100, 7, 150, 0);

  assert.equal(result.adjustedUsdTotal, 700);
  assert.equal(result.adjustedLocalTotal, 105000);
});

test("calculateHolidayBudget rejects negative spending", () => {
  assert.throws(
    () => calculateHolidayBudget(100, 7, 150, -50),
    RangeError
  );
});
