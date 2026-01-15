import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  GitBranch,
  Clock,
  BookOpen,
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type View = 'governance' | 'agents' | 'truth' | 'audit' | 'knowledge' | 'terminal' | 'settings';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems: { id: View; label: string; icon: typeof Shield }[] = [
  { id: 'governance', label: 'Governance', icon: Shield },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'truth', label: 'Truth Repo', icon: GitBranch },
  { id: 'audit', label: 'Audit Trail', icon: Clock },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      className="relative h-full bg-white/[0.02] border-r border-white/10 flex flex-col"
      animate={{ width: collapsed ? 60 : 200 }}
      transition={{ duration: 0.2 }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <span className="text-2xl font-serif text-indigo-400">Λ</span>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-medium text-white/80"
          >
            LumenSyntax
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              currentView === item.id
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm"
              >
                {item.label}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            currentView === 'settings'
              ? 'bg-indigo-600/20 text-indigo-400'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/20 transition"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}
