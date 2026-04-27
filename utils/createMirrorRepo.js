/**
 * 在 Gitea 上创建镜像仓库
 * @param {string} giteaUrl - Gitea 实例 URL
 * @param {string} clone_addr - 源仓库克隆地址（必填）
 * @param {string} repo_name - 仓库名称（必填）
 * @param {string} repo_owner - 仓库所有者（必填）
 * @param {string} [auth_token] - Gitea 访问令牌
 * @param {string} [description] - 仓库描述
 * @param {boolean} [private=false] - 是否私有
 * @param {boolean} [mirror=true] - 是否镜像
 * @param {string} [mirror_interval] - 镜像同步间隔
 * @param {boolean} [wiki=true] - 是否包含 Wiki
 * @param {boolean} [issues=true] - 是否包含 Issues
 * @param {boolean} [pull_requests=true] - 是否包含 Pull Requests
 * @param {boolean} [releases=true] - 是否包含 Releases
 * @param {boolean} [milestones=true] - 是否包含 Milestones
 * @param {boolean} [labels=true] - 是否包含 Labels
 * @param {boolean} [lfs=true] - 是否包含 LFS
 * @param {string} [lfs_endpoint] - LFS 端点
 * @returns {Promise<object>} - 创建结果
 */
async function createMirrorRepo(
  giteaUrl,
  clone_addr,
  repo_name,
  repo_owner,
  auth_token,
  options = {}
) {
  const {
    description = '',
    private = false,
    mirror = true,
    mirror_interval = '',
    wiki = true,
    issues = true,
    pull_requests = true,
    releases = true,
    milestones = true,
    labels = true,
    lfs = false,
    lfs_endpoint = ''
  } = options;

  // 解析 service 类型
  const service = parseService(clone_addr);

  // 构建请求体
  const body = {
    clone_addr,
    repo_name,
    repo_owner,
    service,
    description,
    private,
    mirror,
    mirror_interval: mirror_interval || undefined,
    wiki,
    issues,
    pull_requests,
    releases,
    milestones,
    labels,
    lfs,
    lfs_endpoint: lfs_endpoint || undefined
  };

  // 如果有 auth_token，设置可选字段
  if (auth_token) {
    body.auth_token = auth_token;
  } else {
    // 没有 token 时，只能设置基础字段
    delete body.issues;
    delete body.pull_requests;
    delete body.releases;
    delete body.milestones;
    delete body.labels;
  }

  // 清理 undefined 值
  Object.keys(body).forEach(key => {
    if (body[key] === undefined) {
      delete body[key];
    }
  });

  const response = await fetch(`${giteaUrl}/api/v1/repos/migrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth_token && { Authorization: `token ${auth_token}` })
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create mirror repo: ${response.status}`);
  }

  return response.json();
}

/**
 * 根据克隆地址解析服务类型
 * @param {string} clone_addr - 克隆地址
 * @returns {string} - 服务类型 (git 或 hg)
 */
function parseService(clone_addr) {
  const url = clone_addr.toLowerCase();
  if (url.includes('github.com') || url.includes('github')) {
    return 'github';
  }
  if (url.includes('gitlab.com') || url.includes('gitlab')) {
    return 'gitlab';
  }
  // 默认返回 git
  return 'git';
}

module.exports = { createMirrorRepo, parseService };
