"use strict";

// Exercises createPuzzleInstance() - the click-to-select word finding logic -
// against a small, fixed, hand-built puzzle so results are fully predictable.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { FakeElement } = require("./support/fake-dom");
const { loadGame } = require("./support/load-game");

const { api } = loadGame();

function buildFixedPuzzle() {
  const size = api.SIZE;
  const grid = [];
  for (let r = 0; r < size; r++) grid.push(new Array(size).fill("x"));

  // "cat" horizontal along row 0, cols 0-2
  "cat".split("").forEach((ch, i) => {
    grid[0][i] = ch;
  });
  // "dog" vertical along col 5, rows 0-2
  "dog".split("").forEach((ch, i) => {
    grid[i][5] = ch;
  });

  const placements = [
    { word: "cat", cells: [[0, 0], [0, 1], [0, 2]] },
    { word: "dog", cells: [[0, 5], [1, 5], [2, 5]] }
  ];
  return { grid, placements };
}

function mount(puzzle, callbacks) {
  const gridEl = new FakeElement("div");
  const wordListEl = new FakeElement("div");
  const inst = api.createPuzzleInstance(gridEl, wordListEl, puzzle, callbacks || {});
  const cellAt = (r, c) => gridEl.children[r * api.SIZE + c];
  return { gridEl, wordListEl, inst, cellAt };
}

test("renders one cell per grid square and one tag per word", () => {
  const puzzle = buildFixedPuzzle();
  const { gridEl, wordListEl } = mount(puzzle);
  assert.equal(gridEl.children.length, api.SIZE * api.SIZE);
  assert.equal(wordListEl.children.length, puzzle.placements.length);
  assert.equal(wordListEl.children[0].textContent, "cat");
  assert.equal(wordListEl.children[1].textContent, "dog");
});

test("clicking a word's start cell then its end cell finds it", () => {
  const puzzle = buildFixedPuzzle();
  const found = [];
  const { cellAt, wordListEl, inst } = mount(puzzle, {
    onFound: (count, word) => found.push({ count, word })
  });

  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click");

  assert.equal(inst.foundCount(), 1);
  assert.deepEqual(found, [{ count: 1, word: "cat" }]);
  assert.ok(cellAt(0, 0).classList.contains("found"));
  assert.ok(cellAt(0, 1).classList.contains("found"));
  assert.ok(cellAt(0, 2).classList.contains("found"));
  assert.ok(wordListEl.children[0].classList.contains("found"), "the word tag should get struck through");
});

test("clicking end-to-start (reverse order) finds the word too", () => {
  const puzzle = buildFixedPuzzle();
  const { cellAt, inst } = mount(puzzle);

  cellAt(2, 5).dispatch("click"); // bottom of "dog"
  cellAt(0, 5).dispatch("click"); // top of "dog"

  assert.equal(inst.foundCount(), 1);
  assert.ok(cellAt(1, 5).classList.contains("found"), "the middle letter should be marked found too");
});

test("an invalid selection is not marked found and flashes briefly", () => {
  const puzzle = buildFixedPuzzle();
  const { cellAt, inst } = mount(puzzle);

  cellAt(0, 0).dispatch("click");
  cellAt(3, 8).dispatch("click"); // not a straight line from (0,0)

  assert.equal(inst.foundCount(), 0);
  assert.ok(cellAt(0, 0).classList.contains("flash"));
});

test("a straight-line selection that spells nothing real is not marked found", () => {
  const puzzle = buildFixedPuzzle();
  const { cellAt, inst } = mount(puzzle);

  // (0,6)-(0,8) is a straight horizontal line, but not a placed word.
  cellAt(0, 6).dispatch("click");
  cellAt(0, 8).dispatch("click");

  assert.equal(inst.foundCount(), 0);
});

test("clicking the same cell twice cancels the selection instead of matching", () => {
  const puzzle = buildFixedPuzzle();
  const { cellAt, inst } = mount(puzzle);

  cellAt(0, 0).dispatch("click");
  assert.ok(cellAt(0, 0).classList.contains("selected"));
  cellAt(0, 0).dispatch("click");
  assert.ok(!cellAt(0, 0).classList.contains("selected"), "selection should be cleared");
  assert.equal(inst.foundCount(), 0);
});

test("isLocked callback blocks all further selection", () => {
  const puzzle = buildFixedPuzzle();
  const { cellAt, inst } = mount(puzzle, { isLocked: () => true });

  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click");

  assert.equal(inst.foundCount(), 0, "clicks should be ignored while locked");
});

test("onComplete fires only once every word has been found", () => {
  const puzzle = buildFixedPuzzle();
  const completions = [];
  const { cellAt } = mount(puzzle, { onComplete: () => completions.push(Date.now()) });

  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click"); // finds "cat" - 1 of 2 words
  assert.equal(completions.length, 0);

  cellAt(0, 5).dispatch("click");
  cellAt(2, 5).dispatch("click"); // finds "dog" - 2 of 2 words
  assert.equal(completions.length, 1);
});

test("an already-found word cannot be re-matched to double-count", () => {
  const puzzle = buildFixedPuzzle();
  const found = [];
  const { cellAt } = mount(puzzle, { onFound: (count, word) => found.push(word) });

  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click"); // finds "cat"
  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click"); // same selection again

  assert.deepEqual(found, ["cat"], "onFound should only fire once per word");
});
