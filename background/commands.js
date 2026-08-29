import { createGiteaTarget } from "../core/gitea.js";
import { prepareMigrationIntent } from "../core/migration-intent.js";
import { getSettings } from "../core/settings.js";

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createCommandHandler({
  fetchImpl = fetch,
  getSettingsImpl = getSettings,
  openOptionsPage,
} = {}) {
  return async function handleCommand(message, sender = {}) {
    if (!message?.type) {
      throw createError("INVALID_COMMAND", "扩展命令缺少 type");
    }

    if (message.type === "OPEN_OPTIONS_PAGE") {
      if (typeof openOptionsPage !== "function") {
        throw createError("OPTIONS_UNAVAILABLE", "当前浏览器不支持打开设置页");
      }
      await openOptionsPage();
      return null;
    }

    const settings = await getSettingsImpl();
    const target = createGiteaTarget({
      baseUrl: settings.giteaUrl,
      token: settings.giteaToken,
      fetchImpl,
    });

    if (message.type === "PREPARE_MIGRATE_PAGE") {
      const intent = await prepareMigrationIntent(message.payload, settings, {
        fetchImpl,
      });
      return { url: target.createMigrationPageUrl(intent) };
    }

    if (message.type === "GET_MIGRATE_PREFILL") {
      if (!target.isMigrationPage(sender.url)) {
        throw createError(
          "MIGRATE_PAGE_MISMATCH",
          "迁移页面与 Mirrman 配置的 Gitea 地址不匹配",
        );
      }
      const intent = await prepareMigrationIntent(message.payload, settings, {
        fetchImpl,
      });
      return target.createMigrationPrefill(intent);
    }

    if (message.type === "RUN_MIRROR") {
      const intent = await prepareMigrationIntent(message.payload, settings, {
        fetchImpl,
      });
      return target.migrate(intent);
    }

    throw createError("UNKNOWN_COMMAND", `未知扩展命令：${message.type}`);
  };
}
