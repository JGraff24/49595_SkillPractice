# Balance Trip Budget Explorer

A small, dependency-free website for learning how to request, validate,
transform, and display data from a public REST API. The prototype supports choosing a destination country, entering
a daily US-dollar budget and trip length, and seeing a converted spending envelope, a 30-day exchange-rate trend, and a nearby activity idea.

The site uses [Frankfurter](https://frankfurter.dev/) for key-free exchange-rate
data and the [Wikivoyage API](https://www.mediawiki.org/wiki/API:Main_page) for destination inspiration. It is an educational planning tool—not financial advice or a guarantee of the rate a bank will offer.

## Run locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>

## Test

The test suite uses Node's built-in runner and mocked responses, so it does not
need internet access.

```bash
npm test
```

## Repository guide

- `index.html` — semantic form and result structure
- `styles.css` — responsive layout and interface states
- `src/api.js` — public endpoint requests and validation
- `src/budget.js` — currency, calculation, trend, and chart helpers
- `src/app.js` — interaction and safe DOM rendering
- `test/` — automated unit tests

