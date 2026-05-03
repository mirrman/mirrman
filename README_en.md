# Mirrman

English | **[简体中文](README.md)**

**Mirrman** is a browser extension that helps you mirror GitHub repositories to your own Gitea instance with just a few clicks. Perfect for developers who want to maintain backups or mirror public/private repositories to their self-hosted Gitea server.

## Features

- **Easy Repository Mirroring** - Mirror any GitHub, GitLab, or Git repository to your Gitea instance
- **Flexible Configuration** - Customize what to include in your mirrors:
  - Wiki pages
  - Issues
  - Pull Requests
  - Releases
  - Milestones
  - Labels
  - LFS (Large File Storage) support
- **Multiple Description Strategies** - Choose how to handle repository descriptions:
  - Prefix with mirror information
  - Use original description
  - Leave empty
- **Private Repository Support** - Create private mirrors when needed
- **Token-based Authentication** - Securely authenticate with both source and target repositories
- **Intuitive UI** - Clean popup interface with settings page for configuration
- **Persistent Settings** - Your preferences are saved locally in the browser

## Installation

1. Download the latest release from the [GitHub Releases](https://github.com/mirrman/mirrman/releases)
2. Unzip the downloaded file
3. Open your browser's extension management page:
   - **Chrome/Edge**: Go to `chrome://extensions/` or `edge://extensions/`
   - Enable **Developer mode** (toggle in the top right)
   - Click **Load unpacked**
   - Select the extracted `mirrman` directory
4. The Mirrman icon should now appear in your browser toolbar

## Usage

### Initial Setup

1. Click the Mirrman icon in your browser toolbar
2. Click the **⚙ 设置** (Settings) button to open the settings page
3. Configure your Gitea instance:
   - Enter your **Gitea 实例地址** (Gitea instance URL), e.g., `https://gitea.example.com`
   - Enter your **Gitea Personal Access Token** (Generate one in Gitea: Settings → Applications → Generate New Token)
   - (Optional) Enter a **源仓库访问令牌** (Source repository access token) for private source repositories
4. Set your default preferences:
   - Description strategy
   - Default private setting
   - Default items to include (Wiki, Issues, Pull Requests, etc.)
   - LFS default
5. Click **保存** (Save) to save your settings

### Mirroring a Repository

1. Click the Mirrman icon in your browser toolbar
2. Enter the source repository URL, e.g., `https://github.com/owner/repo`
3. (Optional) Click **下拉展开 偏好设置** (Expand Preferences) to customize:
   - Repository description strategy
   - Private repository toggle
   - Items to mirror (Wiki, Issues, LFS, etc.)
   - LFS endpoint (if using LFS)
4. Click **开始镜像** (Start Mirroring)
5. Wait for the process to complete - you'll see an alert with the result

## Configuration Options

### Settings Page

- **Gitea 实例地址** - Your self-hosted Gitea server URL
- **Gitea Personal Access Token** - Token for API authentication
- **源仓库访问令牌** - Token for accessing private source repositories (optional)
- **默认仓库描述策略** - How to handle descriptions for mirrored repos:
  - Prefix: `[本仓库镜像自 {url}] — {original description}`
  - Original: Keep the original description
  - Empty: Leave description blank
- **默认私有** - Whether new mirrors are private by default
- **默认包含项** - Default items to include when mirroring:
  - Wiki, Issues, Pull Requests, Releases, Milestones, Labels
- **LFS 默认** - Enable LFS support by default
- **测试 Gitea Token** - Verify your token is valid

### Popup Options

When mirroring a repository, you can override your default settings:

- **Repository Description Strategy** - Choose a different description strategy
- **Private** - Toggle between public/private
- **Wiki** - Include Wiki pages
- **Issues** - Include issues
- **LFS** - Enable LFS support
- **LFS endpoint** - Specify custom LFS endpoint

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
