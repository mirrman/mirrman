# Mirrman

**[English](README_en.md)** | 简体中文

**Mirrman** 是一款浏览器扩展，帮助你用极少的步骤将 GitHub 仓库镜像到你自己的 Gitea 实例中。非常适合希望备份仓库，或将公共 / 私有仓库同步到自托管 Gitea 服务的开发者。

## 功能特点

- **一键镜像仓库**
  支持将 GitHub 或任意 Git 仓库镜像到你的 Gitea 实例

- **灵活的配置选项**
  可自定义需要同步的内容：
  - Wiki 页面
  - Issues
  - Pull Requests
  - Releases
  - Milestones
  - Labels
  - 支持 LFS（大文件存储）

- **多种仓库描述策略**
  可选择如何处理仓库描述：
  - 添加镜像来源前缀
  - 使用原始描述
  - 留空

- **支持私有仓库**
  可将镜像仓库设置为私有

- **基于 Token 的认证机制**
  安全地连接源仓库和目标仓库

- **简洁直观的界面**
  提供清爽的弹出窗口和设置页面

- **配置持久化**
  所有偏好设置会保存在浏览器本地

## 安装方法

1. 从 [GitHub Releases](https://github.com/mirrman/mirrman/releases) 下载最新版本
2. 解压下载的文件
3. 打开浏览器扩展管理页面：
   - **Chrome / Edge**：访问 `chrome://extensions/` 或 `edge://extensions/`
   - 开启右上角的**开发者模式**
   - 点击 **加载已解压的扩展程序**
   - 选择解压后的 `mirrman` 文件夹

4. 安装完成后，浏览器工具栏会出现 Mirrman 图标

## 使用方法

### 初始设置

1. 点击浏览器工具栏中的 Mirrman 图标
2. 点击 **⚙ 设置** 按钮进入设置页面
3. 配置你的 Gitea 实例：
   - 输入 **Gitea 实例地址**（例如：`https://gitea.example.com`）
   - 输入 **Gitea 个人访问令牌**（在 Gitea 中生成：Settings → Applications → Generate New Token）
  　注：该令牌需要`repository`的读写权限（用于创建仓库）与`organization`的`user`可读权限（用于获取仓库所有者的名称）
   - （可选）填写 **源仓库访问令牌**（用于访问私有源仓库）

4. 设置默认选项：
   > **Issues、Pull Requests、Releases、Milestones、Labels 需提供源仓库访问token后才可同步**
   - 仓库描述策略
   - 是否默认设为私有
   - 默认同步内容（Wiki、Issues、PR 等）
   - 是否默认启用 LFS
5. 点击 **保存**

### 镜像仓库

1. 点击浏览器工具栏中的 Mirrman 图标
2. 输入源仓库地址，例如：
   `https://github.com/owner/repo`
3. （可选）点击 **展开偏好设置**，进行自定义：
   - 仓库描述策略
   - 是否私有
   - 需要同步的内容（Wiki、Issues、LFS 等）
   - LFS Endpoint（如使用 LFS）

4. 点击 **开始镜像**
5. 等待执行完成，结果会以提示信息显示

## 配置说明

### 设置页面

- **Gitea 实例地址**
  你的自托管 Gitea 服务地址

- **Gitea Personal Access Token**
  用于 API 认证的访问令牌

- **源仓库访问令牌**
  用于访问私有源仓库（可选）

- **默认仓库描述策略**
  - 前缀：`[本仓库镜像自 {url}] — {原描述}`
  - 原始：保留原始描述
  - 留空：不填写描述

- **默认私有**
  新建镜像仓库是否默认设为私有

- **默认包含项**

  > **Issues、Pull Requests、Releases、Milestones、Labels 需提供源仓库访问token后才可同步**
  - Wiki、Issues、Pull Requests、Releases、Milestones、Labels

- **LFS 默认**
  是否默认启用大文件存储支持

- **测试 Gitea Token**
  验证 Token 是否有效

### 弹窗选项

在执行镜像时，可以覆盖默认设置：

- **仓库描述策略**
- **是否私有**
- **Wiki**
- **Issues**
- **LFS**
- **LFS Endpoint**

## 参与贡献

欢迎提交 Issue 或 Pull Request，一起完善项目！

## 许可证

本项目基于 GNU General Public License v3.0 开源，详见 [LICENSE](LICENSE) 文件。
