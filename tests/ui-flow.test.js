"use strict";

// End-to-end style tests driving the actual screens/buttons/timers exactly
// as a player would: enter a name, click Start, click grid cells, let the
// clock run. Each test calls loadGame() fresh so state never leaks between
// tests (fake timers included - nothing here waits on a real clock).

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadGame } = require("./support/load-game");

test("boots on the menu screen with every other screen hidden", () => {
  const { document: doc } = loadGame();
  assert.equal(doc.getElementById("menu").hidden, false);
  ["setup1p", "setup2p", "game1p", "game2p"].forEach((id) => {
    assert.equal(doc.getElementById(id).hidden, true, `${id} should start hidden`);
  });
});

test("1 player: entering a name and starting shows it in the game and stores it", () => {
  const { document: doc, api } = loadGame();
  doc.getElementById("name1p").value = "Alex";
  doc.getElementById("startBtn1p").dispatch("click");

  assert.equal(doc.getElementById("game1p").hidden, false);
  assert.equal(doc.getElementById("setup1p").hidden, true);
  assert.equal(doc.getElementById("nameBadge1p").textContent, "Alex");
  assert.equal(api.getState().playerName1p, "Alex");
  assert.equal(doc.getElementById("grid1p").children.length, api.SIZE * api.SIZE);
});

test("1 player: a blank name falls back to 'Player'", () => {
  const { document: doc, api } = loadGame();
  doc.getElementById("name1p").value = "   ";
  doc.getElementById("startBtn1p").dispatch("click");

  assert.equal(doc.getElementById("nameBadge1p").textContent, "Player");
  assert.equal(api.getState().playerName1p, "Player");
});

test("1 player: stopwatch counts up, then stops and announces the name+time on completion", () => {
  const { document: doc, api, timers } = loadGame();
  doc.getElementById("name1p").value = "Sam";
  doc.getElementById("startBtn1p").dispatch("click");

  timers.tick(3);
  assert.equal(doc.getElementById("stopwatch").textContent, "Time: 00:03");

  const puzzle = api.getState().currentPuzzle1p;
  const gridEl = doc.getElementById("grid1p");
  const cellAt = (r, c) => gridEl.children[r * api.SIZE + c];

  puzzle.placements.forEach((p) => {
    const [r0, c0] = p.cells[0];
    const [r1, c1] = p.cells[p.cells.length - 1];
    cellAt(r0, c0).dispatch("click");
    cellAt(r1, c1).dispatch("click");
  });

  assert.equal(api.getState().locked1p, true);
  assert.equal(doc.getElementById("banner1p").hidden, false);
  assert.match(doc.getElementById("banner1p").textContent, /Sam found all 7 words in 00:03/);

  const timeAtFinish = doc.getElementById("stopwatch").textContent;
  timers.tick(5);
  assert.equal(doc.getElementById("stopwatch").textContent, timeAtFinish, "stopwatch should stop once solved");
});

test("2 player: names apply to each side, and each side gets its own grid layout", () => {
  const { document: doc, api } = loadGame();
  doc.getElementById("name2p-p1").value = "Riley";
  doc.getElementById("name2p-p2").value = "Jordan";
  doc.getElementById("startBtn2p").dispatch("click");

  assert.equal(doc.getElementById("game2p").hidden, false);
  assert.equal(doc.getElementById("heading-p1").textContent, "Riley");
  assert.equal(doc.getElementById("heading-p2").textContent, "Jordan");
  assert.equal(doc.getElementById("score-p1").textContent, "Found: 0 / 7");
  assert.equal(doc.getElementById("score-p2").textContent, "Found: 0 / 7");
  assert.equal(doc.getElementById("grid-p1").children.length, api.SIZE * api.SIZE);
  assert.equal(doc.getElementById("grid-p2").children.length, api.SIZE * api.SIZE);

  const state = api.getState();
  const wordsP1 = state.currentPuzzleP1.placements.map((p) => p.word).sort();
  const wordsP2 = state.currentPuzzleP2.placements.map((p) => p.word).sort();
  assert.deepEqual(wordsP1, wordsP2, "both players should be looking for the same 7 words");

  // The two boards must not simply be mirrors of each other.
  const cellsFor = (placements, word) => JSON.stringify(placements.find((p) => p.word === word).cells);
  const anyDifferentPlacement = state.currentPuzzleP1.placements.some(
    (p) => cellsFor(state.currentPuzzleP1.placements, p.word) !== cellsFor(state.currentPuzzleP2.placements, p.word)
  );
  assert.ok(anyDifferentPlacement, "expected each player's grid to place words in different spots");
});

