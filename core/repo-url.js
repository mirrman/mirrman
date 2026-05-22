export function parseRepoUrl(url) {
  const input = (url || "").trim();
  if (!input) return null;

  const ssh = input.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/i);
  if (ssh) {
    return {
      service: detectService(ssh[1]),
      host: ssh[1],
      owner: ssh[2],
      repo: stripGitSuffix(ssh[3]),
    };
  }

  try {
    const parsed = new URL(input);
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length < 2) return null;

    return {
      service: detectService(parsed.hostname),
      host: parsed.hostname,
      owner: decodeURIComponent(parts[0]),
      repo: stripGitSuffix(decodeURIComponent(parts[1])),
    };
  } catch (_) {
    const fallback = input.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!fallback) return null;

    return {
      service: detectService(input),
      host: "",
      owner: fallback[1],
      repo: fallback[2],
    };
  }
}

function stripGitSuffix(value) {
  return (value || "").replace(/\.git$/i, "");
}

function detectService(host) {
  const value = (host || "").toLowerCase();
  if (value.includes("github")) return "github";
  if (value.includes("gitlab")) return "gitlab";
  if (value.includes("gitea")) return "gitea";
  return "git";
}
