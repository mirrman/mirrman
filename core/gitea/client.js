function normalizeBaseUrl(baseUrl) {
  return (baseUrl || "").replace(/\/+$/, "");
}

async function requestJson(url, options = {}) {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const json = await resp.json();
      if (json && json.message) message = json.message;
      else message = JSON.stringify(json);
    } catch (_) {
      try {
        message = await resp.text();
      } catch (_) {}
    }
    throw new Error(message || `Request failed: ${resp.status}`);
  }
  return resp.json();
}

export function createGiteaClient({ baseUrl, token }) {
  const root = normalizeBaseUrl(baseUrl);
  const headers = token ? { Authorization: `token ${token}` } : {};

  return {
    async getCurrentUser() {
      return requestJson(`${root}/api/v1/user`, { headers });
    },

    async listMyOrgs() {
      return requestJson(`${root}/api/v1/user/orgs`, { headers });
    },

    async listUserOrgs(login) {
      return requestJson(
        `${root}/api/v1/users/${encodeURIComponent(login)}/orgs`,
        {
          headers,
        },
      );
    },

    async migrateRepo(payload) {
      return requestJson(`${root}/api/v1/repos/migrate`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
  };
}
