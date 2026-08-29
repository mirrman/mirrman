import assert from "node:assert/strict";
import test from "node:test";

import { createGiteaTarget } from "../core/gitea.js";

function response(data, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
    async text() {
      return typeof data === "string" ? data : JSON.stringify(data);
    },
  };
}

function intent() {
  return {
    source: {
      url: "https://github.com/org/repo",
      description: "Original description",
    },
    destination: { name: "repo-mirror", owner: "mirrors" },
    description:
      "[本仓库镜像自 https://github.com/org/repo] — Original description",
    credentials: { sourceToken: "source-token" },
    options: {
      mirror: true,
      private: true,
      wiki: true,
      issues: false,
      pullRequests: true,
      releases: true,
      milestones: true,
      labels: true,
      lfs: false,
      lfsEndpoint: "",
    },
  };
}

test("fixed Gitea target owns authentication and repository owners", async () => {
  const requests = [];
  const target = createGiteaTarget({
    baseUrl: "https://gitea.example.test/tools/",
    token: "target-token",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return url.endsWith("/user/orgs")
        ? response([{ name: "engineering" }])
        : response({ login: "alice" });
    },
  });

  assert.deepEqual(await target.listRepositoryOwners(), [
    { name: "alice", type: "user" },
    { name: "engineering", type: "organization" },
  ]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers.Authorization, "token target-token");
});

test("fixed Gitea target translates canonical intent once", async () => {
  let postedPayload;
  const target = createGiteaTarget({
    baseUrl: "https://gitea.example.test",
    token: "target-token",
    fetchImpl: async (_url, options) => {
      postedPayload = JSON.parse(options.body);
      return response({ full_name: "mirrors/repo-mirror" });
    },
  });

  const result = await target.migrate(intent());
  assert.equal(result.full_name, "mirrors/repo-mirror");
  assert.equal(postedPayload.repo_owner, "mirrors");
  assert.equal(postedPayload.auth_token, "source-token");
  assert.equal(postedPayload.pull_requests, true);
  assert.equal(postedPayload.issues, false);
});

test("migration handoff excludes credentials and keeps raw page metadata", () => {
  const target = createGiteaTarget({
    baseUrl: "https://gitea.example.test/tools",
  });
  const url = new URL(target.createMigrationPageUrl(intent()));

  assert.equal(url.pathname, "/tools/repo/migrate");
  assert.equal(url.searchParams.get("mirrman_description"), "Original description");
  assert.equal(url.searchParams.has("auth_token"), false);
  assert.equal(url.searchParams.has("repo_owner"), false);
  assert.equal(url.searchParams.has("private"), false);
  assert.equal(
    target.isMigrationPage("https://gitea.example.test/tools/repo/migrate?x=1"),
    true,
  );
  assert.equal(
    target.isMigrationPage("https://other.example.test/tools/repo/migrate"),
    false,
  );
});

test("fixed Gitea target owns request error semantics", async () => {
  const rejected = createGiteaTarget({
    baseUrl: "https://gitea.example.test",
    token: "invalid-token",
    fetchImpl: async () => response({ message: "token is invalid" }, { status: 401 }),
  });
  await assert.rejects(
    rejected.verifyAccess(),
    (error) =>
      error.code === "GITEA_REQUEST_FAILED" &&
      error.status === 401 &&
      error.message === "token is invalid",
  );

  const unreachable = createGiteaTarget({
    baseUrl: "https://gitea.example.test",
    token: "target-token",
    fetchImpl: async () => {
      throw new Error("network offline");
    },
  });
  await assert.rejects(
    unreachable.verifyAccess(),
    (error) =>
      error.code === "GITEA_UNREACHABLE" && error.message === "network offline",
  );
});
