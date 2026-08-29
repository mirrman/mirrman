(() => {
  const BUTTON_ID = "mirrman-mirror-button";
  const GITHUB_HOST = "github.com";
  const GITEA_MIGRATE_PATH = "/repo/migrate";
  const MIRROR_ICON_PATH =
    "M15.547 3.061A.75.75 0 0 1 16 3.75v8.5a.751.751 0 0 1-1.265.545l-4.5-4.25a.75.75 0 0 1 0-1.09l4.5-4.25a.75.75 0 0 1 .812-.144ZM0 12.25v-8.5a.751.751 0 0 1 1.265-.545l4.5 4.25a.75.75 0 0 1 0 1.09l-4.5 4.25A.75.75 0 0 1 0 12.25Zm1.5-6.76v5.02L4.158 8ZM11.842 8l2.658 2.51V5.49ZM8 4a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 4Zm.75-2.25v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 1.5 0Zm0 6v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 1.5 0ZM8 10a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 10Zm0 3a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 13Z";

  let injectionScheduled = false;
  let lastGithubUrl = "";

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || String(error)));
          return;
        }
        resolve(response);
      });
    });
  }

  function repositoryInfo() {
    const parts = location.pathname.replace(/^\/+|\/+$/g, "").split("/");

    if (parts.length < 2 || !parts[0] || !parts[1]) return null;

    return {
      owner: decodeURIComponent(parts[0]),
      repo: decodeURIComponent(parts[1]).replace(/\.git$/i, ""),
    };
  }

  function closestActionItem(element) {
    return element?.closest("li") || element?.parentElement || null;
  }

  function findStarAction(forkAction) {
    const list = forkAction?.parentElement;
    if (!list) return null;

    const candidates = [...list.children];
    return (
      candidates.find((item) => {
        if (item === forkAction) return false;
        const text = item.textContent?.trim() || "";
        return (
          /(^|\s)(Star|Unstar)(\s|$)/i.test(text) ||
          !!item.querySelector(
            '[aria-label*="star a repository" i], [aria-label*="unstar" i], .octicon-star, .octicon-star-fill',
          )
        );
      }) || null
    );
  }

  function createMirrorIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.classList.add(
      "octicon",
      "mirrman-mirror-icon",
      "mr-2",
      "tmp-mr-2",
    );

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("d", MIRROR_ICON_PATH);
    svg.appendChild(path);
    return svg;
  }

  function buildMigrateUrl(baseUrl, repo, preferences = {}) {
    const url = new URL(baseUrl.replace(/\/+$/, "") + GITEA_MIGRATE_PATH);
    url.searchParams.set("service_type", "2");
    url.searchParams.set("mirrman", "1");
    url.searchParams.set("clone_addr", repo.sourceUrl);
    url.searchParams.set("repo_name", repo.name);
    if (repo.description) {
      url.searchParams.set("mirrman_description", repo.description);
    }

    if (preferences.default_owner) {
      url.searchParams.set("mirrman_owner", preferences.default_owner);
    }

    for (const name of [
      "mirror",
      "private",
      "wiki",
      "issues",
      "pull_requests",
      "releases",
      "milestones",
      "labels",
      "lfs",
    ]) {
      if (preferences[name]) url.searchParams.set(name, "1");
    }

    return url.toString();
  }

  function readGithubDescription(repo) {
    const descriptionElement = document.querySelector(
      '[class*="SidebarAbout-module__description"], #repo-content-pjax-container [itemprop="about"]',
    );
    const description = descriptionElement?.textContent
      ?.replace(/\s+/g, " ")
      .trim();
    if (description) return description;

    const metaDescription = document
      .querySelector('meta[name="description"], meta[property="og:description"]')
      ?.getAttribute("content")
      ?.replace(/\s+/g, " ")
      .trim();
    if (!metaDescription) return "";

    const repositorySuffix = ` - ${repo.owner}/${repo.repo}`;
    return metaDescription.endsWith(repositorySuffix)
      ? metaDescription.slice(0, -repositorySuffix.length).trim()
      : "";
  }

  async function handleMirrorClick(button, repo) {
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-disabled", "true");
    button.title = "正在打开 Gitea 迁移页面…";

    try {
      const response = await sendMessage({ type: "GET_MIGRATE_TARGET" });
      if (!response?.ok) {
        if (response?.code === "SETTINGS_REQUIRED") {
          const openResponse = await sendMessage({ type: "OPEN_OPTIONS_PAGE" });
          if (!openResponse?.ok) {
            throw new Error(openResponse?.error || "无法打开 Mirrman 设置页");
          }
          return;
        }
        throw new Error(response?.error || "无法读取 Mirrman 配置");
      }

      location.assign(
        buildMigrateUrl(
          response.giteaUrl,
          {
            sourceUrl: `https://github.com/${repo.owner}/${repo.repo}`,
            name: repo.repo,
            description: readGithubDescription(repo),
          },
          response.preferences,
        ),
      );
    } catch (error) {
      button.title = `打开失败：${error?.message || String(error)}`;
      window.alert(button.title);
    } finally {
      button.removeAttribute("aria-busy");
      button.removeAttribute("aria-disabled");
    }
  }

  function injectGithubButton() {
    injectionScheduled = false;

    if (location.hostname !== GITHUB_HOST) return;
    if (lastGithubUrl !== location.href) {
      document.getElementById(BUTTON_ID)?.closest("li")?.remove();
      lastGithubUrl = location.href;
    }
    const repo = repositoryInfo();
    const forkButton = document.querySelector(
      '#fork-button, a[icon="repo-forked"], a[href$="/fork"], button[aria-label^="Fork" i]',
    );
    if (!repo || !forkButton) return;

    const repoKey = `${repo.owner}/${repo.repo}`;
    const existingButton = document.getElementById(BUTTON_ID);
    if (existingButton?.dataset.repository === repoKey) return;
    existingButton?.closest("li")?.remove();

    const forkAction = closestActionItem(forkButton);
    const starAction = findStarAction(forkAction);
    if (!forkAction?.parentElement || !starAction) return;

    const actionItem = document.createElement("li");
    actionItem.className = "mirrman-mirror-action";

    const button = forkButton.cloneNode(false);
    button.id = BUTTON_ID;
    button.classList.add("mirrman-mirror-button");
    for (const attribute of [
      "icon",
      "rel",
      "data-hydro-click",
      "data-hydro-click-hmac",
      "data-ga-click",
      "form",
      "name",
      "value",
    ]) {
      button.removeAttribute(attribute);
    }
    if (button.tagName === "A") button.setAttribute("href", "#");
    if (button.tagName === "BUTTON") button.setAttribute("type", "button");
    button.setAttribute("data-view-component", "true");
    button.setAttribute("aria-label", `Mirror ${repoKey} to Gitea`);
    button.dataset.repository = repoKey;
    button.title = "在 Gitea 中镜像这个仓库";
    button.append(createMirrorIcon(), document.createTextNode("Mirror"));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      return handleMirrorClick(button, repo);
    });

    actionItem.appendChild(button);
    forkAction.parentElement.insertBefore(actionItem, starAction);
  }

  function scheduleGithubInjection() {
    if (injectionScheduled) return;
    injectionScheduled = true;
    window.setTimeout(injectGithubButton, 50);
  }

  function setInputValue(selector, value) {
    const input = document.querySelector(selector);
    if (!input || value === undefined || value === null) return false;

    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function setCheckbox(name, checked) {
    const input = document.querySelector(`input[name="${name}"]`);
    if (!input || input.disabled) return false;

    input.checked = !!checked;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function selectOwner(ownerName) {
    if (!ownerName) return true;

    const dropdown = document.querySelector(".ui.selection.owner.dropdown");
    if (!dropdown) return false;

    const owner = ownerName.toLocaleLowerCase();
    const item = [...dropdown.querySelectorAll(".menu .item")].find((option) => {
      const title = option.getAttribute("title")?.trim().toLocaleLowerCase();
      const text = option.textContent?.trim().toLocaleLowerCase();
      return title === owner || text === owner;
    });

    if (!item) return false;
    item.click();

    const hiddenInput = dropdown.querySelector('input[type="hidden"]');
    const value = item.getAttribute("data-value");
    if (hiddenInput && value && hiddenInput.value !== value) {
      hiddenInput.value = value;
      hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  function applyGiteaPrefill(prefill) {
    const formReady = setInputValue(
      "#clone_addr, input[name=\"clone_addr\"]",
      prefill.clone_addr,
    );
    setInputValue("#repo_name, input[name=\"repo_name\"]", prefill.repo_name);
    setInputValue("#auth_token, input[name=\"auth_token\"]", prefill.auth_token);
    setInputValue("#description, textarea[name=\"description\"]", prefill.description);

    for (const name of [
      "mirror",
      "private",
      "wiki",
      "issues",
      "pull_requests",
      "releases",
      "milestones",
      "labels",
      "lfs",
    ]) {
      setCheckbox(name, prefill[name]);
    }

    return formReady && selectOwner(prefill.default_owner);
  }

  async function prefillGiteaMigration() {
    const params = new URLSearchParams(location.search);
    if (params.get("mirrman") !== "1") return;
    if (!location.pathname.endsWith(GITEA_MIGRATE_PATH)) return;

    const response = await sendMessage({
      type: "GET_MIGRATE_PREFILL",
      payload: {
        sourceUrl: params.get("clone_addr") || "",
        repoName: params.get("repo_name") || "",
        originalDescription: params.get("mirrman_description") || "",
      },
    });
    if (!response?.ok || !response.prefill) return;

    if (applyGiteaPrefill(response.prefill)) return;

    const observer = new MutationObserver(() => {
      if (applyGiteaPrefill(response.prefill)) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  if (location.hostname === GITHUB_HOST) {
    scheduleGithubInjection();
    new MutationObserver(scheduleGithubInjection).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("turbo:load", scheduleGithubInjection);
    document.addEventListener("pjax:end", scheduleGithubInjection);
    window.addEventListener("popstate", scheduleGithubInjection);
  } else {
    prefillGiteaMigration().catch(() => {});
  }
})();
