export async function createMirrorRepo(
  giteaUrl,
  clone_addr,
  repo_name,
  repo_owner,
  token,
  options = {},
) {
  const {
    auth_token = "",
    description = "",
    private: isPrivate = false,
    wiki = true,
    issues = false,
    pull_requests = false,
    releases = false,
    milestones = false,
    labels = false,
    lfs = false,
    lfs_endpoint = "",
  } = options;

  const service = parseService(clone_addr);

  const body = {
    clone_addr,
    repo_name,
    repo_owner: repo_owner || undefined,
    service,
    description,
    private: isPrivate,
    mirror: true,
    wiki,
    issues,
    pull_requests,
    releases,
    milestones,
    labels,
    lfs,
    lfs_endpoint: lfs_endpoint || undefined,
  };

  if (auth_token) {
    body.auth_token = auth_token;
  }

  // 清理 undefined
  Object.keys(body).forEach((key) => {
    if (body[key] === undefined) delete body[key];
  });

  const endpoint =
    (giteaUrl || "").replace(/\/+$/, "") + "/api/v1/repos/migrate";

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `token ${token}`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let errText = `HTTP ${resp.status}`;
    try {
      const j = await resp.json();
      if (j && j.message) errText = j.message;
      else errText = JSON.stringify(j);
    } catch (e) {
      try {
        errText = await resp.text();
      } catch (_) {}
    }
    throw new Error(errText || `Failed to create mirror repo: ${resp.status}`);
  }

  return resp.json();
}

export function parseService(clone_addr) {
  const url = (clone_addr || "").toLowerCase();
  if (url.includes("github.com") || url.includes("github")) return "github";
  if (url.includes("gitlab.com") || url.includes("gitlab")) return "gitlab";
  if (url.includes("gitea")) return "gitea";
  return "git";
}
