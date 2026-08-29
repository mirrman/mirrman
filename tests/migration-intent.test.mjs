import assert from "node:assert/strict";
import test from "node:test";

import { prepareMigrationIntent } from "../core/migration-intent.js";

function settings(overrides = {}) {
  return {
    giteaUrl: "https://gitea.example.test",
    giteaToken: "gitea-token",
    sourceAuthToken: "source-token",
    preferences: {
      descriptionStrategy: "prefix",
      private: false,
      defaultOwner: "mirrors",
      wiki: true,
      issues: true,
      pullRequests: true,
      releases: true,
      milestones: true,
      labels: true,
      lfs: false,
      mirror: true,
      ...overrides,
    },
  };
}

test("prepares one canonical migration intent from settings and overrides", async () => {
  const intent = await prepareMigrationIntent(
    {
      sourceUrl: "https://github.com/openai/openai-node",
      destination: { name: "node-mirror", owner: "archive" },
      preferences: { private: true, issues: false, lfsEndpoint: "lfs.test" },
    },
    settings(),
    {
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ description: "Official SDK" }),
      }),
    },
  );

  assert.equal(intent.source.platform, "github");
  assert.equal(intent.source.description, "Official SDK");
  assert.deepEqual(intent.destination, { name: "node-mirror", owner: "archive" });
  assert.equal(
    intent.description,
    "[本仓库镜像自 https://github.com/openai/openai-node] — Official SDK",
  );
  assert.equal(intent.credentials.sourceToken, "source-token");
  assert.equal(intent.options.private, true);
  assert.equal(intent.options.issues, false);
  assert.equal(intent.options.wiki, true);
  assert.equal(intent.options.lfsEndpoint, "lfs.test");
});

test("page-provided metadata is not fetched or prefixed twice", async () => {
  let fetched = false;
  const intent = await prepareMigrationIntent(
    {
      sourceUrl: "https://github.com/org/repo",
      originalDescription: "Read from the page",
    },
    settings(),
    { fetchImpl: async () => (fetched = true) },
  );

  assert.equal(fetched, false);
  assert.equal(intent.source.description, "Read from the page");
  assert.equal(
    intent.description,
    "[本仓库镜像自 https://github.com/org/repo] — Read from the page",
  );
});

test("rejects inputs outside the source adapter contract", async () => {
  await assert.rejects(
    prepareMigrationIntent({ sourceUrl: "not a repository" }, settings()),
    (error) => error.code === "INVALID_SOURCE",
  );
});
