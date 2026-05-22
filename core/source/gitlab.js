export async function fetchGitlabDescription(owner, repo) {
  const project = encodeURIComponent(`${owner}/${repo}`);
  const api = `https://gitlab.com/api/v4/projects/${project}`;
  const resp = await fetch(api);
  if (!resp.ok) return "";
  const json = await resp.json();
  return json.description || "";
}
