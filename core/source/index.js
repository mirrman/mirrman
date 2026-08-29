import "./runtime.js";
import "./github.js";
import "./gitlab.js";
import "./generic-git.js";

const platforms = globalThis.MirrmanSourcePlatforms;

export function resolveSourceRepository(input) {
  return platforms.resolve(input)?.repository || null;
}

export async function getSourceMetadata(
  repository,
  { token = "", fetchImpl = fetch } = {},
) {
  const adapter = platforms.getById(repository?.platform);
  if (!adapter) return { description: "" };
  return adapter.getMetadata(repository, { token, fetchImpl });
}
