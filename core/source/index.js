import { fetchGithubDescription } from "./github.js";
import { fetchGitlabDescription } from "./gitlab.js";

export async function getSourceDescription(service, owner, repo) {
  if (service === "github") return fetchGithubDescription(owner, repo);
  if (service === "gitlab") return fetchGitlabDescription(owner, repo);
  return "";
}
