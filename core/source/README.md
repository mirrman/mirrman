# Source Platform adapter 开发指南

Mirrman 的数据流方向固定为：

```text
GitHub / GitLab / 新的公开平台
             │
             ▼
      Source Platform adapter
             │
             ▼
       私有 Gitea 实例
```

只有来源平台使用 adapter。Gitea 是固定迁移目标，由 `core/gitea.js` 负责，不属于 Source Platform adapter registry。

一个来源平台只注册一个 adapter；仓库地址解析、元数据读取和可选页面按钮都放在这个 adapter 内。这样新增平台时只有一个明确的 seam，相关改动也保持 locality。

## Adapter interface

每个 adapter 向全局 registry `MirrmanSourcePlatforms` 注册一个对象：

```js
{
  id,
  hosts,
  parse(address),
  getMetadata(repository, { token, fetchImpl }),
  pageAction?: { mount(environment) },
}
```

| 成员 | 必需 | 约定 |
| --- | --- | --- |
| `id` | 是 | 稳定、唯一的小写平台标识，例如 `github`。它会写入规范化仓库对象的 `platform` 字段。 |
| `hosts` | 是 | adapter 拥有的公共 hostname 数组，例如 `["github.com"]`。Registry 会统一转为小写、建立 Map，并拒绝重复归属。 |
| `parse(address)` | 是 | Registry 已按 hostname 选中 adapter 后，用规范化 `address` 解析仓库路径。路径不是有效仓库时返回 `null`。 |
| `getMetadata(repository, context)` | 是 | 返回 `{ description }`。使用 `context.fetchImpl` 发请求；凭据从 `context.token` 传入，不从存储或页面读取。 |
| `pageAction` | 否 | 页面能力对象。目前只有 `mount(environment)`。平台不需要按钮时，完全省略这个成员。 |

`parse` 成功时必须返回统一形状：

```js
{
  platform: "examplehub",
  host: "examplehub.com",
  owner: "octo-org",
  name: "demo",
  cloneUrl: "https://examplehub.com/octo-org/demo",
}
```

`owner` 可以包含平台支持的多级 namespace，例如 `group/subgroup`。是否支持多级 namespace、仓库名位于 URL 的哪一段，都由该平台自己的 implementation 决定。

这个 interface 同时是 adapter 的测试面。平台特有的 URL、认证格式、DOM selector 和 SPA 导航事件都应留在 adapter 内，不要泄漏到迁移编排或 Gitea module。

## 1. 新建 adapter 文件

在 `core/source/` 下创建以平台 `id` 命名的文件，例如：

```text
core/source/examplehub.js
```

Adapter 文件必须同时满足两种加载方式：

- `core/source/index.js` 将它作为 ESM side effect 导入，供 background 使用。
- `manifest.json` 可以将同一个文件作为普通 content script 加载，供页面按钮使用。

因此 adapter 文件内不要使用 `import`、`export` 或 top-level `await`。使用 IIFE 从 `globalThis` 获取 registry。

以下是一个不带页面按钮的完整模板：

