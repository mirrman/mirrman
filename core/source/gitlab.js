(function registerGitlabSourcePlatform(root) {
  const platforms = root.MirrmanSourcePlatforms;
  if (!platforms) throw new Error("Source platform runtime is not installed");

  const HOST = "gitlab.com";

  function parse(address) {
    if (!address) return null;

    const markerIndex = address.segments.indexOf("-");
    const repositorySegments =
      markerIndex >= 0 ? address.segments.slice(0, markerIndex) : address.segments;
    if (repositorySegments.length < 2) return null;

    const name = platforms.stripGitSuffix(repositorySegments.at(-1));
    const owner = repositorySegments.slice(0, -1).join("/");
    if (!owner || !name) return null;

    return {
      platform: "gitlab",
      host: HOST,
      owner,
      name,
      cloneUrl: `https://${HOST}/${owner
        .split("/")
        .map(encodeURIComponent)
        .join("/")}/${encodeURIComponent(name)}`,
    };
  }

  async function getMetadata(repository, { token = "", fetchImpl = fetch } = {}) {
    const project = encodeURIComponent(`${repository.owner}/${repository.name}`);
    const headers = token ? { "PRIVATE-TOKEN": token } : {};
    const response = await fetchImpl(
      `https://gitlab.com/api/v4/projects/${project}`,
      { headers },
    );
    if (!response.ok) return { description: "" };
    const json = await response.json();
    return { description: json.description || "" };
  }

  platforms.register({ id: "gitlab", getMetadata, hosts: [HOST], parse });
})(globalThis);
