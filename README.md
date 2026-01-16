# TruthGit Desktop

> Local-first governance layer for AI ecosystems

A Tauri-based desktop application that provides a unified interface for TruthGit, enabling governance verification, truth tracking, and agent management.

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Governance Panel** | Verify claims with risk profiles (low/medium/high) | ✅ |
| **Truth Repository** | Browse local `.truth/` claims and verifications | ✅ |
| **Agent Management** | View 21 agents across 4 universes | ✅ |
| **Audit Trail** | Complete timeline of governance decisions | ✅ |
| **Knowledge Base** | Obsidian-lite vault browser with markdown | ✅ |
| **Terminal** | Integrated xterm.js with TruthGit commands | ✅ |
| **Settings** | Configurable paths, API mode, risk profiles | ✅ |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TruthGit Desktop                     │
├─────────────────────────────────────────────────────────┤
│  React 19 + TypeScript + Tailwind CSS 4                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Governance│ │  Truth  │ │ Agents  │ │  Audit  │       │
│  │  Panel   │ │  Repo   │ │  Panel  │ │  Trail  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │Knowledge│ │Terminal │ │Settings │                   │
│  │  Base   │ │ xterm.js│ │  Panel  │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
├─────────────────────────────────────────────────────────┤
│                    Tauri 2.0 + Rust                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Local-First: TruthGit CLI / Remote: Cloud API   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Local-First by Default

- **Default Mode**: Uses local TruthGit CLI - data stays on your machine
- **Optional Remote**: Cloud-hosted API available via Settings
- **Configurable**: All paths editable in Settings panel
- **Secure Terminal**: Dangerous command detection and warnings

## Installation

### From Release

Download from [Releases](https://github.com/lumensyntax-org/truthgit-desktop/releases):

```bash
# Ubuntu/Debian
sudo dpkg -i TruthGit_0.2.0_amd64.deb

# Fedora/RHEL
sudo rpm -i TruthGit-0.2.0-1.x86_64.rpm
```

### Requirements

- Linux x86_64
- TruthGit CLI (for local-first mode):
  ```bash
  pip install truthgit
  ```

### From Source

**Prerequisites:**
- Node.js 18+
- Rust 1.77+
- GTK development libraries

```bash
# Install GTK dependencies (Ubuntu/Debian)
sudo apt-get install -y libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev

# Clone and build
git clone https://github.com/lumensyntax-org/truthgit-desktop.git
cd truthgit-desktop
npm install
npm run tauri build
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Type check
npm run build
```

## Configuration

Settings are stored in `~/.config/truthgit/settings.json`:

```json
{
  "vault_path": "/home/user/Documents/Obsidian Vault",
  "truth_repo_path": "/home/user/project/.truth",
  "api_mode": "local",
  "api_url": "https://truthgit-api.run.app",
  "default_risk_profile": "medium",
  "terminal_font_size": 14,
  "auto_save_audit": true
}
```

| Setting | Description | Default |
|---------|-------------|---------|
| `api_mode` | `local` (TruthGit CLI) or `remote` (Cloud API) | `local` |
| `vault_path` | Path to Obsidian vault | `~/Documents/Obsidian Vault` |
| `truth_repo_path` | Path to `.truth/` directory | `~/.truth` |
| `default_risk_profile` | `low`, `medium`, or `high` | `medium` |

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Tauri 2.0, Rust
- **Terminal**: xterm.js with addons
- **Animations**: Framer Motion
- **Markdown**: react-markdown + remark-gfm

## License

MIT

## Links

- [TruthGit CLI](https://pypi.org/project/truthgit/) - Truth verification system
- [truthgit.com](https://truthgit.com) - Web interface
- [LumenSyntax](https://lumensyntax.com) - Ecosystem documentation
