(function registerGithubSourcePlatform(root) {
  const platforms = root.MirrmanSourcePlatforms;
  if (!platforms) throw new Error("Source platform runtime is not installed");

  const HOST = "github.com";
  const BUTTON_ID = "mirrman-mirror-button";
  const MIRROR_ICON_PATH =
    "M15.547 3.061A.75.75 0 0 1 16 3.75v8.5a.751.751 0 0 1-1.265.545l-4.5-4.25a.75.75 0 0 1 0-1.09l4.5-4.25a.75.75 0 0 1 .812-.144ZM0 12.25v-8.5a.751.751 0 0 1 1.265-.545l4.5 4.25a.75.75 0 0 1 0 1.09l-4.5 4.25A.75.75 0 0 1 0 12.25Zm1.5-6.76v5.02L4.158 8ZM11.842 8l2.658 2.51V5.49ZM8 4a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 4Zm.75-2.25v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 1.5 0Zm0 6v.5a.75.75 0 0 1-1.5 0v-.5a.75.75 0 0 1 1.5 0ZM8 10a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 10Zm0 3a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-1.5 0v-.5A.75.75 0 0 1 8 13Z";

  function parse(address) {
    if (!address || address.segments.length < 2) return null;

    const owner = address.segments[0];
    const name = platforms.stripGitSuffix(address.segments[1]);
    if (!owner || !name) return null;

    return {
      platform: "github",
      host: HOST,
      owner,
      name,
      cloneUrl: `https://${HOST}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    };
  }

  async function getMetadata(repository, { token = "", fetchImpl = fetch } = {}) {
    const headers = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const url = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
    const response = await fetchImpl(url, { headers });
    if (!response.ok) return { description: "" };
    const json = await response.json();
    return { description: json.description || "" };
  }

  function createMirrorIcon(document) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.classList.add("octicon", "mirrman-mirror-icon", "mr-2", "tmp-mr-2");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("d", MIRROR_ICON_PATH);
    svg.appendChild(path);
    return svg;
  }

  function closestActionItem(element) {
    return element?.closest("li") || element?.parentElement || null;
  }

  function findStarAction(forkAction) {
    const list = forkAction?.parentElement;
    if (!list) return null;
    return (
      [...list.children].find((item) => {
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

  function readDescription(document, repository) {
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

    const suffix = ` - ${repository.owner}/${repository.name}`;
    return metaDescription.endsWith(suffix)
      ? metaDescription.slice(0, -suffix.length).trim()
      : "";
  }

  function mountPageAction({
    document,
    location,
    MutationObserver,
    sendCommand,
    window,
  }) {
    let injectionScheduled = false;
    let lastUrl = "";

    async function handleClick(button, repository) {
      button.setAttribute("aria-busy", "true");
      button.setAttribute("aria-disabled", "true");
      button.title = "正在打开 Gitea 迁移页面…";

      try {
        const prepared = await sendCommand("PREPARE_MIGRATE_PAGE", {
          sourceUrl: repository.cloneUrl,
          destination: { name: repository.name },
          originalDescription: readDescription(document, repository),
        });
        location.assign(prepared.url);
      } catch (error) {
        if (error?.code === "SETTINGS_REQUIRED") {
          await sendCommand("OPEN_OPTIONS_PAGE");
          return;
        }
        button.title = `打开失败：${error?.message || String(error)}`;
        window.alert(button.title);
      } finally {
        button.removeAttribute("aria-busy");
        button.removeAttribute("aria-disabled");
      }
    }

    function inject() {
      injectionScheduled = false;
      const resolved = platforms.resolve(location.href);
      const repository =
        resolved?.adapter.id === "github" ? resolved.repository : null;
      if (!repository) return;

      if (lastUrl !== location.href) {
        document.getElementById(BUTTON_ID)?.closest("li")?.remove();
        lastUrl = location.href;
      }

      const forkButton = document.querySelector(
        '#fork-button, a[icon="repo-forked"], a[href$="/fork"], button[aria-label^="Fork" i]',
      );
      if (!forkButton) return;

      const repositoryKey = `${repository.owner}/${repository.name}`;
      const existingButton = document.getElementById(BUTTON_ID);
      if (existingButton?.dataset.repository === repositoryKey) return;
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
      button.setAttribute("aria-label", `Mirror ${repositoryKey} to Gitea`);
      button.dataset.repository = repositoryKey;
      button.title = "在 Gitea 中镜像这个仓库";
      button.append(createMirrorIcon(document), document.createTextNode("Mirror"));
      button.addEventListener("click", (event) => {
        event.preventDefault();
        return handleClick(button, repository);
      });
      actionItem.appendChild(button);
      forkAction.parentElement.insertBefore(actionItem, starAction);
    }

    function scheduleInjection() {
      if (injectionScheduled) return;
      injectionScheduled = true;
      window.setTimeout(inject, 50);
    }

    scheduleInjection();
    new MutationObserver(scheduleInjection).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("turbo:load", scheduleInjection);
    document.addEventListener("pjax:end", scheduleInjection);
    window.addEventListener("popstate", scheduleInjection);
  }

  platforms.register({
    id: "github",
    getMetadata,
    hosts: [HOST],
    pageAction: Object.freeze({ mount: mountPageAction }),
    parse,
  });
})(globalThis);
