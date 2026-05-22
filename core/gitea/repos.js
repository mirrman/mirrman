import { createGiteaClient } from "./client.js";

export async function migrateRepo(baseUrl, token, payload) {
  const client = createGiteaClient({ baseUrl, token });
  return client.migrateRepo(payload);
}
