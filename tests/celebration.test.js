"use strict";

// New feature: when a player successfully finds a word, a short, fun
// celebration animation plays on it - brief enough (under half a second)
// not to slow the game down, but a nice bit of positive feedback for kids.

const fs = require("fs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { FakeElement } = require("./support/fake-dom");
const { loadGame, INDEX_HTML_PATH } = require("./support/load-game");

const MAX_ANIMATION_MS = 500;

function buildFixedPuzzle() {
  const size = 12;
  const grid = [];
  for (let r = 0; r < size; r++) grid.push(new Array(size).fill("x"));
  "cat".split("").forEach((ch, i) => {
    grid[0][i] = ch;
  });
  const placements = [{ word: "cat", cells: [[0, 0], [0, 1], [0, 2]] }];
  return { grid, placements };
}

function mount(api, puzzle, callbacks) {
  const gridEl = new FakeElement("div");
  const wordListEl = new FakeElement("div");
  const inst = api.createPuzzleInstance(gridEl, wordListEl, puzzle, callbacks || {});
  const cellAt = (r, c) => gridEl.children[r * api.SIZE + c];
  return { gridEl, wordListEl, inst, cellAt };
}

test("finding a word immediately marks its cells and word tag as celebrating", () => {
  const { api } = loadGame();
  const { cellAt, wordListEl } = mount(api, buildFixedPuzzle());

  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click");

  [0, 1, 2].forEach((c) => {
    assert.ok(cellAt(0, c).classList.contains("celebrate"), `cell (0,${c}) should be celebrating`);
    assert.ok(cellAt(0, c).classList.contains("found"), `cell (0,${c}) should still be marked found`);
  });
  assert.ok(wordListEl.children[0].classList.contains("celebrate"), "the word tag should be celebrating too");
});

test("the celebration is cleaned up on its own well under half a second later", () => {
  const { api, timers } = loadGame();
  const { cellAt, wordListEl } = mount(api, buildFixedPuzzle());

  cellAt(0, 0).dispatch("click");
  cellAt(0, 2).dispatch("click");

  const celebrationDelays = timers.timeoutDelays.filter((ms) => typeof ms === "number");
  assert.ok(celebrationDelays.length > 0, "expected a cleanup timer to be scheduled");
  celebrationDelays.forEach((ms) => {
    assert.ok(ms < MAX_ANIMATION_MS, `celebration cleanup delay ${ms}ms should be under ${MAX_ANIMATION_MS}ms`);
  });

  timers.tick(1);

  [0, 1, 2].forEach((c) => {
    assert.ok(!cellAt(0, c).classList.contains("celebrate"), `cell (0,${c}) celebration should have ended`);
    assert.ok(cellAt(0, c).classList.contains("found"), `cell (0,${c}) should remain marked found afterwards`);
  });
  assert.ok(!wordListEl.children[0].classList.contains("celebrate"));
});

test("an invalid selection does not trigger the celebration", () => {
  const { api } = loadGame();
  const { cellAt } = mount(api, buildFixedPuzzle());

  cellAt(0, 0).dispatch("click");
  cellAt(5, 9).dispatch("click"); // not a valid straight-line word

  assert.ok(!cellAt(0, 0).classList.contains("celebrate"));
});

test("the game exposes how long the celebration lasts, and it's under half a second", () => {
  const { api } = loadGame();
  assert.equal(typeof api.CELEBRATE_MS, "number", "expected an exported CELEBRATE_MS duration");
  assert.ok(api.CELEBRATE_MS > 0, "the celebration should actually take some time");
  assert.ok(api.CELEBRATE_MS < MAX_ANIMATION_MS, `CELEBRATE_MS (${api.CELEBRATE_MS}ms) should be under ${MAX_ANIMATION_MS}ms`);
});

test("the celebration is a real, short CSS animation defined in index.html", () => {
  const html = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch, "expected an inline <style> block");
  const css = styleMatch[1];

  // Find a rule targeting the celebration class that declares an animation,
  // e.g. `.cell.celebrate { animation: cellPop 0.4s ease; }`.
  const animationRule = css.match(/\.celebrate[^{]*\{[^}]*animation:\s*([a-zA-Z0-9_-]+)\s+([\d.]+)(m?s)[^}]*\}/);
  assert.ok(animationRule, "expected a CSS rule for .celebrate with an `animation` declaration");

  const [, keyframeName, durationValue, unit] = animationRule;
  const durationMs = unit === "ms" ? Number(durationValue) : Number(durationValue) * 1000;
  assert.ok(durationMs < MAX_ANIMATION_MS, `CSS animation duration ${durationMs}ms should be under ${MAX_ANIMATION_MS}ms`);

  const keyframesRegex = new RegExp("@keyframes\\s+" + keyframeName + "\\s*\\{");
  assert.ok(keyframesRegex.test(css), `expected an @keyframes ${keyframeName} block to be defined`);
});
