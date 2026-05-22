export async function fetchGithubDescription(owner, repo) {
  const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const resp = await fetch(api);
  if (!resp.ok) return "";
  const json = await resp.json();
  return json.description || "";
}
