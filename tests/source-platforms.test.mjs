import assert from "node:assert/strict";
import test from "node:test";

import {
  getSourceMetadata,
  resolveSourceRepository,
} from "../core/source/index.js";

test("source adapters own exact public hosts and repository parsing", () => {
  assert.deepEqual(
    resolveSourceRepository("https://github.com/openai/openai-node/issues/1"),
    {
      platform: "github",
      host: "github.com",
      owner: "openai",
      name: "openai-node",
      cloneUrl: "https://github.com/openai/openai-node",
    },
  );

  assert.deepEqual(
    resolveSourceRepository("https://gitlab.com/group/subgroup/project/-/issues"),
    {
      platform: "gitlab",
      host: "gitlab.com",
      owner: "group/subgroup",
      name: "project",
      cloneUrl: "https://gitlab.com/group/subgroup/project",
    },
  );

  assert.equal(
    resolveSourceRepository("https://notgithub.com/team/repo").platform,
    "git",
  );
});

test("generic Git remains a fallback adapter", () => {
  assert.deepEqual(
    resolveSourceRepository("git@example.test:team/repository.git"),
    {
      platform: "git",
      host: "example.test",
      owner: "team",
      name: "repository",
      cloneUrl: "git@example.test:team/repository.git",
    },
  );
});

test("metadata implementations receive platform credentials", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      async json() {
        return { description: "Repository description" };
      },
    };
  };

  const github = resolveSourceRepository("https://github.com/org/repo");
  const gitlab = resolveSourceRepository("https://gitlab.com/org/repo");
  assert.equal(
    (await getSourceMetadata(github, { token: "github-token", fetchImpl }))
      .description,
    "Repository description",
  );
  assert.equal(
    (await getSourceMetadata(gitlab, { token: "gitlab-token", fetchImpl }))
      .description,
    "Repository description",
  );

  assert.equal(requests[0].options.headers.Authorization, "Bearer github-token");
  assert.equal(requests[1].options.headers["PRIVATE-TOKEN"], "gitlab-token");
});

test("page action is an optional source adapter capability", () => {
  const registry = globalThis.MirrmanSourcePlatforms;
  assert.deepEqual(registry.getById("github").hosts, ["github.com"]);
  assert.deepEqual(registry.getById("gitlab").hosts, ["gitlab.com"]);
  assert.equal(registry.getById("git").fallback, true);
  assert.deepEqual(registry.getById("git").hosts, []);
  assert.equal(typeof registry.getById("github").pageAction.mount, "function");
  assert.equal(registry.getById("gitlab").pageAction, undefined);
  assert.equal(registry.getById("git").pageAction, undefined);
});
