import { createGiteaClient } from "../core/gitea/client.js";

export async function populateOwnerPicker(
  selectEl,
  { baseUrl, token, defaultOwner = "" } = {},
) {
  if (!selectEl) return;

  selectEl.innerHTML = '<option value="">（使用 Token 所属用户）</option>';
  if (!baseUrl || !token) return;

  try {
    const client = createGiteaClient({ baseUrl, token });
    const user = await client.getCurrentUser();
    const login = user.login || user.username || user.name;

    if (login) {
      const selfOpt = document.createElement("option");
      selfOpt.value = login;
      selfOpt.textContent = `个人：${login}`;
      selectEl.appendChild(selfOpt);

      const orgs = await client.listUserOrgs(login);
      if (Array.isArray(orgs)) {
        for (const org of orgs) {
          const oname = org.login || org.username || org.name;
          if (!oname) continue;
          const opt = document.createElement("option");
          opt.value = oname;
          opt.textContent = `组织：${oname}`;
          selectEl.appendChild(opt);
        }
      }
    }
  } catch (_) {
    // ignore populate errors
  }

  if (defaultOwner) selectEl.value = defaultOwner;
}
