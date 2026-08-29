import assert from "node:assert/strict";
import test from "node:test";

let messageListener;
let openedTabUrl;
let storedSettings;

global.chrome = {
  runtime: {
    getURL(path) {
      return `extension://mirrman/${path}`;
    },
    lastError: null,
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      },
    },
  },
  tabs: {
    create({ url }, callback) {
      openedTabUrl = url;
      callback();
    },
  },
  storage: {
    local: {
      get(_keys, callback) {
        callback({ mirrman_settings: storedSettings });
      },
    },
  },
};

await import("../background/service-worker.js");

function sendMessage(message, sender = {}) {
  return new Promise((resolve, reject) => {
    const keepChannelOpen = messageListener(message, sender, resolve);
    if (!keepChannelOpen) reject(new Error("message channel was not kept open"));
  });
}

test("service worker returns one command result envelope", async () => {
  storedSettings = {};
  const response = await sendMessage({
    type: "PREPARE_MIGRATE_PAGE",
    payload: {
      sourceUrl: "https://github.com/org/repo",
      originalDescription: "Repository",
    },
  });

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "SETTINGS_REQUIRED");
  assert.match(response.error.message, /Gitea 地址/);
});

test("opens settings through a tabs fallback", async () => {
  openedTabUrl = undefined;
  const response = await sendMessage({ type: "OPEN_OPTIONS_PAGE" });

  assert.deepEqual(response, { ok: true, data: null });
  assert.equal(openedTabUrl, "extension://mirrman/settings/settings.html");
});

test("uses the native options interface when available", async () => {
  let nativeOptionsOpened = false;
  chrome.runtime.openOptionsPage = (callback) => {
    nativeOptionsOpened = true;
    callback();
  };

  const response = await sendMessage({ type: "OPEN_OPTIONS_PAGE" });
  delete chrome.runtime.openOptionsPage;

  assert.deepEqual(response, { ok: true, data: null });
  assert.equal(nativeOptionsOpened, true);
});
