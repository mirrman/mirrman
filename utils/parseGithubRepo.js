function getRepoName(url) {
  const match = url.match(/github\.com[:/][^/]+\/([^/.]+)/);
  return match ? match[1] : null;
}

function getRepoDescription(url) {
  // make the repo url into owner/repo
  const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/);

  const apiUrl = "https://api.github.com/repos/" + match;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`请求失败，状态码：${response.status}`);
      }

      return response.json();
    })
    .then((data) => {
      // 提取 description 字段
      if (data.description === undefined) {
        throw new Error("返回的 JSON 中没有 description 字段");
      }
      return data.description;
    });
}

function parseGithubRepo(url) {
  var parsedRepo = new Object();
  parsedRepo.repoName = getRepoName(url);
  parsedRepo.repoDescription = getRepoDescription(url);
}
