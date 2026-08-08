"use strict";

// Pure puzzle-generation and selection-matching logic - no DOM interaction
// needed for any of these.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadGame } = require("./support/load-game");

const { api } = loadGame();

// The game's functions run inside a vm sandbox (a separate JS realm), so the
// arrays they return are instances of that realm's Array constructor. Node's
// assert.deepEqual/deepStrictEqual treats that as "not equal" even when the
// contents match, so plain() round-trips values through JSON to normalize
// them into this realm before comparing.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("word bank: every word is lowercase, letters-only, unique, and fits the grid", () => {
  assert.ok(api.WORD_BANK.length >= 7, "needs at least 7 words to draw from");
  const seen = new Set();
  api.WORD_BANK.forEach((word) => {
    assert.equal(word, word.toLowerCase(), `"${word}" should be lowercase`);
    assert.match(word, /^[a-z]+$/, `"${word}" should contain only letters a-z`);
    assert.ok(word.length <= api.SIZE, `"${word}" must fit within a ${api.SIZE}x${api.SIZE} grid`);
    assert.ok(!seen.has(word), `"${word}" is duplicated in the word bank`);
    seen.add(word);
  });
});

test("pickWords(7): returns 7 unique bank words, sorted longest-first", () => {
  for (let i = 0; i < 50; i++) {
    const words = api.pickWords(7);
    assert.equal(words.length, 7);
    assert.equal(new Set(words).size, 7, "words should not repeat within one puzzle");
    words.forEach((w) => assert.ok(api.WORD_BANK.includes(w)));
    for (let j = 1; j < words.length; j++) {
      assert.ok(words[j - 1].length >= words[j].length, "expected longest-first order");
    }
  }
});

test("fmtTime: formats whole seconds as zero-padded mm:ss", () => {
  assert.equal(api.fmtTime(0), "00:00");
  assert.equal(api.fmtTime(5), "00:05");
  assert.equal(api.fmtTime(59), "00:59");
  assert.equal(api.fmtTime(60), "01:00");
  assert.equal(api.fmtTime(125), "02:05");
  assert.equal(api.fmtTime(3599), "59:59");
});

test("cellsEqual: compares [row,col] cell paths by value, not reference", () => {
  assert.ok(api.cellsEqual([[0, 0], [0, 1]], [[0, 0], [0, 1]]));
  assert.ok(!api.cellsEqual([[0, 0], [0, 1]], [[0, 1], [0, 0]]));
  assert.ok(!api.cellsEqual([[0, 0]], [[0, 0], [0, 1]]));
});

test("pathBetween: only accepts horizontal, vertical or 45-degree diagonal lines", () => {
  assert.deepEqual(plain(api.pathBetween(2, 2, 2, 5)), [[2, 2], [2, 3], [2, 4], [2, 5]]); // horizontal
  assert.deepEqual(plain(api.pathBetween(2, 2, 5, 2)), [[2, 2], [3, 2], [4, 2], [5, 2]]); // vertical
  assert.deepEqual(plain(api.pathBetween(0, 0, 3, 3)), [[0, 0], [1, 1], [2, 2], [3, 3]]); // diagonal down-right
  assert.deepEqual(plain(api.pathBetween(0, 3, 3, 0)), [[0, 3], [1, 2], [2, 1], [3, 0]]); // diagonal down-left
  assert.equal(api.pathBetween(0, 0, 0, 0), null, "clicking the same cell twice is not a selection");
  assert.equal(api.pathBetween(0, 0, 3, 5), null, "a bent/knight-move selection is invalid");
});

test("pathBetween: clicking a word's end then its start yields the reverse path", () => {
  const forward = api.pathBetween(1, 1, 1, 4);
  const backward = api.pathBetween(1, 4, 1, 1);
  assert.deepEqual(plain(backward.slice().reverse()), plain(forward));
});

test("generateGrid: reliably places every word correctly (stress test)", () => {
  const trials = 300;
  for (let i = 0; i < trials; i++) {
    const words = api.pickWords(7);
    const puzzle = api.generateGrid(words, api.SIZE);

    assert.equal(puzzle.grid.length, api.SIZE, "grid should have SIZE rows");
    puzzle.grid.forEach((row) => {
      assert.equal(row.length, api.SIZE, "grid should have SIZE columns");
      row.forEach((letter) => assert.match(letter, /^[a-z]$/, "every cell must hold one lowercase letter"));
    });

    assert.equal(puzzle.placements.length, words.length, "every requested word should be placed");

    puzzle.placements.forEach((placement) => {
      assert.equal(placement.cells.length, placement.word.length);

      placement.cells.forEach(([r, c]) => {
        assert.ok(r >= 0 && r < api.SIZE, "row must be on the board");
        assert.ok(c >= 0 && c < api.SIZE, "column must be on the board");
      });

      // The letters at the placement's cells must actually spell the word.
      const spelled = placement.cells.map(([r, c]) => puzzle.grid[r][c]).join("");
      assert.equal(spelled, placement.word);

      // The direction between consecutive cells must be one of the 4 allowed
      // straight lines (no backwards words, no bent paths).
      const [r0, c0] = placement.cells[0];
      const [r1, c1] = placement.cells[1];
      const dr = r1 - r0;
      const dc = c1 - c0;
      const isAllowedDirection =
        (dr === 0 && dc === 1) ||
        (dr === 1 && dc === 0) ||
        (dr === 1 && dc === 1) ||
        (dr === 1 && dc === -1);
      assert.ok(isAllowedDirection, `word "${placement.word}" used an unexpected direction`);
    });
  }
});
