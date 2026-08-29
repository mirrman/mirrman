(function installExtensionCommands(root) {
  if (root.MirrmanCommands) return;

  const webExtension = root.MirrmanWebExtension;
  if (!webExtension) {
    throw new Error("WebExtension compatibility runtime must be loaded first");
  }

  async function send(type, payload) {
    const response = await webExtension.sendMessage({ type, payload });
    if (!response?.ok) {
      const error = new Error(response?.error?.message || "扩展命令执行失败");
      error.code = response?.error?.code || "COMMAND_FAILED";
      throw error;
    }
    return response.data;
  }

  root.MirrmanCommands = Object.freeze({ send });
})(globalThis);
