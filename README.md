# LumenSyntax Desktop

> Local-first governance layer for AI ecosystems

A Tauri-based desktop application that provides a unified interface for the LumenSyntax ecosystem.

## Features

- **Governance Panel** - Verify claims with risk profiles (low/medium/high)
- **Agent Management** - Orchestrate 33 specialized agents (coming soon)
- **Truth Repository** - Visualize local `.truth/` claims (coming soon)
- **Audit Trail** - Complete decision history (coming soon)
- **Knowledge Base** - Integrated Obsidian-lite (coming soon)
- **Terminal** - Embedded CLI interface (coming soon)

## Installation

### From Release
Download the latest `.deb` or `.rpm` from [Releases](https://github.com/lumensyntax-org/lumensyntax-desktop/releases).

```bash
# Ubuntu/Debian
sudo dpkg -i LumenSyntax_0.1.0_amd64.deb

# Fedora/RHEL
sudo rpm -i LumenSyntax-0.1.0-1.x86_64.rpm
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
git clone https://github.com/lumensyntax-org/lumensyntax-desktop.git
cd lumensyntax-desktop
npm install
npm run tauri:build
```

## Development

```bash
# Start development server
npm run dev

# Run Tauri in dev mode
npm run tauri:dev
```

## Architecture

```
┌─────────────────────────────────────────┐
│           React Frontend                 │
│  (Governance, Agents, Truth, Audit)     │
├─────────────────────────────────────────┤
│           Tauri Bridge                   │
│  (invoke commands)                       │
├─────────────────────────────────────────┤
│           Rust Backend                   │
│  (TruthGit API, local .truth/)          │
└─────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Rust, Tauri 2.0
- **API**: TruthGit Governance API

## Related Projects

- [TruthGit](https://github.com/lumensyntax-org/truthgit) - Governance layer for autonomous agents
- [LumenSyntax Core](https://github.com/lumensyntax-org/lumensyntax-core) - Core ecosystem packages

## License

MIT
