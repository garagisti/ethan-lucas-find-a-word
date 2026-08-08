# 🔎 Word Search

A simple, single-file, browser-based word search ("find-a-word") game for
school-age kids. Everything the game needs — markup, styling, and logic —
lives in one file, [`index.html`](index.html). No install, build step, or
internet connection required: just open the file in a browser.

## How to play

1. Open `index.html` in any modern web browser (double-click it, or drag it
   into a browser window).
2. Choose **1 Player** or **2 Player** from the menu.
3. Enter your name (or names, for 2 Player) and click **Start Game**.
4. Find each of the 7 words hidden in the 12×12 grid of lowercase letters by
   clicking its **first letter**, then its **last letter**. You can click
   either end first — both directions count.
   - A correct find highlights the word in blue on the grid and crosses it
     off the word list.
   - An incorrect selection flashes red briefly and clears itself — no
     penalty, just try again.
5. Use **New Game** at any time for a fresh puzzle (new words, new layout,
   same player name(s)), or **Back to Menu** to start over completely.

## Rules

- **Grid:** 12 columns × 12 rows of lowercase letters (a–z).
- **Words:** 7 words per game, randomly chosen each time from a bank of
  ~30 school-age-friendly words (animals, colors, everyday objects, school
  words, etc.).
- **Directions:** words are placed horizontally (left → right), vertically
  (top → bottom), or diagonally (down-right / down-left). Words are never
  placed backwards, so once you spot letters in a line they'll always read
  correctly in one of those four directions.
- **1 Player mode:** race against yourself. A stopwatch counts up from the
  moment you start; finding all 7 words stops the clock and shows your
  finishing time.
- **2 Player mode:** a split-screen, head-to-head race.
  - Both players search for the *same 7 words*, but each side gets its own
    independently laid-out grid — so the words sit in different spots and
    directions on each half (no peeking at your opponent's board for the
    answer).
  - A shared 3-minute countdown timer runs for both players at once.
  - The round ends the moment a player finds all 7 words, or when the timer
    hits 0:00 — whichever comes first.
  - Whoever has found the most words when the round ends wins. If both
    players have found the same number, it's a tie.

## Design

White background, blue lowercase letters, and a blue-bordered box framing
the whole game, grid, and word panels — no external fonts, images, or
libraries.

## Tests

Automated tests live in the [`tests/`](tests) folder and check the game's
actual logic — puzzle generation, word-selection/click handling, timers,
and the full 1-player/2-player screen flow — by loading and running the
real code straight out of `index.html` (no separate copy to drift out of
sync).

Run them with:

```sh
npm test
```

This uses Node's built-in test runner (`node --test`), so no dependencies
need to be installed first. See [`tests/README.md`](tests/README.md) for
details on how the tests work.
