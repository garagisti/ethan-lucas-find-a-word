"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { FakeDocument } = require("./fake-dom");

const INDEX_HTML_PATH = path.join(__dirname, "..", "..", "index.html");

function extractIds(html) {
  var ids = new Set();
  var re = /\sid="([^"]+)"/g;
  var m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return Array.from(ids);
}

function extractInlineScript(html) {
  var m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) {
    throw new Error("Could not find an inline <script> block in index.html");
  }
  return m[1];
}

/**
 * Fake setInterval/setTimeout/clearInterval/clearTimeout that never actually
 * wait on the real clock. Tests advance time explicitly with tick(n), which
 * runs every currently-pending job once per "second" - this lets the
 * stopwatch/countdown logic in index.html be tested instantly and
 * deterministically.
 */
function makeFakeTimers() {
  var jobs = new Map();
  var nextId = 1;

  function schedule(fn, repeat) {
    var id = nextId++;
    jobs.set(id, { fn: fn, repeat: repeat });
    return id;
  }

  return {
    setInterval: function (fn) {
      return schedule(fn, true);
    },
    setTimeout: function (fn) {
      return schedule(fn, false);
    },
    clearInterval: function (id) {
      jobs.delete(id);
    },
    clearTimeout: function (id) {
      jobs.delete(id);
    },
    tick: function (times) {
      for (var t = 0; t < (times || 1); t++) {
        Array.from(jobs.keys()).forEach(function (id) {
          var job = jobs.get(id);
          if (!job) return; // cleared earlier in this same tick
          job.fn();
          if (!job.repeat) jobs.delete(id);
        });
      }
    },
    pendingCount: function () {
      return jobs.size;
    }
  };
}

/**
 * Loads and executes index.html's inline game script inside a sandboxed
 * Node vm context, backed by a fake DOM built from the real markup's ids.
 * Returns the game's exported internals plus the fake document/timers so
 * tests can drive it exactly like a browser would (set input values, click
 * buttons/cells, advance the clock) and assert on the results.
 */
function loadGame() {
  var html = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  var script = extractInlineScript(html);
  var ids = extractIds(html);

  var fakeDocument = new FakeDocument(ids);
  var timers = makeFakeTimers();
  var moduleObj = { exports: {} };

  var sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    document: fakeDocument,
    console: console,
    setInterval: timers.setInterval,
    setTimeout: timers.setTimeout,
    clearInterval: timers.clearInterval,
    clearTimeout: timers.clearTimeout
  };

  vm.createContext(sandbox);
  vm.runInContext(script, sandbox, { filename: "index.html (inline script)" });

  if (!moduleObj.exports || typeof moduleObj.exports.pickWords !== "function") {
    throw new Error(
      "index.html did not export its test hook - check the `module.exports` block at the end of its <script>."
    );
  }

  return {
    api: moduleObj.exports,
    document: fakeDocument,
    timers: timers
  };
}

module.exports = { loadGame, extractIds, extractInlineScript, INDEX_HTML_PATH };
