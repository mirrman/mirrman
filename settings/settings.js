import { createGiteaTarget } from "../core/gitea.js";
import { getSettings, setSettings } from "../core/settings.js";
import { populateOwnerPicker } from "../shared/owner-picker.js";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("settingsForm");
  const giteaUrlInput = document.getElementById("giteaUrl");
  const giteaTokenInput = document.getElementById("giteaToken");
  const sourceAuthInput = document.getElementById("sourceAuthToken");
  const descSelect = document.getElementById("descriptionStrategy");
  const defaultOwnerSelect = document.getElementById("default_owner");
  const privateCheckbox = document.getElementById("pref_private");
  const wikiCheckbox = document.getElementById("pref_wiki");
  const issuesCheckbox = document.getElementById("pref_issues");
  const pullReqCheckbox = document.getElementById("pref_pull_requests");
  const releasesCheckbox = document.getElementById("pref_releases");
  const milestonesCheckbox = document.getElementById("pref_milestones");
  const labelsCheckbox = document.getElementById("pref_labels");
  const lfsCheckbox = document.getElementById("pref_lfs");
  const mirrorCheckbox = document.getElementById("pref_mirror");
  const status = document.getElementById("status");

  const settings = await getSettings();

  giteaUrlInput.value = settings.giteaUrl || "";
  giteaTokenInput.value = settings.giteaToken || "";
  sourceAuthInput.value = settings.sourceAuthToken || "";
  descSelect.value = settings.preferences.descriptionStrategy;
  privateCheckbox.checked = settings.preferences.private;
  wikiCheckbox.checked = settings.preferences.wiki;
  issuesCheckbox.checked = settings.preferences.issues;
  pullReqCheckbox.checked = settings.preferences.pullRequests;
  releasesCheckbox.checked = settings.preferences.releases;
  milestonesCheckbox.checked = settings.preferences.milestones;
  labelsCheckbox.checked = settings.preferences.labels;
  lfsCheckbox.checked = settings.preferences.lfs;
  mirrorCheckbox.checked = settings.preferences.mirror;
  if (defaultOwnerSelect) {
    defaultOwnerSelect.value = settings.preferences.defaultOwner;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newSettings = {
      giteaUrl: giteaUrlInput.value.trim(),
      giteaToken: giteaTokenInput.value.trim(),
      sourceAuthToken: sourceAuthInput.value.trim(),
      preferences: {
        descriptionStrategy: descSelect.value,
        private: privateCheckbox.checked,
        defaultOwner: defaultOwnerSelect ? defaultOwnerSelect.value : "",
        wiki: wikiCheckbox.checked,
        issues: issuesCheckbox.checked,
        pullRequests: pullReqCheckbox.checked,
        releases: releasesCheckbox.checked,
        milestones: milestonesCheckbox.checked,
        labels: labelsCheckbox.checked,
        lfs: lfsCheckbox.checked,
        mirror: mirrorCheckbox.checked,
      },
    };
    await setSettings(newSettings);
    status.textContent = "已保存";
    status.style.color = "green";
    setTimeout(() => {
      status.textContent = "";
      status.style.color = "";
    }, 2000);
  });

  // Test token button
  const testBtn = document.getElementById("testToken");
  const repopulateOwners = () =>
    populateOwnerPicker(defaultOwnerSelect, {
      baseUrl: giteaUrlInput.value.trim(),
      token: giteaTokenInput.value.trim(),
      defaultOwner: defaultOwnerSelect?.value || settings.preferences.defaultOwner,
    });

  await repopulateOwners();
  giteaUrlInput.addEventListener("change", repopulateOwners);
  giteaTokenInput.addEventListener("change", repopulateOwners);
  // Token visibility toggle (use emoji)
  const toggleBtn = document.getElementById("toggleToken");
  if (toggleBtn) {
    // initial icon based on current input type
    toggleBtn.textContent = giteaTokenInput.type === "password" ? "👀" : "🙈";
    toggleBtn.title =
      giteaTokenInput.type === "password" ? "显示 Token" : "隐藏 Token";
    toggleBtn.addEventListener("click", () => {
      if (giteaTokenInput.type === "password") {
        giteaTokenInput.type = "text";
        toggleBtn.textContent = "🙈";
        toggleBtn.title = "隐藏 Token";
      } else {
        giteaTokenInput.type = "password";
        toggleBtn.textContent = "👀";
        toggleBtn.title = "显示 Token";
      }
    });
  }

  testBtn.addEventListener("click", async () => {
    const url = giteaUrlInput.value.trim();
    const token = giteaTokenInput.value.trim();
    if (!url || !token) {
      status.textContent = "请先填写 Gitea 地址与 Token";
      status.style.color = "red";
      setTimeout(() => {
        status.textContent = "";
        status.style.color = "";
      }, 3000);
      return;
    }
    status.textContent = "测试中…";
    status.style.color = "";
    try {
      const user = await createGiteaTarget({ baseUrl: url, token }).verifyAccess();
      status.textContent = `有效: ${user.login || user.username || user.full_name || user.email || "已认证"}`;
      status.style.color = "green";
    } catch (e) {
      status.textContent =
        e.status === 401 || e.status === 403
          ? "Token 无效或无权限"
          : "测试失败: " + e.message;
      status.style.color = "red";
    }
    setTimeout(() => {
      status.textContent = "";
      status.style.color = "";
    }, 4000);
  });
});
