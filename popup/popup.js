import { getSettings } from "../core/storage.js";
import { parseRepoUrl } from "../core/repo-url.js";
import { populateOwnerPicker } from "../shared/owner-picker.js";

function sendMirrorRequest(payload) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("当前环境不支持扩展消息通信"));
      return;
    }

    chrome.runtime.sendMessage({ type: "RUN_MIRROR", payload }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message || String(error)));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error?.message || "镜像任务失败"));
        return;
      }

      resolve(response.data);
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlInput = document.getElementById("url");
  const confirmBtn = document.getElementById("confirm");
  const openSettingsBtn = document.getElementById("openSettings");
  const descSelect = document.getElementById("descStrategy");
  const ownerSelect = document.getElementById("ownerSelect");
  const privateCheckbox = document.getElementById("private");
  const issuesCheckbox = document.getElementById("issues");
  const wikiCheckbox = document.getElementById("wiki");
  const lfsCheckbox = document.getElementById("lfs");
  const lfsEndpointInput = document.getElementById("lfs_endpoint");

  const settings = await getSettings();
  const prefs = settings.preferences || {};
  descSelect.value = prefs.descriptionStrategy || "prefix";
  await populateOwnerPicker(ownerSelect, {
    baseUrl: settings.giteaUrl,
    token: settings.giteaToken,
    defaultOwner: settings.preferences?.default_owner || "",
  });
  privateCheckbox.checked = !!prefs.private;
  issuesCheckbox.checked = prefs.issues !== false;
  wikiCheckbox.checked = prefs.wiki !== false;
  lfsCheckbox.checked = prefs.lfs || false;

  confirmBtn.addEventListener("click", async () => {
    const sourceUrl = urlInput.value.trim();
    if (!sourceUrl) return alert("请输入源仓库URL");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "处理中…";
    try {
      const parsed = parseRepoUrl(sourceUrl);
      if (!parsed || !parsed.repo)
        throw new Error("无法解析仓库地址，请检查输入");

      const result = await sendMirrorRequest({
        sourceUrl,
        repoName: parsed.repo,
        repoOwner: ownerSelect
          ? ownerSelect.value || settings.preferences?.default_owner || ""
          : settings.preferences?.default_owner || "",
        descriptionStrategy: descSelect.value,
        private: privateCheckbox.checked,
        wiki: wikiCheckbox.checked,
        issues: issuesCheckbox.checked,
        pull_requests: settings.preferences?.pull_requests ?? true,
        releases: settings.preferences?.releases ?? true,
        milestones: settings.preferences?.milestones ?? true,
        labels: settings.preferences?.labels ?? true,
        lfs: lfsCheckbox.checked,
        lfs_endpoint: lfsEndpointInput.value || "",
      });

      alert(
        "创建成功: " +
          (result.full_name || result.name || JSON.stringify(result)),
      );
    } catch (e) {
      alert("错误: " + e.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "开始镜像";
    }
  });

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.openOptionsPage
      ) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open("../settings/settings.html", "_blank");
      }
    });
  }
});
