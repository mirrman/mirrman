import "../shared/web-extension.js";

const STORAGE_KEY = "mirrman_settings";
const webExtension = globalThis.MirrmanWebExtension;

const DEFAULT_SETTINGS = Object.freeze({
  giteaUrl: "",
  giteaToken: "",
  sourceAuthToken: "",
  preferences: Object.freeze({
    descriptionStrategy: "prefix",
    private: false,
    defaultOwner: "",
    wiki: true,
    issues: true,
    pullRequests: true,
    releases: true,
    milestones: true,
    labels: true,
    lfs: false,
    mirror: true,
  }),
});

function booleanOr(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSettings(input) {
  const source = input && typeof input === "object" ? input : {};
  const preferences =
    source.preferences && typeof source.preferences === "object"
      ? source.preferences
      : {};
  const descriptionStrategy = ["prefix", "original", "empty"].includes(
    preferences.descriptionStrategy,
  )
    ? preferences.descriptionStrategy
    : DEFAULT_SETTINGS.preferences.descriptionStrategy;

  return {
    giteaUrl: String(source.giteaUrl || "").trim().replace(/\/+$/, ""),
    giteaToken: String(source.giteaToken || "").trim(),
    sourceAuthToken: String(source.sourceAuthToken || "").trim(),
    preferences: {
      descriptionStrategy,
      private: booleanOr(
        preferences.private,
        DEFAULT_SETTINGS.preferences.private,
      ),
      defaultOwner: String(
        preferences.defaultOwner ?? preferences.default_owner ?? "",
      ).trim(),
      wiki: booleanOr(preferences.wiki, DEFAULT_SETTINGS.preferences.wiki),
      issues: booleanOr(
        preferences.issues,
        DEFAULT_SETTINGS.preferences.issues,
      ),
      pullRequests: booleanOr(
        preferences.pullRequests ?? preferences.pull_requests,
        DEFAULT_SETTINGS.preferences.pullRequests,
      ),
      releases: booleanOr(
        preferences.releases,
        DEFAULT_SETTINGS.preferences.releases,
      ),
      milestones: booleanOr(
        preferences.milestones,
        DEFAULT_SETTINGS.preferences.milestones,
      ),
      labels: booleanOr(
        preferences.labels,
        DEFAULT_SETTINGS.preferences.labels,
      ),
      lfs: booleanOr(preferences.lfs, DEFAULT_SETTINGS.preferences.lfs),
      mirror: booleanOr(
        preferences.mirror,
        DEFAULT_SETTINGS.preferences.mirror,
      ),
    },
  };
}

export async function getSettings() {
  if (!webExtension.isAvailable()) return normalizeSettings();
  const result = await webExtension.getStorage([STORAGE_KEY]);
  return normalizeSettings(result?.[STORAGE_KEY]);
}

export async function setSettings(input) {
  const settings = normalizeSettings(input);
  if (!webExtension.isAvailable()) return settings;
  await webExtension.setStorage({ [STORAGE_KEY]: settings });
  return settings;
}
