import assert from "node:assert/strict";
import test from "node:test";

import { createCommandHandler } from "../background/commands.js";

function settings() {
  return {
    giteaUrl: "https://gitea.example.test/tools",
    giteaToken: "target-token",
    sourceAuthToken: "source-token",
    preferences: {
      descriptionStrategy: "prefix",
      private: true,
      defaultOwner: "mirrors",
      wiki: true,
      issues: true,
      pullRequests: true,
      releases: true,
      milestones: true,
      labels: true,
      lfs: false,
      mirror: true,
    },
  };
}

test("prepares a safe handoff and returns sensitive prefill only to configured Gitea", async () => {
  const handle = createCommandHandler({
    getSettingsImpl: async () => settings(),
  });
  const input = {
    sourceUrl: "https://github.com/go-gitea/gitea",
    destination: { name: "gitea" },
    originalDescription: "Description read from the page",
  };

  const prepared = await handle({ type: "PREPARE_MIGRATE_PAGE", payload: input });
  const handoff = new URL(prepared.url);
  assert.equal(handoff.searchParams.has("auth_token"), false);
  assert.equal(
    handoff.searchParams.get("mirrman_description"),
    "Description read from the page",
  );

  const prefill = await handle(
    { type: "GET_MIGRATE_PREFILL", payload: input },
    { url: "https://gitea.example.test/tools/repo/migrate?mirrman=1" },
  );
  assert.equal(prefill.auth_token, "source-token");
  assert.equal(prefill.repo_owner, "mirrors");
  assert.equal(
    prefill.description,
    "[本仓库镜像自 https://github.com/go-gitea/gitea] — Description read from the page",
  );

  await assert.rejects(
    handle(
      { type: "GET_MIGRATE_PREFILL", payload: input },
      { url: "https://other.example.test/tools/repo/migrate" },
    ),
    (error) => error.code === "MIGRATE_PAGE_MISMATCH",
  );
});

test("runs direct migration through the fixed Gitea target", async () => {
  const requests = [];
  const handle = createCommandHandler({
    getSettingsImpl: async () => settings(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ full_name: "mirrors/gitea" }),
      };
    },
  });

  const result = await handle({
    type: "RUN_MIRROR",
    payload: {
      sourceUrl: "https://github.com/go-gitea/gitea",
      originalDescription: "Gitea",
    },
  });

  assert.equal(result.full_name, "mirrors/gitea");
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/api\/v1\/repos\/migrate$/);
});

test("opens settings through the injected browser adapter", async () => {
  let opened = false;
  const handle = createCommandHandler({
    openOptionsPage: async () => {
      opened = true;
    },
  });

  assert.equal(await handle({ type: "OPEN_OPTIONS_PAGE" }), null);
  assert.equal(opened, true);
});
