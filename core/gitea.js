function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

async function responseError(response) {
  let message = `HTTP ${response.status}`;
  try {
    const body = await response.text();
    if (body) {
      try {
        const json = JSON.parse(body);
        message = json?.message || body;
      } catch (_) {
        message = body;
      }
    }
  } catch (_) {}
  return createError("GITEA_REQUEST_FAILED", message, {
    status: response.status,
  });
}

function migrationPayload(intent) {
  return {
    clone_addr: intent.source.url,
    repo_name: intent.destination.name,
    repo_owner: intent.destination.owner || "",
    mirror: intent.options.mirror,
    auth_token: intent.credentials.sourceToken || "",
    description: intent.description,
    private: intent.options.private,
    wiki: intent.options.wiki,
    issues: intent.options.issues,
    pull_requests: intent.options.pullRequests,
    releases: intent.options.releases,
    milestones: intent.options.milestones,
    labels: intent.options.labels,
    lfs: intent.options.lfs,
    lfs_endpoint: intent.options.lfsEndpoint || "",
  };
}

export function createGiteaTarget({ baseUrl, token = "", fetchImpl = fetch }) {
  const root = normalizeBaseUrl(baseUrl);
  const headers = token ? { Authorization: `token ${token}` } : {};

  function requireUrl() {
    if (!root) {
      throw createError(
        "SETTINGS_REQUIRED",
        "请先在设置页面配置 Gitea 地址",
      );
    }
  }

  function requireCredentials() {
    requireUrl();
    if (!token) {
      throw createError(
        "SETTINGS_REQUIRED",
        "请先在设置页面配置 Gitea Token",
      );
    }
  }

  async function request(path, options = {}) {
    requireCredentials();
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });
    } catch (cause) {
      throw createError(
        "GITEA_UNREACHABLE",
        cause?.message || "无法连接 Gitea",
        { cause },
      );
    }
    if (!response.ok) throw await responseError(response);
    return response.status === 204 ? null : response.json();
  }

  return Object.freeze({
    async verifyAccess() {
      return request("/api/v1/user");
    },

    async listRepositoryOwners() {
      const [user, organizations] = await Promise.all([
        request("/api/v1/user"),
        request("/api/v1/user/orgs"),
      ]);
      const login = user?.login || user?.username || user?.name;
      const owners = login ? [{ name: login, type: "user" }] : [];
      for (const organization of Array.isArray(organizations)
        ? organizations
        : []) {
        const name =
          organization.login || organization.username || organization.name;
        if (name) owners.push({ name, type: "organization" });
      }
      return owners;
    },

    async migrate(intent) {
      return request("/api/v1/repos/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(migrationPayload(intent)),
      });
    },

    createMigrationPageUrl(intent) {
      requireUrl();
      const url = new URL(`${root}/repo/migrate`);
      url.searchParams.set("service_type", "2");
      url.searchParams.set("mirrman", "1");
      url.searchParams.set("clone_addr", intent.source.url);
      url.searchParams.set("repo_name", intent.destination.name);
      if (intent.source.description) {
        url.searchParams.set(
          "mirrman_description",
          intent.source.description,
        );
      }
      return url.toString();
    },

    isMigrationPage(candidateUrl) {
      try {
        requireUrl();
        const candidate = new URL(candidateUrl || "");
        const configured = new URL(root);
        return (
          candidate.origin === configured.origin &&
          candidate.pathname === `${configured.pathname.replace(/\/+$/, "")}/repo/migrate`
        );
      } catch (_) {
        return false;
      }
    },

    createMigrationPrefill(intent) {
      return migrationPayload(intent);
    },
  });
}