```js
(function registerExampleHubSourcePlatform(root) {
  const platforms = root.MirrmanSourcePlatforms;
  if (!platforms) {
    throw new Error("Source platform runtime must be loaded first");
  }

  const PLATFORM_ID = "examplehub";
  const PUBLIC_HOST = "examplehub.com";

  function parse(address) {
    if (!address || address.segments.length < 2) {
      return null;
    }

    // 这里按目标平台的 URL 规则取值。这个示例使用 /owner/repository。
    const owner = address.segments[0];
    const name = platforms.stripGitSuffix(address.segments[1]);
    if (!owner || !name) {
      return null;
    }

    return {
      platform: PLATFORM_ID,
      host: PUBLIC_HOST,
      owner,
      name,
      cloneUrl: `https://${PUBLIC_HOST}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    };
  }

  async function getMetadata(repository, { token = "", fetchImpl = fetch } = {}) {
    const headers = { Accept: "application/json" };
    if (token) {
      // 按平台文档替换认证格式。
      headers.Authorization = `Bearer ${token}`;
    }

    // 按平台文档替换元数据 endpoint 和响应字段。
    const response = await fetchImpl(
      `https://${PUBLIC_HOST}/v1/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`,
      { headers },
    );

    if (!response.ok) {
      return { description: "" };
    }

    const data = await response.json();
    return { description: data.description || "" };
  }

  platforms.register({
    id: PLATFORM_ID,
    getMetadata,
    hosts: [PUBLIC_HOST],
    parse,
  });
})(globalThis);
```

实现时注意：

- `hosts` 只填写精确 hostname，不包含协议、端口或路径。不要使用通配符、后缀或模糊匹配；`not-examplehub.com` 会被直接交给 fallback。
- Registry 只调用 hostname 对应的一个 adapter，并把网页 URL、HTTPS clone URL、SSH clone URL 或简写统一转换成 `address`。Adapter 不要再次调用 `parseAddress`。
- `parse` 负责平台特有的路径规则和 `.git` 后缀；后缀处理复用 `stripGitSuffix`。
- `parse` 可能收到仓库内页 URL。如果平台仓库页是 `/owner/repo/issues/1`，仍应解析为 `/owner/repo`，不要把后续页面路径当成仓库名。
- 平台支持多级 namespace 时，应先明确路径规则，再实现 `owner` 的拼接；不要假设所有平台都和 GitHub 一样只有两段。
- 公共部署的 hostname 和元数据 endpoint 可以硬编码在 adapter 中。不要把来源平台 hostname 增加到用户设置。
- `getMetadata` 只返回 interface 规定的 `{ description }`。网络失败或非成功响应目前降级为空描述，除非调用方 interface 将来明确增加另一种错误语义。
- 始终使用注入的 `fetchImpl`，这样 interface 能直接作为测试面，不需要真实网络。

## 2. 注册 adapter

在 `core/source/index.js` 中导入新文件：

```js
import "./runtime.js";
import "./github.js";
import "./gitlab.js";
import "./examplehub.js";
import "./generic-git.js";
```

Registry 使用 hostname Map 直接选择 adapter，注册顺序不参与平台匹配：

1. `runtime.js` 仍必须先于所有 adapter 加载，因为 adapter 需要向 runtime 注册。
2. 每个具体 adapter 至少声明一个 `hosts` hostname。
3. 同一个 hostname 不能属于两个 adapter；重复注册会立即抛错。
4. `id` 不能重复。
5. `generic-git.js` 使用 `hosts: []` 和 `fallback: true`，且整个 registry 只允许一个 fallback。

`generic-git.js` 仍建议在 `index.js` 最后导入，方便阅读，但正确性不再依赖这个顺序。

只需要 background 解析和读取元数据的平台，到这里已完成运行时接入，不需要修改 `manifest.json`。

## 3. 测试 adapter contract

在 `tests/source-platforms.test.mjs` 增加真实行为测试。至少覆盖：

1. 仓库网页 URL 能解析为统一对象。
2. HTTPS clone URL 和 `.git` 后缀能正确归一化。
3. 平台支持 SSH 时，SSH clone URL 能正确解析。
4. 相似但不相同的 hostname 不命中当前 adapter，直接交给 generic Git fallback。
5. 仓库内页 URL 不会污染 `owner` 或 `name`。
6. 多级 namespace（若支持）保持完整。
7. `getMetadata` 使用注入的 `fetchImpl`，构造正确 endpoint 和认证 header，并返回 `{ description }`。
8. `hosts` 正确注册，hostname Map 能直接选中新 adapter。
9. Registry 的 hostname 冲突和唯一 fallback 约束由 `tests/source-runtime.test.mjs` 覆盖。

可参考现有 GitHub / GitLab 用例。完成后运行：

```powershell
node --test tests/source-runtime.test.mjs
node --test tests/source-platforms.test.mjs
node --test
```

## 4. 在新平台实现页面按钮

页面按钮是 adapter 的一个可选能力，不是独立 adapter。平台支持按钮时，在同一个文件中实现 `pageAction.mount`；不支持时省略 `pageAction`，也不要为它添加 content script。

统一调用链如下：

```text
manifest content script
  -> core/source/runtime.js
  -> 当前平台 adapter
  -> shared/web-extension.js
  -> shared/extension-commands.js
  -> content/source-page.js
  -> adapter.pageAction.mount(environment)
  -> PREPARE_MIGRATE_PAGE
  -> background 返回经过校验的 Gitea URL
  -> 页面跳转
