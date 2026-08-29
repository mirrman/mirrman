(function startGiteaMigrationPage(root) {
  const commands = root.MirrmanCommands;
  if (!commands) return;

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

  function applyPrefill(prefill) {
    const formReady = setInputValue(
      '#clone_addr, input[name="clone_addr"]',
      prefill.clone_addr,
    );
    setInputValue('#repo_name, input[name="repo_name"]', prefill.repo_name);
    setInputValue('#auth_token, input[name="auth_token"]', prefill.auth_token);
    setInputValue(
      '#description, textarea[name="description"]',
      prefill.description,
    );

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
    return formReady && selectOwner(prefill.repo_owner);
  }

  async function prefill() {
    const params = new URLSearchParams(location.search);
    if (params.get("mirrman") !== "1") return;
    if (!location.pathname.endsWith("/repo/migrate")) return;

    const response = await commands.send("GET_MIGRATE_PREFILL", {
      sourceUrl: params.get("clone_addr") || "",
      destination: { name: params.get("repo_name") || "" },
      originalDescription: params.get("mirrman_description") || "",
    });
    if (applyPrefill(response)) return;

    const observer = new MutationObserver(() => {
      if (applyPrefill(response)) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  prefill().catch(() => {});
})(globalThis);
