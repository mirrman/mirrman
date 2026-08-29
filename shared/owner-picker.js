import { createGiteaTarget } from "../core/gitea.js";

export async function populateOwnerPicker(
  selectEl,
  { baseUrl, token, defaultOwner = "" } = {},
) {
  if (!selectEl) return;

  selectEl.innerHTML = '<option value="">（使用 Token 所属用户）</option>';
  if (!baseUrl || !token) return;

  try {
    const target = createGiteaTarget({ baseUrl, token });
    const owners = await target.listRepositoryOwners();
    for (const owner of owners) {
      const option = document.createElement("option");
      option.value = owner.name;
      option.textContent =
        owner.type === "organization"
          ? `组织：${owner.name}`
          : `个人：${owner.name}`;
      selectEl.appendChild(option);
    }
  } catch (_) {
    // ignore populate errors
  }

  if (defaultOwner) selectEl.value = defaultOwner;
}
