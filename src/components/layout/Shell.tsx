import { useState } from 'react';
import { Sidebar, type View } from './Sidebar';
import { Header } from './Header';
import { GovernancePanel } from '../governance/GovernancePanel';
import { TruthPanel } from '../truth/TruthPanel';
import { AgentsPanel } from '../agents/AgentsPanel';
import { AuditPanel } from '../audit/AuditPanel';
import { KnowledgePanel } from '../knowledge/KnowledgePanel';

export function Shell() {
  const [currentView, setCurrentView] = useState<View>('governance');

  return (
    <div className="flex h-screen bg-[#0a0a12]">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentView={currentView} />

        <main className="flex-1 overflow-auto p-6">
          {currentView === 'governance' && <GovernancePanel />}
          {currentView === 'agents' && <AgentsPanel />}
          {currentView === 'truth' && <TruthPanel />}
          {currentView === 'audit' && <AuditPanel />}
          {currentView === 'knowledge' && <KnowledgePanel />}
          {currentView === 'terminal' && <PlaceholderView title="Terminal" description="Integrated terminal coming in Phase 6" />}
          {currentView === 'settings' && <PlaceholderView title="Settings" description="Configuration panel coming soon" />}
        </main>
      </div>
    </div>
  );
}

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-light text-white/60 mb-2">{title}</h2>
        <p className="text-sm text-white/30">{description}</p>
      </div>
    </div>
  );
}
