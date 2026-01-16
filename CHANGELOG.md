# Changelog

All notable changes to TruthGit Desktop will be documented in this file.

## [0.2.0] - 2026-01-16

### Changed

- **Rebranding**: Renamed from "LumenSyntax Desktop" to "TruthGit Desktop"
  - Product name: TruthGit
  - App identifier: com.truthgit.desktop
  - Config directory: ~/.config/truthgit/
  - All UI references updated

- **Clarified Product Architecture**:
  - TruthGit Desktop = The main product (local-first)
  - truthgit.com = Landing page + download
  - lumensyntax.com = Ecosystem documentation

## [0.1.0] - 2026-01-15

### Added

- **Governance Panel**
  - Claim verification with TruthGit governance API
  - Risk profile selection (low/medium/high)
  - Real-time status and action display
  - Ontological type classification

- **Truth Repository**
  - Browse local `.truth/` claims
  - View verifications and proofs
  - Compressed object decompression (zlib)
  - Repository status indicator

- **Agent Management**
  - 21 agents across 4 universes (CORE, CLAUDE, GPT, GRAVITY)
  - Agent cards with capabilities display
  - Universe-based filtering
  - Status indicators

- **Audit Trail**
  - Timeline visualization of all governance decisions
  - Automatic logging of verifications
  - Persistent audit.json storage
  - Filtering by action type

- **Knowledge Base**
  - Obsidian-lite vault browser
  - Markdown rendering with remark-gfm
  - Wiki-link support (`[[note]]`)
  - Full-text search across notes

- **Terminal**
  - Integrated xterm.js terminal
  - Command history (up/down arrows)
  - Quick command buttons for TruthGit
  - Dangerous command detection
  - Custom theme matching app design

- **Settings**
  - Local-first / Remote API mode toggle
  - Configurable vault and truth repo paths
  - Terminal font size selection
  - Default risk profile setting
  - Auto-save audit toggle
  - Persistent configuration

### Architecture

- **Local-First by Default**: Uses TruthGit CLI, data stays local
- **Remote API Optional**: Cloud-hosted API configurable in Settings
- **Tauri 2.0**: Rust backend with secure IPC
- **React 19**: Modern hooks and concurrent features

### Security

- Dangerous command detection in terminal
- No data sent to remote by default
- Configurable API endpoints
- Local audit trail

---

## Links

- [Release v0.2.0](https://github.com/lumensyntax-org/truthgit-desktop/releases/tag/v0.2.0)
- [TruthGit on PyPI](https://pypi.org/project/truthgit/)
- [truthgit.com](https://truthgit.com)
