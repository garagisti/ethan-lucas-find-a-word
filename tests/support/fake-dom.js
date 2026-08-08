"use strict";

/**
 * A deliberately tiny stand-in for the browser DOM APIs the game actually
 * uses (getElementById/createElement/classList/addEventListener/textContent/
 * dataset/appendChild/innerHTML/value/hidden/focus). It is NOT a general
 * purpose DOM - just enough surface area for index.html's inline <script>
 * to run unmodified inside Node so its real logic can be exercised by tests.
 */

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(cls) {
    this._set.add(cls);
  }
  remove(cls) {
    this._set.delete(cls);
  }
  contains(cls) {
    return this._set.has(cls);
  }
  toggle(cls) {
    if (this._set.has(cls)) this._set.delete(cls);
    else this._set.add(cls);
  }
}

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.id = "";
    this.className = "";
    this.dataset = {};
    this.hidden = false;
    this.value = "";
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList();
    this._listeners = {};
    this._text = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(function (h) {
      return h !== handler;
    });
  }

  /**
   * Test-only helper (not a real DOM method): fires every listener bound to
   * `type` with a minimal fake event object, the same way a real click/
   * keydown would reach the game's event handlers.
   */
  dispatch(type, evtProps) {
    var evt = Object.assign({ currentTarget: this, target: this }, evtProps || {});
    (this._listeners[type] || []).forEach(function (handler) {
      handler(evt);
    });
  }

  focus() {
    /* no-op */
  }

  get textContent() {
    return this._text;
  }
  set textContent(v) {
    this._text = v;
    this.children = [];
  }

  // The game only ever sets innerHTML = "" to clear a container before
  // re-rendering, so that's the only behaviour this needs to support.
  get innerHTML() {
    return this._text;
  }
  set innerHTML(v) {
    this._text = v;
    this.children = [];
  }
}

class FakeDocument {
  constructor(ids) {
    this._byId = new Map();
    (ids || []).forEach((id) => {
      var el = new FakeElement("div");
      el.id = id;
      this._byId.set(id, el);
    });
  }
  getElementById(id) {
    return this._byId.has(id) ? this._byId.get(id) : null;
  }
  createElement(tag) {
    return new FakeElement(tag);
  }
}

module.exports = { FakeElement, FakeClassList, FakeDocument };