```

`content/source-page.js` 已经负责解析当前 URL 并调用能力对象。新平台不需要再写一个通用入口，只需实现 adapter 内的 `mount`。

### 4.1 实现 `pageAction.mount`

把下面的结构加入 adapter 文件，并按平台 DOM 替换 `readDescription` 和 `findActionContainer` 的 selector：

```js
const BUTTON_ID = "mirrman-examplehub-mirror-button";

function readDescription(document) {
  return (
    document.querySelector("[data-repository-description]")?.textContent?.trim() || ""
  );
}

function findActionContainer(document) {
  // 尽量选择语义稳定的 data attribute 或平台公开约定的容器。
  return document.querySelector("[data-repository-actions]");
}

function mountPageAction({
  document,
  location,
  MutationObserver,
  sendCommand,
  window,
}) {
  let injectionScheduled = false;

  async function handleClick(button, repository) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    try {
      const prepared = await sendCommand("PREPARE_MIGRATE_PAGE", {
        sourceUrl: repository.cloneUrl,
        destination: { name: repository.name },
        originalDescription: readDescription(document),
      });

      location.assign(prepared.url);
    } catch (error) {
      if (error?.code === "SETTINGS_REQUIRED") {
        await sendCommand("OPEN_OPTIONS_PAGE");
        return;
      }

      window.alert(error?.message || "Unable to prepare the migration page");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }

  function inject() {
    const resolved = platforms.resolve(location.href);
    const repository =
      resolved?.adapter.id === PLATFORM_ID ? resolved.repository : null;
    const existing = document.getElementById(BUTTON_ID);

    if (!repository) {
      existing?.remove();
      return;
    }

    const repositoryKey = `${repository.owner}/${repository.name}`;
    if (existing?.dataset.repository === repositoryKey) {
      return;
    }
    existing?.remove();

    const container = findActionContainer(document);
    if (!container) {
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.dataset.repository = repositoryKey;
    button.className = "mirrman-mirror-button";
    button.textContent = "Mirror to Gitea";
    button.addEventListener("click", () => handleClick(button, repository));

    container.append(button);
  }

  function scheduleInjection() {
    if (injectionScheduled) {
      return;
    }

    injectionScheduled = true;
    window.setTimeout(() => {
      injectionScheduled = false;
      inject();
    }, 50);
  }

  scheduleInjection();

  const observer = new MutationObserver(scheduleInjection);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", scheduleInjection);

  // 如果平台会发出稳定的 SPA 导航事件，在这里额外监听。
  // GitHub implementation 可作为 Turbo / PJAX 页面切换的参考。
}
```

然后把文件末尾的注册对象改为：

```js
platforms.register({
  id: PLATFORM_ID,
  getMetadata,
  hosts: [PUBLIC_HOST],
  pageAction: Object.freeze({
    mount: mountPageAction,
  }),
  parse,
});
```

不要把 `mountButton`、`readDescription`、`findActionContainer` 等可选 DOM 方法逐个加入必需 interface。`pageAction` 作为一个能力对象形成清晰 seam；DOM 变化只影响当前平台的 implementation。

### 4.2 让按钮适配平台页面

模板只是生命周期骨架。一个可靠的 implementation 还应处理：

- **原生外观：** 优先复用平台已有按钮的标签结构和稳定 class，再追加 `mirrman-mirror-button`；不要复制会随会话变化的 `id`。
- **幂等注入：** 以固定 `BUTTON_ID` 和 `data-repository` 判断当前仓库，任何时刻只保留一个按钮。
- **SPA 导航：** 用 `MutationObserver`、`popstate` 以及平台公开且稳定的导航事件重新调度注入。不要假设首次加载后 URL 不再改变。
- **容器迟到：** 页面首次扫描找不到操作区时直接返回；observer 会在 DOM 更新后重试。
- **仓库切换：** 当前 URL 不再属于 adapter，或切到另一个仓库时，移除旧按钮并按新仓库重新创建。
- **描述读取：** 只读取当前仓库公开描述的纯文本。找不到时传空字符串。
- **可访问性：** 使用真实 `button`、设置 `type="button"`，提交期间使用 `disabled` 和 `aria-busy`。

Content script 面对的是不可信页面 DOM：

- 用 `createElement` 和 `textContent` 构造 UI，不把页面内容拼进 `innerHTML`。
- 不在 DOM、URL 或页面脚本中放置来源平台 token、Gitea token 或完整设置。
- 不直接从页面调用 Gitea。按钮只发送 `PREPARE_MIGRATE_PAGE` intent，敏感设置读取和目标 URL 校验留在 background。
- 只使用 `mount(environment)` 注入的 `document`、`location`、`MutationObserver`、`sendCommand` 和 `window`，避免隐藏依赖，并保持 interface 可测试。

### 4.3 在 manifest 中加载按钮

只有实现了 `pageAction` 的平台才需要新增 `content_scripts` 条目。脚本顺序必须保持：runtime → adapter → WebExtension compatibility → command client → 通用入口。

```json
{
  "matches": ["https://examplehub.com/*/*"],
  "js": [
    "core/source/runtime.js",
    "core/source/examplehub.js",
    "shared/web-extension.js",
    "shared/extension-commands.js",
    "content/source-page.js"
  ],
  "css": ["content/mirror-button.css"],
  "run_at": "document_idle"
}
```

`matches` 应使用能够覆盖仓库页的最小 host/path 范围。不要为了按钮请求与平台无关的 host 权限。若新平台需要不同样式，可在平台 adapter 为按钮追加专用 class，并增加专用 CSS；通用视觉优先复用 `content/mirror-button.css`。

### 4.4 测试页面按钮

在 `tests/content-script.test.mjs` 复用现有 Page Action harness，并按 manifest 的顺序加载：

```text
core/source/runtime.js
core/source/examplehub.js
shared/web-extension.js
shared/extension-commands.js
content/source-page.js
```

至少验证：

1. 仓库页会在正确容器中创建一个按钮。
2. 多次 DOM mutation 或重复导航不会创建重复按钮。
3. 从仓库 A 导航到仓库 B 后，按钮绑定新的规范化仓库对象。
4. 点击发送 `PREPARE_MIGRATE_PAGE`，payload 包含 `sourceUrl`、目标仓库名和纯文本描述。
5. background 返回 URL 后使用 `location.assign` 跳转。
6. 收到 `SETTINGS_REQUIRED` 时发送 `OPEN_OPTIONS_PAGE`，而不是自行读取设置。
7. 普通失败会恢复按钮状态并显示错误。

同时在 `tests/manifest.test.mjs` 验证新 `matches`、脚本顺序和所有声明文件都存在。

## 完成检查表

- [ ] `core/source/<id>.js` 注册一个且仅一个 adapter。
- [ ] `id` 唯一，`hosts` 只声明精确公共 hostname。
- [ ] `parse` 返回统一 `{ platform, host, owner, name, cloneUrl }`。
- [ ] `getMetadata` 使用注入的 `fetchImpl` 并返回 `{ description }`。
- [ ] `core/source/index.js` 导入新 adapter；runtime 的 Map 注册无冲突。
- [ ] 不需要页面按钮时，adapter 省略 `pageAction`，manifest 不增加条目。
- [ ] 需要页面按钮时，通过 `pageAction.mount(environment)` 实现，并按规定顺序增加 content scripts。
- [ ] adapter contract、Page Action 和 manifest 测试均已覆盖。
- [ ] `node --test` 全部通过。
