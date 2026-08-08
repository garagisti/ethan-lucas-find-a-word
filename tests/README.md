# Tests

Automated tests for the game in [`../index.html`](../index.html). Run with:

```sh
npm test
```

(equivalent to `node --test "tests/**/*.test.js"` — no dependencies to
install, Node's built-in test runner does everything.)

## How it works

The game is intentionally a single HTML file with its logic in one inline
`<script>`, and it isn't wrapped in any module system a Node test could
normally `require()`. Rather than keep a second, separate copy of the game
logic (which would inevitably drift out of sync), the tests load and run
**the real script straight out of `index.html`**:

- [`support/load-game.js`](support/load-game.js) reads `index.html`, pulls
  out the inline `<script>` contents, and runs them in a sandboxed Node `vm`
  context — the same code that ships to players.
- [`support/fake-dom.js`](support/fake-dom.js) is a small stand-in for the
  handful of DOM APIs the game uses (`getElementById`, `createElement`,
  `classList`, `addEventListener`, `textContent`, `dataset`, `appendChild`,
  `innerHTML`, `value`, `hidden`, `focus`), just enough for the script to run
  and be driven exactly like a browser would.
- Timers (`setInterval`/`setTimeout`) are faked too, so tests can instantly
  "fast-forward" the stopwatch/countdown with `timers.tick(n)` instead of
  waiting on a real clock.
- A small test-only hook at the bottom of `index.html`'s `<script>` block
  (`if (typeof module !== "undefined") module.exports = {...}`) exposes the
  game's internal functions to the sandbox. It's a no-op in an actual
  browser, since `module` doesn't exist there — the shipped game is
  unaffected.

## Test files

- **`logic.test.js`** — pure puzzle logic: the word bank (lowercase, unique,
  fits the grid), `pickWords`, `generateGrid` (stress-tested across hundreds
  of trials to confirm every word is always placed correctly, in-bounds, and
  in an allowed direction), `pathBetween`, `cellsEqual`, and `fmtTime`.
- **`gameplay.test.js`** — the click-to-select word-finding interaction
  (`createPuzzleInstance`) against a small fixed puzzle: finding a word by
  clicking either end, rejecting invalid selections, locking input, and
  firing the `onFound`/`onComplete` callbacks correctly.
- **`ui-flow.test.js`** — end-to-end screen flow: menu → name entry → game,
  the stopwatch/countdown timers, 1-player completion, and 2-player scoring,
  independent per-player grid layouts, and win/tie detection.
