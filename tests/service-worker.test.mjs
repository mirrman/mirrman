import assert from "node:assert/strict";
import test from "node:test";

let messageListener;
let storedSettings;
let openedTabUrl;

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

test("returns the configured Gitea target with merged preferences", async () => {
  storedSettings = {
    giteaUrl: "https://gitea.example.test/tools",
    sourceAuthToken: "source-token",
    preferences: { default_owner: "mirrors", private: true },
  };

  const response = await sendMessage({ type: "GET_MIGRATE_TARGET" });

  assert.equal(response.ok, true);
  assert.equal(response.giteaUrl, storedSettings.giteaUrl);
  assert.equal(response.preferences.default_owner, "mirrors");
  assert.equal(response.preferences.private, true);
  assert.equal(response.preferences.mirror, true);
  assert.equal(response.preferences.wiki, true);
});

test("only sends sensitive prefill data to the configured migration page", async () => {
  storedSettings = {
    giteaUrl: "https://gitea.example.test/tools",
    sourceAuthToken: "source-token",
    preferences: {
      descriptionStrategy: "prefix",
      default_owner: "mirrors",
      mirror: true,
    },
  };

  const message = {
    type: "GET_MIGRATE_PREFILL",
    payload: {
      sourceUrl: "https://github.com/go-gitea/gitea",
      repoName: "gitea",
      originalDescription: "Description read from the GitHub page",
    },
  };

  const allowed = await sendMessage(message, {
    url: "https://gitea.example.test/tools/repo/migrate?mirrman=1",
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.prefill.auth_token, "source-token");
  assert.equal(allowed.prefill.default_owner, "mirrors");
  assert.equal(
    allowed.prefill.description,
    "[本仓库镜像自 https://github.com/go-gitea/gitea] — Description read from the GitHub page",
  );

  const rejected = await sendMessage(message, {
    url: "https://other.example.test/tools/repo/migrate?mirrman=1",
  });
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /地址不匹配/);
});

test("opens settings through a tabs fallback when openOptionsPage is missing", async () => {
  openedTabUrl = undefined;

  const response = await sendMessage({ type: "OPEN_OPTIONS_PAGE" });

  assert.equal(response.ok, true);
  assert.equal(openedTabUrl, "extension://mirrman/settings/settings.html");
});

test("uses the native options API when the browser provides it", async () => {
  let nativeOptionsOpened = false;
  chrome.runtime.openOptionsPage = (callback) => {
    nativeOptionsOpened = true;
    callback();
  };

  const response = await sendMessage({ type: "OPEN_OPTIONS_PAGE" });
  delete chrome.runtime.openOptionsPage;

  assert.equal(response.ok, true);
  assert.equal(nativeOptionsOpened, true);
});
