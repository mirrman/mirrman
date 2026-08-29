import assert from "node:assert/strict";
import test from "node:test";

let storedSettings;
let persistedSettings;

global.chrome = {
  runtime: { lastError: null },
  storage: {
    local: {
      get(_keys, callback) {
        callback({ mirrman_settings: storedSettings });
      },
      set(value, callback) {
        persistedSettings = value.mirrman_settings;
        callback();
      },
    },
  },
};

const { getSettings, setSettings } = await import("../core/settings.js");

test("normalizes legacy and partial settings at the module interface", async () => {
  storedSettings = {
    giteaUrl: "https://gitea.example.test/tools/",
    preferences: {
      default_owner: "mirrors",
      private: true,
      issues: false,
      pull_requests: false,
    },
  };

  const settings = await getSettings();

  assert.equal(settings.giteaUrl, "https://gitea.example.test/tools");
  assert.equal(settings.preferences.defaultOwner, "mirrors");
  assert.equal(settings.preferences.private, true);
  assert.equal(settings.preferences.issues, false);
  assert.equal(settings.preferences.pullRequests, false);
  assert.equal(settings.preferences.wiki, true);
  assert.equal(settings.preferences.mirror, true);
  assert.equal("default_owner" in settings.preferences, false);
});

test("persists only the normalized settings schema", async () => {
  await setSettings({
    giteaUrl: " https://gitea.example.test/ ",
    giteaToken: " target-token ",
    preferences: { default_owner: "legacy-owner", labels: false },
  });

  assert.equal(persistedSettings.giteaUrl, "https://gitea.example.test");
  assert.equal(persistedSettings.giteaToken, "target-token");
  assert.equal(persistedSettings.preferences.defaultOwner, "legacy-owner");
  assert.equal(persistedSettings.preferences.labels, false);
  assert.equal(persistedSettings.preferences.releases, true);
  assert.equal("default_owner" in persistedSettings.preferences, false);
});
