import { getSettings, setSettings, DEFAULT_SETTINGS } from "../core/storage.js";
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
  const status = document.getElementById("status");

  const settings = await getSettings();

  giteaUrlInput.value = settings.giteaUrl || "";
  giteaTokenInput.value = settings.giteaToken || "";
  sourceAuthInput.value = settings.sourceAuthToken || "";
  descSelect.value =
    settings.preferences?.descriptionStrategy ||
    DEFAULT_SETTINGS.preferences.descriptionStrategy;
  privateCheckbox.checked =
    settings.preferences?.private || DEFAULT_SETTINGS.preferences.private;
  wikiCheckbox.checked =
    settings.preferences?.wiki ?? DEFAULT_SETTINGS.preferences.wiki;
  issuesCheckbox.checked =
    settings.preferences?.issues ?? DEFAULT_SETTINGS.preferences.issues;
  pullReqCheckbox.checked =
    settings.preferences?.pull_requests ??
    DEFAULT_SETTINGS.preferences.pull_requests;
  releasesCheckbox.checked =
    settings.preferences?.releases ?? DEFAULT_SETTINGS.preferences.releases;
  milestonesCheckbox.checked =
    settings.preferences?.milestones ?? DEFAULT_SETTINGS.preferences.milestones;
  labelsCheckbox.checked =
    settings.preferences?.labels ?? DEFAULT_SETTINGS.preferences.labels;
  lfsCheckbox.checked =
    settings.preferences?.lfs || DEFAULT_SETTINGS.preferences.lfs;
  // set default_owner if present
  if (defaultOwnerSelect)
    defaultOwnerSelect.value = settings.preferences?.default_owner || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newSettings = {
      giteaUrl: giteaUrlInput.value.trim(),
      giteaToken: giteaTokenInput.value.trim(),
      sourceAuthToken: sourceAuthInput.value.trim(),
      preferences: {
        descriptionStrategy: descSelect.value,
        private: privateCheckbox.checked,
        default_owner: defaultOwnerSelect ? defaultOwnerSelect.value : "",
        wiki: wikiCheckbox.checked,
        issues: issuesCheckbox.checked,
        pull_requests: pullReqCheckbox.checked,
        releases: releasesCheckbox.checked,
        milestones: milestonesCheckbox.checked,
        labels: labelsCheckbox.checked,
        lfs: lfsCheckbox.checked,
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
      defaultOwner: settings.preferences?.default_owner || "",
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
      const ep = url.replace(/\/+$/, "") + "/api/v1/user";
      const r = await fetch(ep, {
        headers: { Authorization: `token ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        status.textContent = `有效: ${j.login || j.username || j.full_name || j.email || "已认证"}`;
        status.style.color = "green";
      } else if (r.status === 401 || r.status === 403) {
        status.textContent = "Token 无效或无权限";
        status.style.color = "red";
      } else {
        status.textContent = `请求失败: ${r.status}`;
        status.style.color = "red";
      }
    } catch (e) {
      status.textContent = "测试失败: " + e.message;
      status.style.color = "red";
    }
    setTimeout(() => {
      status.textContent = "";
      status.style.color = "";
    }, 4000);
  });
});
