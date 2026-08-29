import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
);

test("content scripts separate source page capability from fixed Gitea page", () => {
  const matches = manifest.content_scripts.flatMap(
    (contentScript) => contentScript.matches || [],
  );

  assert.equal(matches.includes("<all_urls>"), false);
  assert.equal(matches.includes("https://github.com/*/*"), true);
  assert.equal(matches.includes("*://*/repo/migrate*"), true);
  assert.equal(matches.includes("*://*/*/repo/migrate*"), true);

  const sourcePage = manifest.content_scripts.find((contentScript) =>
    contentScript.matches.includes("https://github.com/*/*"),
  );
  assert.deepEqual(sourcePage.js, [
    "core/source/runtime.js",
    "core/source/github.js",
    "shared/web-extension.js",
    "shared/extension-commands.js",
    "content/source-page.js",
  ]);
  assert.deepEqual(sourcePage.css, ["content/mirror-button.css"]);

  const giteaPage = manifest.content_scripts.find((contentScript) =>
    contentScript.matches.includes("*://*/repo/migrate*"),
  );
  assert.deepEqual(giteaPage.js, [
    "shared/web-extension.js",
    "shared/extension-commands.js",
    "content/gitea-migrate-page.js",
  ]);
  assert.equal(giteaPage.css, undefined);

  const scripts = manifest.content_scripts.flatMap(
    (contentScript) => contentScript.js || [],
  );
  assert.equal(scripts.includes("content/mirror-button.js"), false);
});
