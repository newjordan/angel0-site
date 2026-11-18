# angel0-site

Landing page for angel0, the terminal-native agent cockpit.

One static file: `index.html`. No build step, no dependencies, no JavaScript.

## Preview

Open `index.html` directly in a browser, or serve the directory with any static
file server, for example:

    python3 -m http.server

## Layout

- `index.html` — the whole site: markup, styles, and the terminal mock, inline.
- Nav anchors: `#novel`, `#stats`, `#arch`, `#compare`, `#run`.

The page links to the angel0 source repository in its footer.
