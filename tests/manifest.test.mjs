import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
);

test("content scripts only target GitHub repository-like and Gitea migration URLs", () => {
  const matches = manifest.content_scripts.flatMap(
    (contentScript) => contentScript.matches || [],
  );

  assert.equal(matches.includes("<all_urls>"), false);
  assert.equal(matches.includes("https://github.com/*/*"), true);
  assert.equal(matches.includes("*://*/repo/migrate*"), true);
  assert.equal(matches.includes("*://*/*/repo/migrate*"), true);
});
