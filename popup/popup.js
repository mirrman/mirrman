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
  const pullRequestsCheckbox = document.getElementById("pullRequests");
  const releasesCheckbox = document.getElementById("releases");
  const milestonesCheckbox = document.getElementById("milestones");
  const labelsCheckbox = document.getElementById("labels");
  const wikiCheckbox = document.getElementById("wiki");
  const lfsCheckbox = document.getElementById("lfs");
  const lfsEndpointInput = document.getElementById("lfs_endpoint");
  const migrateOnlyCheckbox = document.getElementById("migrateOnly");
  const tokenRequiredToggles = document.querySelectorAll(".token-required-toggle");

  const syncTokenRequirementState = (sourceToken) => {
    const hasSourceToken = !!sourceToken;
    tokenRequiredToggles.forEach((toggle) => {
      const checkbox = toggle.querySelector("input");
      if (!checkbox) return;
      checkbox.disabled = !hasSourceToken;
      toggle.classList.toggle("is-disabled", !hasSourceToken);
      if (!hasSourceToken) {
        checkbox.checked = false;
      }
    });
  };

  const settings = await getSettings();
  const prefs = settings.preferences || {};
  descSelect.value = prefs.descriptionStrategy || "prefix";
  await populateOwnerPicker(ownerSelect, {
    baseUrl: settings.giteaUrl,
    token: settings.giteaToken,
    defaultOwner: settings.preferences.defaultOwner,
  });
  privateCheckbox.checked = !!prefs.private;
  wikiCheckbox.checked = prefs.wiki;
  lfsCheckbox.checked = prefs.lfs;
  migrateOnlyCheckbox.checked = !prefs.mirror;
  issuesCheckbox.checked = !!settings.sourceAuthToken && !!prefs.issues;
  pullRequestsCheckbox.checked = !!settings.sourceAuthToken && !!prefs.pullRequests;
  releasesCheckbox.checked = !!settings.sourceAuthToken && !!prefs.releases;
  milestonesCheckbox.checked = !!settings.sourceAuthToken && !!prefs.milestones;
  labelsCheckbox.checked = !!settings.sourceAuthToken && !!prefs.labels;
  syncTokenRequirementState(settings.sourceAuthToken);

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
          pullRequests: pullRequestsCheckbox.checked,
          releases: releasesCheckbox.checked,
          milestones: milestonesCheckbox.checked,
          labels: labelsCheckbox.checked,
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
