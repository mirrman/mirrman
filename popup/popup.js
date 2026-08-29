import { getSettings } from "../core/settings.js";
import { populateOwnerPicker } from "../shared/owner-picker.js";
import "../shared/web-extension.js";
import "../shared/extension-commands.js";

const commands = globalThis.MirrmanCommands;

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
  const migrateOnlyCheckbox = document.getElementById("migrateOnly");

  const settings = await getSettings();
  const prefs = settings.preferences || {};
  descSelect.value = prefs.descriptionStrategy || "prefix";
  await populateOwnerPicker(ownerSelect, {
    baseUrl: settings.giteaUrl,
    token: settings.giteaToken,
    defaultOwner: settings.preferences.defaultOwner,
  });
  privateCheckbox.checked = !!prefs.private;
  issuesCheckbox.checked = prefs.issues;
  wikiCheckbox.checked = prefs.wiki;
  lfsCheckbox.checked = prefs.lfs;
  migrateOnlyCheckbox.checked = !prefs.mirror;

  confirmBtn.addEventListener("click", async () => {
    const sourceUrl = urlInput.value.trim();
    if (!sourceUrl) return alert("请输入源仓库URL");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "处理中…";
    try {
      const result = await commands.send("RUN_MIRROR", {
        sourceUrl,
        destination: {
          owner: ownerSelect
            ? ownerSelect.value || settings.preferences.defaultOwner
            : settings.preferences.defaultOwner,
        },
        preferences: {
          descriptionStrategy: descSelect.value,
          private: privateCheckbox.checked,
          wiki: wikiCheckbox.checked,
          issues: issuesCheckbox.checked,
          lfs: lfsCheckbox.checked,
          lfsEndpoint: lfsEndpointInput.value || "",
          mirror: migrateOnlyCheckbox ? !migrateOnlyCheckbox.checked : true,
        },
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
    openSettingsBtn.addEventListener("click", async () => {
      try {
        await commands.send("OPEN_OPTIONS_PAGE");
      } catch {
        window.open("../settings/settings.html", "_blank");
      }
    });
  }
});
