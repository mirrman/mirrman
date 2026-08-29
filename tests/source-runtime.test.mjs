import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const runtimeSource = await readFile(
  new URL("../core/source/runtime.js", import.meta.url),
  "utf8",
);

function createRegistry() {
  const context = { URL };
  vm.runInNewContext(runtimeSource, context);
  return context.MirrmanSourcePlatforms;
}

function metadata() {
  return Promise.resolve({ description: "" });
}

test("registry resolves a declared hostname without probing other adapters", () => {
  const registry = createRegistry();
  const calls = { alpha: 0, beta: 0, fallback: 0 };

  registry.register({
    id: "alpha",
    hosts: ["alpha.example"],
    parse(address) {
      calls.alpha += 1;
      return { platform: "alpha", host: address.host };
    },
    getMetadata: metadata,
  });
  registry.register({
    id: "beta",
    hosts: ["beta.example"],
    parse(address) {
      calls.beta += 1;
      return { platform: "beta", host: address.host };
    },
    getMetadata: metadata,
  });
  registry.register({
    id: "git",
    hosts: [],
    fallback: true,
    parse(address) {
      calls.fallback += 1;
      return { platform: "git", host: address.host };
    },
    getMetadata: metadata,
  });

  const resolved = registry.resolve("https://beta.example/team/repository");

  assert.equal(resolved.adapter.id, "beta");
  assert.equal(resolved.repository.host, "beta.example");
  assert.deepEqual(calls, { alpha: 0, beta: 1, fallback: 0 });
});

test("registry sends unknown hosts directly to the fallback adapter", () => {
  const registry = createRegistry();
  let specificCalls = 0;
  let fallbackCalls = 0;

  registry.register({
    id: "specific",
    hosts: ["specific.example"],
    parse() {
      specificCalls += 1;
      return { platform: "specific" };
    },
    getMetadata: metadata,
  });
  registry.register({
    id: "git",
    hosts: [],
    fallback: true,
    parse(address) {
      fallbackCalls += 1;
      return { platform: "git", host: address.host };
    },
    getMetadata: metadata,
  });

  const resolved = registry.resolve("git@unknown.example:team/repository.git");

  assert.equal(resolved.adapter.id, "git");
  assert.equal(specificCalls, 0);
  assert.equal(fallbackCalls, 1);
});

test("registry does not reclassify an owned host through the fallback", () => {
  const registry = createRegistry();
  let fallbackCalls = 0;

  registry.register({
    id: "specific",
    hosts: ["specific.example"],
    parse() {
      return null;
    },
    getMetadata: metadata,
  });
  registry.register({
    id: "git",
    hosts: [],
    fallback: true,
    parse() {
      fallbackCalls += 1;
      return { platform: "git" };
    },
    getMetadata: metadata,
  });

  assert.equal(
    registry.resolve("https://specific.example/not-a-repository"),
    null,
  );
  assert.equal(fallbackCalls, 0);
});

test("registry rejects duplicate host ownership and multiple fallbacks", () => {
  const registry = createRegistry();
  registry.register({
    id: "first",
    hosts: ["shared.example"],
    parse() {},
    getMetadata: metadata,
  });

  assert.throws(
    () =>
      registry.register({
        id: "second",
        hosts: ["SHARED.EXAMPLE"],
        parse() {},
        getMetadata: metadata,
      }),
    /host already registered/i,
  );

  registry.register({
    id: "fallback-one",
    hosts: [],
    fallback: true,
    parse() {},
    getMetadata: metadata,
  });
  assert.throws(
    () =>
      registry.register({
        id: "fallback-two",
        hosts: [],
        fallback: true,
        parse() {},
        getMetadata: metadata,
      }),
    /fallback already registered/i,
  );
});
