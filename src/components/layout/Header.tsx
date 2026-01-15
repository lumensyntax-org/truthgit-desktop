import { Circle } from 'lucide-react';
import type { View } from './Sidebar';

interface HeaderProps {
  currentView: View;
}

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  governance: { title: 'Governance', subtitle: 'Should the agent act?' },
  agents: { title: 'Agents', subtitle: '33 specialized agents' },
  truth: { title: 'Truth Repository', subtitle: 'Local .truth/ claims' },
  audit: { title: 'Audit Trail', subtitle: 'Decision history' },
  knowledge: { title: 'Knowledge Base', subtitle: 'Persistent memory' },
  terminal: { title: 'Terminal', subtitle: 'CLI interface' },
  settings: { title: 'Settings', subtitle: 'Configuration' },
};

export function Header({ currentView }: HeaderProps) {
  const { title, subtitle } = viewTitles[currentView];

  return (
    <header className="h-14 px-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
      <div>
        <h1 className="text-lg font-medium text-white/90">{title}</h1>
        <p className="text-xs text-white/40">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Status indicators */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="text-white/40">TruthGit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="text-white/40">Local</span>
          </div>
        </div>

        {/* Version */}
        <span className="text-xs text-white/20 font-mono">v0.1.0</span>
      </div>
    </header>
  );
}
