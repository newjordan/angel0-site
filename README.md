# angel0-site

Landing page for [angel0](https://newjordan.github.io/angel0-site/), a terminal-native coding and research cockpit.

The published page is one file, `index.html`: markup and styles, with no JavaScript. GitHub Pages serves that file from the repository root. The Node tooling around it validates the page, checks links and contrast, and can copy the same file into `dist/` for other static hosts.

This repository does not include a license file. These changes do not add one.

## Prerequisites

- A current browser, to read the page.
- Node.js `^22.22.0` or `>=24.8.0`, to install the checker and run the local server. That range is what `html-validate` declares. This repo pins the major in `.nvmrc` (`22`).

Opening `index.html` directly does not need Node.

## Setup

```bash
git clone https://github.com/newjordan/angel0-site.git
cd angel0-site
npm ci
```

`npm ci` installs the locked dev dependency (`html-validate`). Nothing is required at runtime in the browser.

## Usage

Preview the repository root:

```bash
npm run dev
```

The server listens on `http://127.0.0.1:4173` and prints that URL. `npm start` is the same command. Set `PORT` to choose another port. You can also open `index.html` as a file.

The page has no client-side router. Primary navigation is the bar at the top:

| Link | Section |
| --- | --- |
| What's new | `#novel` |
| By the numbers | `#stats` |
| Architecture | `#arch` |
| Compare | `#compare` |
| Run it | `#run` |

On a narrow viewport the same links wrap inside the bar instead of being removed. The comparison rows keep both products; they stack under a label instead of dropping a column. The shell sample is a `pre` block, so newlines survive. Its commands are the interactive no-video launch (`ANGEL_VIDEO=0 bin/angel0`) and the provider-free `--task-json` smoke (`ANGEL_PRACTICE=1`, `--driver practice`, a fresh workspace).

## Checks

```bash
npm test
npm run lint
npm run check
```

- `npm test` runs `node --test` against `test/site.test.mjs`.
- `npm run lint` runs `html-validate` on `index.html` using `.htmlvalidate.json` (`html-validate:recommended` and `html-validate:document`).
- `npm run check` runs lint, the test file, and the build.

The test file checks:

- HTML validation output is empty
- one `h1`, a skip link, `main`, a named `nav`, `footer`, and a table caption
- every `href="#…"` has a matching `id`, and ids are unique
- visible focus, `prefers-reduced-motion`, and `forced-colors` rules exist
- the nav is not removed with `display: none`, and the comparison's third column is not dropped that way
- the shell sample keeps real newlines and the practice-driver flags, and does not point at the private cockpit repository
- palette pairs used for text meet a 4.5:1 contrast ratio
- every `https://` URL in `href` or `content` returns a status below 400 (this check needs network access)
- `npm run build` output matches `index.html`
- the local server returns the page and a 404 for a missing path

## Build

```bash
npm run build
```

This copies `index.html` to `dist/index.html` and writes an empty `dist/.nojekyll`. The build does not bundle, minify, or rewrite the page. `dist/` is gitignored.

## Deployment

GitHub Pages for this repository publishes the `main` branch root (`path: "/"`), not `dist/`. The Pages API reports that site as `https://newjordan.github.io/angel0-site/` with no custom domain. A request to that URL returns 200. Merging to `main` updates the site because Pages serves `index.html` from the root. `.nojekyll` in the root tells Pages to skip Jekyll.

Any other static host can serve the repository root the same way, or serve `dist/` after `npm run build`. Both directories contain the same `index.html`.

Continuous integration is `.github/workflows/ci.yml`. It runs on pushes to `main` and on pull requests: `npm ci`, then `npm run check`. Dependabot watches npm and GitHub Actions weekly.

## Layout

- `index.html` — the page
- `test/site.test.mjs` — the checks above
- `scripts/serve.mjs` — local static server
- `scripts/build.mjs` — copy into `dist/`
- `.github/workflows/ci.yml` — the CI workflow
