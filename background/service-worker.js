import { buildDescription } from "../core/description.js";
import { parseRepoUrl } from "../core/repo-url.js";
import { getSettings, DEFAULT_SETTINGS } from "../core/storage.js";
import { runMirror } from "../core/mirror.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.type === "GET_MIGRATE_TARGET") {
    getSettings()
      .then((settings) => {
        if (!settings.giteaUrl) {
          sendResponse({ ok: false, code: "SETTINGS_REQUIRED" });
          return;
        }

        sendResponse({
          ok: true,
          giteaUrl: settings.giteaUrl,
          preferences: {
            ...DEFAULT_SETTINGS.preferences,
            ...(settings.preferences || {}),
          },
        });
      })
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message || String(error) }),
      );
    return true;
  }

  if (message.type === "OPEN_OPTIONS_PAGE") {
    openOptionsPage()
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message || String(error) }),
      );
    return true;
  }

  if (message.type === "GET_MIGRATE_PREFILL") {
    (async () => {
      try {
        const settings = await getSettings();
        if (!isConfiguredMigratePage(sender.url, settings.giteaUrl)) {
          throw new Error("迁移页面与 Mirrman 配置的 Gitea 地址不匹配");
        }

        const sourceUrl = (message.payload?.sourceUrl || "").trim();
        const parsed = parseRepoUrl(sourceUrl);
        if (!parsed || parsed.service !== "github") {
          throw new Error("无法解析 GitHub 仓库地址");
        }

        const preferences = {
          ...DEFAULT_SETTINGS.preferences,
          ...(settings.preferences || {}),
        };
        const strategy = preferences.descriptionStrategy;
        const originalDescription =
          (message.payload?.originalDescription || "").trim();

        sendResponse({
          ok: true,
          prefill: {
            clone_addr: sourceUrl,
            repo_name: message.payload?.repoName || parsed.repo,
            auth_token: settings.sourceAuthToken || "",
            description: buildDescription(
              strategy,
              sourceUrl,
              originalDescription,
            ),
            default_owner: preferences.default_owner || "",
            mirror: preferences.mirror,
            private: preferences.private,
            wiki: preferences.wiki,
            issues: preferences.issues,
            pull_requests: preferences.pull_requests,
            releases: preferences.releases,
            milestones: preferences.milestones,
            labels: preferences.labels,
            lfs: preferences.lfs,
          },
        });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }

  if (message.type !== "RUN_MIRROR") return;

  (async () => {
    try {
      const settings = await getSettings();
      const result = await runMirror(message.payload || {}, settings);
      sendResponse({ ok: true, data: result });
    } catch (error) {
      sendResponse({
        ok: false,
        error: { message: error?.message || String(error) },
      });
    }
  })();

  return true;
});

function isConfiguredMigratePage(senderUrl, configuredGiteaUrl) {
  try {
    const sender = new URL(senderUrl || "");
    const configured = new URL(configuredGiteaUrl || "");
    const basePath = configured.pathname.replace(/\/+$/, "");
    return (
      sender.origin === configured.origin &&
      sender.pathname === `${basePath}/repo/migrate`
    );
  } catch (_) {
    return false;
  }
}

function openOptionsPage() {
  if (typeof chrome.runtime.openOptionsPage === "function") {
    return new Promise((resolve, reject) => {
      chrome.runtime.openOptionsPage(() => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message || String(error)));
        else resolve();
      });
    });
  }

  if (typeof chrome.tabs?.create === "function") {
    return new Promise((resolve, reject) => {
      chrome.tabs.create(
        { url: chrome.runtime.getURL("settings/settings.html") },
        () => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message || String(error)));
          else resolve();
        },
      );
    });
  }

  return Promise.reject(new Error("当前浏览器不支持打开扩展设置页"));
}
