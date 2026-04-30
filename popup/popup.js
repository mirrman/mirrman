import { createMirrorRepo } from '../utils/createMirrorRepo.js';
import { getSettings } from '../utils/storage.js';

function parseOwnerRepoFromUrl(url) {
  // 支持 https://host/owner/repo(.git) 和 git@host:owner/repo.git
  const m = url.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (m) return { owner: m[1], repo: m[2] };
  return { owner: '', repo: '' };
}

async function getOriginalDescription(url) {
  try {
    if (url.includes('github.com')) {
      const m = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (!m) return '';
      const api = `https://api.github.com/repos/${m[1]}/${m[2]}`;
      const r = await fetch(api);
      if (!r.ok) return '';
      const j = await r.json();
      return j.description || '';
    }
    if (url.includes('gitlab.com')) {
      const m = url.match(/gitlab\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
      if (!m) return '';
      const project = encodeURIComponent(m[1]);
      const api = `https://gitlab.com/api/v4/projects/${project}`;
      const r = await fetch(api);
      if (!r.ok) return '';
      const j = await r.json();
      return j.description || '';
    }
    return '';
  } catch (e) {
    return '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('url');
  const confirmBtn = document.getElementById('confirm');
  const openSettingsBtn = document.getElementById('openSettings');
  const descSelect = document.getElementById('descStrategy');
  const privateCheckbox = document.getElementById('private');
  const issuesCheckbox = document.getElementById('issues');
  const wikiCheckbox = document.getElementById('wiki');
  const lfsCheckbox = document.getElementById('lfs');
  const lfsEndpointInput = document.getElementById('lfs_endpoint');

  const settings = await getSettings();
  const prefs = settings.preferences || {};
  descSelect.value = prefs.descriptionStrategy || 'prefix';
  privateCheckbox.checked = !!prefs.private;
  issuesCheckbox.checked = prefs.issues !== false;
  wikiCheckbox.checked = prefs.wiki !== false;
  lfsCheckbox.checked = prefs.lfs || false;

  confirmBtn.addEventListener('click', async () => {
    const cloneUrl = urlInput.value.trim();
    if (!cloneUrl) return alert('请输入源仓库URL');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '处理中…';
    try {
      const parsed = parseOwnerRepoFromUrl(cloneUrl);
      if (!parsed.repo) throw new Error('无法解析仓库地址，请检查输入');

      let originalDesc = '';
      if (descSelect.value === 'original' || descSelect.value === 'prefix') {
        originalDesc = await getOriginalDescription(cloneUrl);
      }

      let description = '';
      if (descSelect.value === 'prefix') {
        const prefix = `[本仓库镜像自 ${cloneUrl}]`;
        description = [prefix, originalDesc].filter(Boolean).join(' — ');
      } else if (descSelect.value === 'original') {
        description = originalDesc;
      }

      const giteaUrl = settings.giteaUrl;
      const giteaToken = settings.giteaToken;
      if (!giteaUrl || !giteaToken) throw new Error('请先在设置页面配置 Gitea 地址与 Token');

      const options = {
        auth_token: settings.sourceAuthToken || '',
        description,
        private: privateCheckbox.checked,
        wiki: wikiCheckbox.checked,
        issues: issuesCheckbox.checked,
        pull_requests: settings.preferences?.pull_requests ?? true,
        releases: settings.preferences?.releases ?? true,
        milestones: settings.preferences?.milestones ?? true,
        labels: settings.preferences?.labels ?? true,
        lfs: lfsCheckbox.checked,
        lfs_endpoint: lfsEndpointInput.value || ''
      };

      const res = await createMirrorRepo(giteaUrl, cloneUrl, parsed.repo || '', giteaToken, options);
      alert('创建成功: ' + (res.full_name || res.name || JSON.stringify(res)));
    } catch (e) {
      alert('错误: ' + e.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '开始镜像';
    }
  });

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // fallback: open the html directly in a new tab
        window.open('../settings/settings.html', '_blank');
      }
    });
  }
});
