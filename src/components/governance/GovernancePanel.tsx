import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

type RiskProfile = 'low' | 'medium' | 'high';
type GovernanceAction = 'proceed' | 'abort' | 'escalate' | 'revise';

interface GovernanceResult {
  status: string;
  action: GovernanceAction;
  confidence: number;
  reason: string;
  audit_ref: string;
  ontological_type: string | null;
}

export function GovernancePanel() {
  const [claim, setClaim] = useState('');
  const [domain, setDomain] = useState('general');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GovernanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const examples = [
    { claim: "Water boils at 100°C", domain: "science" },
    { claim: "This treatment cures cancer", domain: "medical" },
    { claim: "The API should retry on failure", domain: "engineering" },
  ];

  const handleVerify = async () => {
    if (!claim.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await invoke<GovernanceResult>('governance_verify', {
        claim,
        domain,
        riskProfile,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  };

  const getActionStyle = (action: GovernanceAction) => {
    switch (action) {
      case 'proceed': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'abort': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'escalate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'revise': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getActionIcon = (action: GovernanceAction) => {
    switch (action) {
      case 'proceed': return <CheckCircle className="w-5 h-5" />;
      case 'abort': return <XCircle className="w-5 h-5" />;
      case 'escalate': return <AlertTriangle className="w-5 h-5" />;
      case 'revise': return <RefreshCw className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Input Card */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <h3 className="text-lg font-medium text-white/80 mb-4">Verify Claim</h3>

        {/* Claim input */}
        <div className="mb-4">
          <label className="block text-sm text-white/40 mb-2">Claim</label>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="Enter a claim to verify..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-indigo-500/50 text-sm text-white placeholder-white/30 resize-none"
            rows={3}
          />
        </div>

        {/* Domain and Risk */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-white/40 mb-2">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80"
            >
              <option value="general">General</option>
              <option value="science">Science</option>
              <option value="medical">Medical</option>
              <option value="financial">Financial</option>
              <option value="legal">Legal</option>
              <option value="engineering">Engineering</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/40 mb-2">Risk Profile</label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskProfile(level)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition ${
                    riskProfile === level
                      ? level === 'low' ? 'bg-green-600/60 text-white' :
                        level === 'medium' ? 'bg-yellow-600/60 text-white' :
                        'bg-red-600/60 text-white'
                      : 'bg-white/5 text-white/40 hover:text-white/60'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="mb-4">
          <label className="block text-sm text-white/40 mb-2">Examples</label>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => { setClaim(ex.claim); setDomain(ex.domain); }}
                className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition text-white/50"
              >
                {ex.claim}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleVerify}
          disabled={loading || !claim.trim()}
          className="w-full py-3 bg-indigo-600/80 hover:bg-indigo-500/80 disabled:opacity-40 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Claim'
          )}
        </button>
      </div>

      {/* Result Card */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border ${getActionStyle(result.action)}`}
        >
          {/* Action header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getActionIcon(result.action)}
              <span className="text-xl font-medium uppercase">{result.action}</span>
            </div>
            <span className="text-sm px-3 py-1 rounded-lg bg-white/10">{result.status}</span>
          </div>

          {/* Confidence bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-white/60">Confidence</span>
              <span>{Math.round(result.confidence * 100)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence * 100}%` }}
                className="h-full bg-current rounded-full"
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <span className="text-sm text-white/60 block mb-1">Reason</span>
            <p className="text-sm">{result.reason}</p>
          </div>

          {/* Audit ref */}
          <div className="pt-4 border-t border-white/10">
            <span className="text-xs text-white/40 font-mono">{result.audit_ref}</span>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
        >
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Thresholds info */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <h4 className="text-sm font-medium text-white/60 mb-3">Risk Thresholds</h4>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-2 rounded bg-green-500/10 text-green-400">
            <div className="font-medium">Low</div>
            <div className="text-white/40">≥ 60%</div>
          </div>
          <div className="p-2 rounded bg-yellow-500/10 text-yellow-400">
            <div className="font-medium">Medium</div>
            <div className="text-white/40">≥ 75%</div>
          </div>
          <div className="p-2 rounded bg-red-500/10 text-red-400">
            <div className="font-medium">High</div>
            <div className="text-white/40">≥ 90%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
