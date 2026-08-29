import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const files = await Promise.all(
  [
    "../core/source/runtime.js",
    "../core/source/github.js",
    "../shared/web-extension.js",
    "../shared/extension-commands.js",
    "../content/source-page.js",
    "../content/gitea-migrate-page.js",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const [
  sourceRuntime,
  githubAdapter,
  webExtensionCompatibility,
  commandClient,
  sourcePage,
  giteaPage,
] = files;

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.className = "";
    this.classList = {
      add: (...names) => (this.className += ` ${names.join(" ")}`),
    };
    this.dataset = {};
    this.disabled = false;
    this.listeners = new Map();
    this.parentElement = null;
    this.textContent = "";
    this.value = "";
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

  dispatchEvent() {}

  getAttribute(name) {
    return this.attributes.get(name) || null;
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

function runScripts(context, ...sources) {
  for (const source of sources) vm.runInNewContext(source, context);
}

function createGithubHarness({
  prepareResponse = {
    ok: true,
    data: { url: "https://gitea.example.test/repo/migrate?mirrman=1" },
  },
  runtimeNamespace = "chrome",
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
  function respond(message) {
    messages.push(message);
    return message.type === "PREPARE_MIGRATE_PAGE"
      ? prepareResponse
      : { ok: true, data: null };
  }
  const extensionGlobals =
    runtimeNamespace === "browser"
      ? {
          browser: {
            runtime: {
              sendMessage(message) {
                return Promise.resolve(respond(message));
              },
            },
          },
          chrome: {},
        }
      : {
          chrome: {
            runtime: {
              lastError: null,
              sendMessage(message, callback) {
                callback(respond(message));
              },
            },
          },
        };
  class MutationObserver {
    observe() {}
  }

  runScripts(
    {
      URL,
      document,
      Event,
      ...extensionGlobals,
      location,
      MutationObserver,
      window,
    },
    sourceRuntime,
    githubAdapter,
    webExtensionCompatibility,
    commandClient,
    sourcePage,
  );

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

test("GitHub pageAction preserves the native action shape", () => {
  const { actionList, forkButton } = createGithubHarness();
  const mirrorButton = actionList.children[1].children[0];

  assert.equal(mirrorButton.tagName, forkButton.tagName);
  assert.match(mirrorButton.className, /\bbtn-sm\b/);
  assert.match(mirrorButton.className, /\bbtn\b/);
  const mirrorIcon = mirrorButton.children[0];
  assert.equal(mirrorIcon.attributes.get("height"), "16");
  assert.equal(mirrorIcon.attributes.get("width"), "16");
});

test("GitHub pageAction sends one migration intent and follows the prepared URL", async () => {
  const harness = createGithubHarness();
  const mirrorButton = harness.actionList.children[1].children[0];

  await mirrorButton.listeners.get("click")({ preventDefault() {} });

  assert.equal(harness.assignedUrl, "https://gitea.example.test/repo/migrate?mirrman=1");
  assert.equal(harness.messages[0].type, "PREPARE_MIGRATE_PAGE");
  assert.equal(
    harness.messages[0].payload.originalDescription,
    "Description read from the GitHub page",
  );
  assert.equal(harness.messages[0].payload.destination.name, "project");
});

test("GitHub pageAction supports promise-based browser.runtime messaging", async () => {
  const harness = createGithubHarness({ runtimeNamespace: "browser" });
  const mirrorButton = harness.actionList.children[1].children[0];

  await mirrorButton.listeners.get("click")({ preventDefault() {} });

  assert.deepEqual(harness.alerts, []);
  assert.equal(
    harness.assignedUrl,
    "https://gitea.example.test/repo/migrate?mirrman=1",
  );
  assert.equal(harness.messages[0].type, "PREPARE_MIGRATE_PAGE");
});

test("GitHub pageAction opens settings when target configuration is missing", async () => {
  const harness = createGithubHarness({
    prepareResponse: {
      ok: false,
      error: { code: "SETTINGS_REQUIRED", message: "Settings required" },
    },
  });
  const mirrorButton = harness.actionList.children[1].children[0];

  await mirrorButton.listeners.get("click")({ preventDefault() {} });

  assert.deepEqual(
    harness.messages.map((message) => message.type),
    ["PREPARE_MIGRATE_PAGE", "OPEN_OPTIONS_PAGE"],
  );
  assert.deepEqual(harness.alerts, []);
});

test("fixed Gitea page module applies the command prefill", async () => {
  const inputs = {
    clone_addr: new MockElement("input"),
    repo_name: new MockElement("input"),
    auth_token: new MockElement("input"),
    description: new MockElement("textarea"),
  };
  const checkboxes = Object.fromEntries(
    [
      "mirror",
      "private",
      "wiki",
      "issues",
      "pull_requests",
      "releases",
      "milestones",
      "labels",
      "lfs",
    ].map((name) => [name, new MockElement("input")]),
  );
  const messages = [];
  const document = {
    documentElement: {},
    querySelector(selector) {
      for (const [name, input] of Object.entries(inputs)) {
        if (selector.includes(name)) return input;
      }
      const checkbox = selector.match(/^input\[name="([^"]+)"\]$/);
      if (checkbox) return checkboxes[checkbox[1]];
      return null;
    },
  };
  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        messages.push(message);
        callback({
          ok: true,
          data: {
            clone_addr: "https://github.com/org/repo",
            repo_name: "repo",
            repo_owner: "",
            auth_token: "source-token",
            description: "Mirrored repository",
            mirror: true,
            private: true,
            wiki: true,
            issues: false,
            pull_requests: true,
            releases: true,
            milestones: true,
            labels: true,
            lfs: false,
          },
        });
      },
    },
  };
  class MutationObserver {
    disconnect() {}
    observe() {}
  }

  runScripts(
    {
      URLSearchParams,
      chrome,
      document,
      Event,
      location: {
        pathname: "/repo/migrate",
        search:
          "?mirrman=1&clone_addr=https%3A%2F%2Fgithub.com%2Forg%2Frepo&repo_name=repo",
      },
      MutationObserver,
      window: { setTimeout() {} },
    },
    webExtensionCompatibility,
    commandClient,
    giteaPage,
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(messages[0].type, "GET_MIGRATE_PREFILL");
  assert.equal(inputs.clone_addr.value, "https://github.com/org/repo");
  assert.equal(inputs.auth_token.value, "source-token");
  assert.equal(inputs.description.value, "Mirrored repository");
  assert.equal(checkboxes.private.checked, true);
  assert.equal(checkboxes.issues.checked, false);
});
