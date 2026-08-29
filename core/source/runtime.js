(function installSourcePlatformRuntime(root) {
  if (root.MirrmanSourcePlatforms) return;

  const adaptersByHost = new Map();
  const adaptersById = new Map();
  let fallbackAdapter = null;

  function stripGitSuffix(value) {
    return (value || "").replace(/\.git$/i, "");
  }

  function parseAddress(input) {
    const value = (input || "").trim();
    if (!value) return null;

    const scpLike = value.match(/^git@([^:]+):(.+)$/i);
    if (scpLike) {
      return {
        host: scpLike[1].toLowerCase(),
        input: value,
        segments: scpLike[2]
          .replace(/^\/+|\/+$/g, "")
          .split("/")
          .map(decodeURIComponent),
      };
    }

    try {
      const url = new URL(value);
      return {
        host: url.hostname.toLowerCase(),
        input: value,
        segments: url.pathname
          .replace(/^\/+|\/+$/g, "")
          .split("/")
          .filter(Boolean)
          .map(decodeURIComponent),
      };
    } catch (_) {
      const shorthand = value.match(/^([^/\s]+)\/(.+)$/);
      if (!shorthand) return null;
      return {
        host: "",
        input: value,
        segments: [shorthand[1], ...shorthand[2].split("/")].map(
          decodeURIComponent,
        ),
      };
    }
  }

  function register(adapter) {
    if (!adapter?.id || typeof adapter.parse !== "function") {
      throw new Error("Source platform adapter requires id and parse");
    }
    if (typeof adapter.getMetadata !== "function") {
      throw new Error(
        `Source platform adapter ${adapter.id} requires getMetadata`,
      );
    }
    if (adaptersById.has(adapter.id)) {
      throw new Error(
        `Source platform adapter id already registered: ${adapter.id}`,
      );
    }
    if (!Array.isArray(adapter.hosts)) {
      throw new Error(`Source platform adapter ${adapter.id} requires hosts`);
    }

    const hosts = adapter.hosts.map((host) =>
      String(host || "").trim().toLowerCase(),
    );
    if (hosts.some((host) => !host)) {
      throw new Error(`Source platform adapter ${adapter.id} contains an empty host`);
    }
    if (new Set(hosts).size !== hosts.length) {
      throw new Error(`Source platform adapter ${adapter.id} contains duplicate hosts`);
    }

    const isFallback = adapter.fallback === true;
    if (isFallback && hosts.length > 0) {
      throw new Error(`Source platform fallback ${adapter.id} cannot declare hosts`);
    }
    if (!isFallback && hosts.length === 0) {
      throw new Error(
        `Source platform adapter ${adapter.id} requires at least one host`,
      );
    }
    if (isFallback && fallbackAdapter) {
      throw new Error(
        `Source platform fallback already registered: ${fallbackAdapter.id}`,
      );
    }

    for (const host of hosts) {
      const owner = adaptersByHost.get(host);
      if (owner) {
        throw new Error(
          `Source platform host already registered: ${host} (${owner.id})`,
        );
      }
    }

    const registered = Object.freeze({
      ...adapter,
      hosts: Object.freeze(hosts),
    });
    adaptersById.set(registered.id, registered);
    if (isFallback) {
      fallbackAdapter = registered;
      return;
    }
    for (const host of hosts) adaptersByHost.set(host, registered);
  }

  function resolve(input) {
    const address = parseAddress(input);
    if (!address) return null;

    const adapter = adaptersByHost.get(address.host) || fallbackAdapter;
    if (!adapter) return null;

    const repository = adapter.parse(address);
    return repository ? { adapter, repository } : null;
  }

  function getById(id) {
    return adaptersById.get(id) || null;
  }

  root.MirrmanSourcePlatforms = Object.freeze({
    getById,
    register,
    resolve,
    stripGitSuffix,
  });
})(globalThis);