test("2 player: blank names fall back to 'Player 1' / 'Player 2'", () => {
  const { document: doc } = loadGame();
  doc.getElementById("startBtn2p").dispatch("click");
  assert.equal(doc.getElementById("heading-p1").textContent, "Player 1");
  assert.equal(doc.getElementById("heading-p2").textContent, "Player 2");
});

test("2 player: finding all 7 words first ends the round and declares that player the winner", () => {
  const { document: doc, api } = loadGame();
  doc.getElementById("name2p-p1").value = "Riley";
  doc.getElementById("name2p-p2").value = "Jordan";
  doc.getElementById("startBtn2p").dispatch("click");

  const puzzle = api.getState().currentPuzzleP1;
  const gridEl = doc.getElementById("grid-p1");
  const cellAt = (r, c) => gridEl.children[r * api.SIZE + c];

  puzzle.placements.forEach((p) => {
    const [r0, c0] = p.cells[0];
    const [r1, c1] = p.cells[p.cells.length - 1];
    cellAt(r0, c0).dispatch("click");
    cellAt(r1, c1).dispatch("click");
  });

  assert.equal(doc.getElementById("score-p1").textContent, "Found: 7 / 7");
  assert.equal(doc.getElementById("banner2p").hidden, false);
  assert.match(doc.getElementById("banner2p").textContent, /Riley found all 7 words first/);
  assert.match(doc.getElementById("banner2p").textContent, /Riley wins/);

  // The round should be over: player 2's clicks should no longer count.
  const gridEl2 = doc.getElementById("grid-p2");
  const cellAt2 = (r, c) => gridEl2.children[r * api.SIZE + c];
  const p2Puzzle = api.getState().currentPuzzleP2;
  const [r0, c0] = p2Puzzle.placements[0].cells[0];
  const [r1, c1] = p2Puzzle.placements[0].cells[p2Puzzle.placements[0].cells.length - 1];
  cellAt2(r0, c0).dispatch("click");
  cellAt2(r1, c1).dispatch("click");
  assert.equal(doc.getElementById("score-p2").textContent, "Found: 0 / 7", "game should be locked after it ends");
});

test("2 player: the countdown reaching zero ends the round even if nobody finished", () => {
  const { document: doc, timers } = loadGame();
  doc.getElementById("startBtn2p").dispatch("click");

  assert.equal(doc.getElementById("countdown").textContent, "Time Left: 03:00");
  timers.tick(180);

  assert.equal(doc.getElementById("countdown").textContent, "Time Left: 00:00");
  assert.equal(doc.getElementById("banner2p").hidden, false);
  assert.match(doc.getElementById("banner2p").textContent, /Time's up!/);
  assert.match(doc.getElementById("banner2p").textContent, /tie/i);
});

test("New Game generates a fresh puzzle without asking for names again", () => {
  const { document: doc, api } = loadGame();
  doc.getElementById("name1p").value = "Alex";
  doc.getElementById("startBtn1p").dispatch("click");
  const firstPuzzle = api.getState().currentPuzzle1p;

  doc.getElementById("new1p").dispatch("click");
  const secondPuzzle = api.getState().currentPuzzle1p;

  assert.equal(doc.getElementById("nameBadge1p").textContent, "Alex", "name should be remembered");
  assert.equal(doc.getElementById("stopwatch").textContent, "Time: 00:00", "stopwatch should reset");
  assert.notDeepEqual(
    firstPuzzle.placements.map((p) => p.word),
    secondPuzzle.placements.map((p) => p.word),
    "expected a new random word selection (extremely unlikely to collide)"
  );
});

test("Back to Menu returns to the menu screen from either mode", () => {
  const { document: doc } = loadGame();
  doc.getElementById("startBtn1p").dispatch("click");
  doc.getElementById("menu1p").dispatch("click");
  assert.equal(doc.getElementById("menu").hidden, false);
  assert.equal(doc.getElementById("game1p").hidden, true);
});
