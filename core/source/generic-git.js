(function registerGenericGitSourcePlatform(root) {
  const platforms = root.MirrmanSourcePlatforms;
  if (!platforms) throw new Error("Source platform runtime is not installed");

  function parse(address) {
    if (!address || address.segments.length < 2) return null;

    const name = platforms.stripGitSuffix(address.segments.at(-1));
    const owner = address.segments.slice(0, -1).join("/");
    if (!owner || !name) return null;

    return {
      platform: "git",
      host: address.host,
      owner,
      name,
      cloneUrl: address.input,
    };
  }

  async function getMetadata() {
    return { description: "" };
  }

  platforms.register({
    id: "git",
    fallback: true,
    getMetadata,
    hosts: [],
    parse,
  });
})(globalThis);
