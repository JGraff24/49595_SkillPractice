export function calculateBudget(dailyUsd, days, rate) {
  const values = [dailyUsd, days, rate].map(Number);
  if (!values.every(Number.isFinite) || dailyUsd <= 0 || !Number.isInteger(Number(days)) || days < 1 || rate <= 0) {
    throw new RangeError("Budget, trip length, and exchange rate must be positive values.");
  }
  return {
    usdDaily: Number(dailyUsd),
    usdTotal: Number(dailyUsd) * Number(days),
    localDaily: Number(dailyUsd) * Number(rate),
    localTotal: Number(dailyUsd) * Number(days) * Number(rate),
  };
}

export function percentChange(first, last) {
  if (![first, last].every(Number.isFinite) || first === 0) return null;
  return ((last - first) / first) * 100;
}

export function formatMoney(amount, currency, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
  }).format(amount);
}

export function chartPoints(rates, width = 800, height = 220, padding = 10) {
  if (!rates.length) return [];
  const values = rates.map((point) => point.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return rates.map((point, index) => ({
    ...point,
    x: padding + (rates.length === 1 ? usableWidth / 2 : (index / (rates.length - 1)) * usableWidth),
    y: padding + ((max - point.rate) / range) * usableHeight,
  }));
}

export function calculateHolidayBudget(
  dailyUsd,
  days,
  rate,
  additionalSpending = 0
) {
  const base = calculateBudget(dailyUsd, days, rate);
  const extra = Number(additionalSpending);

  if (!Number.isFinite(extra) || extra < 0) {
    throw new RangeError(
      "Additional holiday spending must be a non-negative number."
    );
  }

  return {
    ...base,
    holidaySpendingUsd: extra,
    holidaySpendingLocal: extra * rate,
    adjustedUsdTotal: base.usdTotal + extra,
    adjustedLocalTotal: base.localTotal + extra * rate,
  };
}
