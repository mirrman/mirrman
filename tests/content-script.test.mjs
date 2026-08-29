import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../content/mirror-button.js", import.meta.url),
  "utf8",
);

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.className = "";
    this.classList = { add: (...names) => (this.className += ` ${names.join(" ")}`) };
    this.dataset = {};
    this.listeners = new Map();
    this.parentElement = null;
    this.textContent = "";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  append(...children) {
    for (const child of children) this.appendChild(child);
  }

  appendChild(child) {
    this.children.push(child);
    if (child && typeof child === "object") child.parentElement = this;
    return child;
  }

  closest(selector) {
    if (selector === "li" && this.tagName === "LI") return this;
    return this.parentElement?.closest?.(selector) || null;
  }

  cloneNode() {
    const clone = new MockElement(this.tagName);
    clone.className = this.className;
    clone.attributes = new Map(this.attributes);
    return clone;
  }

  querySelector() {
    return null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

function createGithubHarness({
  targetResponse = { ok: false, code: "SETTINGS_REQUIRED" },
} = {}) {
  const messages = [];
  const alerts = [];
  let assignedUrl;
  const forkAction = new MockElement("li");
  const starAction = new MockElement("li");
  const actionList = new MockElement("ul");
  const forkButton = new MockElement("a");

  forkButton.className = "btn-sm btn";
  forkButton.closest = () => forkAction;
  forkAction.parentElement = actionList;
  starAction.parentElement = actionList;
  starAction.textContent = "Star 3";
  actionList.children = [forkAction, starAction];
  actionList.insertBefore = (item, reference) => {
    const index = actionList.children.indexOf(reference);
    actionList.children.splice(index, 0, item);
    item.parentElement = actionList;
  };

  const document = {
    documentElement: {},
    addEventListener() {},
    createElement: (tagName) => new MockElement(tagName),
    createElementNS: (_namespace, tagName) => new MockElement(tagName),
    createTextNode: (textContent) => ({ textContent }),
    getElementById: () => null,
    querySelector: (selector) => {
      if (selector.includes("#fork-button")) return forkButton;
      if (selector.includes("SidebarAbout-module__description")) {
        return { textContent: "Description read from the GitHub page" };
      }
      return null;
    },
  };

  const location = {
    assign(url) {
      assignedUrl = url;
    },
    href: "https://github.com/example/project",
    hostname: "github.com",
    pathname: "/example/project",
  };

  const window = {
    addEventListener() {},
    alert: (message) => alerts.push(message),
    setTimeout: (callback) => callback(),
  };

  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        messages.push(message);
        if (message.type === "GET_MIGRATE_TARGET") {
          callback(targetResponse);
        } else {
          callback({ ok: true });
        }
      },
    },
  };

  class MutationObserver {
    observe() {}
  }

  vm.runInNewContext(source, {
    URL,
    URLSearchParams,
    chrome,
    console,
    document,
    Event,
    location,
    MutationObserver,
    window,
  });

  return {
    actionList,
    alerts,
    forkButton,
    get assignedUrl() {
      return assignedUrl;
    },
    messages,
  };
}

test("the Mirror action uses the same element type and classes as Fork", () => {
  const { actionList, forkButton } = createGithubHarness();
  const mirrorButton = actionList.children[1].children[0];

  assert.equal(mirrorButton.tagName, forkButton.tagName);
  assert.match(mirrorButton.className, /\bbtn-sm\b/);
  assert.match(mirrorButton.className, /\bbtn\b/);
});

test("opening settings works when openOptionsPage is unavailable", async () => {
  const { actionList, alerts, messages } = createGithubHarness();
  const mirrorButton = actionList.children[1].children[0];

  await mirrorButton.listeners.get("click")({ preventDefault() {} });

  assert.deepEqual(alerts, []);
  assert.deepEqual(
    messages.map((message) => message.type),
    ["GET_MIGRATE_TARGET", "OPEN_OPTIONS_PAGE"],
  );
});

test("uses the native 16px Mirror icon size", () => {
  const { actionList } = createGithubHarness();
  const mirrorIcon = actionList.children[1].children[0].children[0];

  assert.equal(mirrorIcon.attributes.get("height"), "16");
  assert.equal(mirrorIcon.attributes.get("width"), "16");
  assert.equal(mirrorIcon.attributes.has("preserveAspectRatio"), false);
});

test("carries the repository description read from the page to Gitea", async () => {
  const harness = createGithubHarness({
    targetResponse: {
      ok: true,
      giteaUrl: "https://gitea.example.test",
      preferences: { mirror: true },
    },
  });
  const mirrorButton = harness.actionList.children[1].children[0];

  await mirrorButton.listeners.get("click")({ preventDefault() {} });

  const target = new URL(harness.assignedUrl);
  assert.equal(
    target.searchParams.get("mirrman_description"),
    "Description read from the GitHub page",
  );
});
