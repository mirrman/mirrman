import { buildDescription } from "./description.js";
import { parseRepoUrl } from "./repo-url.js";
import { getSourceDescription } from "./source/index.js";
import { migrateRepo } from "./gitea/repos.js";

export async function runMirror(input, settings) {
  const sourceUrl = (input?.sourceUrl || "").trim();
  if (!sourceUrl) {
    throw new Error("请输入源仓库URL");
  }

  const parsed = parseRepoUrl(sourceUrl);
  if (!parsed || !parsed.repo) {
    throw new Error("无法解析仓库地址，请检查输入");
  }

  const giteaUrl = settings?.giteaUrl || "";
  const giteaToken = settings?.giteaToken || "";
  if (!giteaUrl || !giteaToken) {
    throw new Error("请先在设置页面配置 Gitea 地址与 Token");
  }

  const prefs = settings?.preferences || {};
  const strategy =
    input?.descriptionStrategy || prefs.descriptionStrategy || "prefix";
  const originalDescription =
    strategy === "original" || strategy === "prefix"
      ? await getSourceDescription(parsed.service, parsed.owner, parsed.repo)
      : "";

  const payload = {
    clone_addr: sourceUrl,
    repo_name: input?.repoName || parsed.repo,
    repo_owner: input?.repoOwner || prefs.default_owner || undefined,
    auth_token: settings?.sourceAuthToken || "",
    description: buildDescription(strategy, sourceUrl, originalDescription),
    private: !!input?.private,
    wiki: input?.wiki ?? true,
    issues: input?.issues ?? true,
    pull_requests: input?.pull_requests ?? true,
    releases: input?.releases ?? true,
    milestones: input?.milestones ?? true,
    labels: input?.labels ?? true,
    lfs: !!input?.lfs,
    lfs_endpoint: input?.lfs_endpoint || "",
  };

  Object.keys(payload).forEach((key) => {
    if (
      payload[key] === undefined ||
      payload[key] === null ||
      payload[key] === ""
    ) {
      if (
        key === "repo_owner" ||
        key === "auth_token" ||
        key === "lfs_endpoint"
      )
        return;
      if (key === "description" && strategy !== "empty") return;
      delete payload[key];
    }
  });

  return migrateRepo(giteaUrl, giteaToken, payload);
}
