import {
  getSourceMetadata,
  resolveSourceRepository,
} from "./source/index.js";

function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function preference(overrides, settings, name) {
  return overrides[name] ?? settings[name];
}

function buildDescription(strategy, sourceUrl, originalDescription) {
  if (strategy === "original") return originalDescription || "";
  if (strategy === "empty") return "";
  const prefix = `[本仓库镜像自 ${sourceUrl}]`;
  return [prefix, originalDescription || ""].filter(Boolean).join(" — ");
}

export async function prepareMigrationIntent(
  input,
  settings,
  { fetchImpl = fetch } = {},
) {
  const sourceUrl = String(input?.sourceUrl || "").trim();
  if (!sourceUrl) throw createError("SOURCE_REQUIRED", "请输入源仓库URL");

  const repository = resolveSourceRepository(sourceUrl);
  if (!repository) {
    throw createError("INVALID_SOURCE", "无法解析仓库地址，请检查输入");
  }

  const defaults = settings?.preferences || {};
  const overrides = input?.preferences || {};
  const descriptionStrategy = preference(
    overrides,
    defaults,
    "descriptionStrategy",
  );
  const hasOriginalDescription = Object.prototype.hasOwnProperty.call(
    input || {},
    "originalDescription",
  );
  let originalDescription = hasOriginalDescription
    ? String(input.originalDescription || "").trim()
    : "";

  if (
    !hasOriginalDescription &&
    (descriptionStrategy === "prefix" || descriptionStrategy === "original")
  ) {
    const metadata = await getSourceMetadata(repository, {
      token: settings?.sourceAuthToken || "",
      fetchImpl,
    });
    originalDescription = metadata.description || "";
  }

  return {
    source: {
      ...repository,
      url: sourceUrl,
      description: originalDescription,
    },
    destination: {
      name: String(input?.destination?.name || repository.name).trim(),
      owner: String(
        input?.destination?.owner ?? defaults.defaultOwner ?? "",
      ).trim(),
    },
    description: buildDescription(
      descriptionStrategy,
      sourceUrl,
      originalDescription,
    ),
    credentials: {
      sourceToken: settings?.sourceAuthToken || "",
    },
    options: {
      mirror: !!preference(overrides, defaults, "mirror"),
      private: !!preference(overrides, defaults, "private"),
      wiki: !!preference(overrides, defaults, "wiki"),
      issues: !!preference(overrides, defaults, "issues"),
      pullRequests: !!preference(overrides, defaults, "pullRequests"),
      releases: !!preference(overrides, defaults, "releases"),
      milestones: !!preference(overrides, defaults, "milestones"),
      labels: !!preference(overrides, defaults, "labels"),
      lfs: !!preference(overrides, defaults, "lfs"),
      lfsEndpoint: String(overrides.lfsEndpoint || "").trim(),
    },
  };
}
