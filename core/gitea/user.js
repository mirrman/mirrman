import { createGiteaClient } from "./client.js";

export async function getCurrentUser(baseUrl, token) {
  const client = createGiteaClient({ baseUrl, token });
  return client.getCurrentUser();
}

export async function listAccessibleOrgs(baseUrl, token, login) {
  const client = createGiteaClient({ baseUrl, token });
  if (login) return client.listUserOrgs(login);
  return client.listMyOrgs();
}
