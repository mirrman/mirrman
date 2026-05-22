const DEFAULT_SETTINGS = {
  giteaUrl: "",
  giteaToken: "",
  sourceAuthToken: "",
  preferences: {
    descriptionStrategy: "prefix",
    private: false,
    default_owner: "",
    wiki: true,
    issues: true,
    pull_requests: true,
    releases: true,
    milestones: true,
    labels: true,
    lfs: false,
    mirror: true,
  },
};

export function getSettings() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage) {
      resolve(DEFAULT_SETTINGS);
      return;
    }

    chrome.storage.local.get(["mirrman_settings"], (res) => {
      resolve(res.mirrman_settings || DEFAULT_SETTINGS);
    });
  });
}

export function setSettings(settings) {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage) {
      resolve();
      return;
    }

    chrome.storage.local.set({ mirrman_settings: settings }, () => resolve());
  });
}

export { DEFAULT_SETTINGS };
