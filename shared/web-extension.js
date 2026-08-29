(function installWebExtensionCompatibility(root) {
  if (root.MirrmanWebExtension) return;

  function selectNamespace() {
    if (root.browser?.runtime) {
      return { api: root.browser, mode: "promise" };
    }
    if (root.chrome?.runtime) {
      return { api: root.chrome, mode: "callback" };
    }
    return null;
  }

  function unavailable(path) {
    const error = new Error(`当前环境不支持浏览器扩展能力：${path}`);
    error.code = "EXTENSION_RUNTIME_UNAVAILABLE";
    return error;
  }

  function resolveMethod(selected, path) {
    let owner = selected.api;
    for (const segment of path.slice(0, -1)) {
      owner = owner?.[segment];
    }

    const name = path[path.length - 1];
    const method = owner?.[name];
    return typeof method === "function" ? { method, owner } : null;
  }

  function invoke(path, args = []) {
    const selected = selectNamespace();
    const displayPath = path.join(".");
    if (!selected) return Promise.reject(unavailable(displayPath));

    const resolved = resolveMethod(selected, path);
    if (!resolved) return Promise.reject(unavailable(displayPath));

    if (selected.mode === "promise") {
      try {
        return Promise.resolve(resolved.method.apply(resolved.owner, args));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve, reject) => {
      resolved.method.apply(resolved.owner, [
        ...args,
        (result) => {
          const runtimeError = selected.api.runtime?.lastError;
          if (runtimeError) {
            reject(new Error(runtimeError.message || String(runtimeError)));
            return;
          }
          resolve(result);
        },
      ]);
    });
  }

  function addMessageListener(listener) {
    const selected = selectNamespace();
    const event = selected?.api.runtime?.onMessage;
    if (typeof event?.addListener !== "function") {
      throw unavailable("runtime.onMessage");
    }
    event.addListener(listener);
  }

  function getURL(path) {
    const selected = selectNamespace();
    const getRuntimeURL = selected?.api.runtime?.getURL;
    if (typeof getRuntimeURL !== "function") {
      throw unavailable("runtime.getURL");
    }
    return getRuntimeURL.call(selected.api.runtime, path);
  }

  async function openOptionsPage(fallbackPath = "settings/settings.html") {
    const selected = selectNamespace();
    if (!selected) throw unavailable("runtime.openOptionsPage");

    if (typeof selected.api.runtime.openOptionsPage === "function") {
      await invoke(["runtime", "openOptionsPage"]);
      return;
    }

    if (typeof selected.api.tabs?.create === "function") {
      await invoke(["tabs", "create"], [{ url: getURL(fallbackPath) }]);
      return;
    }

    throw unavailable("runtime.openOptionsPage");
  }

  root.MirrmanWebExtension = Object.freeze({
    addMessageListener,
    getStorage(keys) {
      return invoke(["storage", "local", "get"], [keys]);
    },
    isAvailable() {
      return selectNamespace() !== null;
    },
    openOptionsPage,
    sendMessage(message) {
      return invoke(["runtime", "sendMessage"], [message]);
    },
    setStorage(value) {
      return invoke(["storage", "local", "set"], [value]);
    },
  });
})(globalThis);
