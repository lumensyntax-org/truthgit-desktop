import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Settings,
  FolderOpen,
  Terminal,
  Shield,
  Save,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface AppSettings {
  vault_path: string;
  truth_repo_path: string;
  api_mode: 'local' | 'remote';
  api_url: string;
  default_risk_profile: 'low' | 'medium' | 'high';
  terminal_font_size: number;
  auto_save_audit: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  vault_path: '~/Documents/Obsidian Vault',
  truth_repo_path: '~/Almacen_IA/LumenSyntax-Main/.truth',
  api_mode: 'local',
  api_url: 'https://truthgit-api-342668283383.us-central1.run.app',
  default_risk_profile: 'medium',
  terminal_font_size: 14,
  auto_save_audit: true,
};

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4 ml-14">
        {children}
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function InputField({ label, value, onChange, placeholder }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500 transition-colors"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleField({ label, description, value, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-purple-500' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const backendSettings = await invoke<AppSettings>('get_settings');
      setSettings(backendSettings);
    } catch (err) {
      console.error('Failed to load settings from backend:', err);
      // Fallback to defaults
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await invoke('update_settings', { newSettings: settings });
      setHasChanges(false);
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveMessage(`Failed to save: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-zinc-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
            <p className="text-xs text-zinc-500">Configure TruthGit Desktop</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={resetSettings}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${
              hasChanges
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* API Mode - Local First */}
          <SettingsSection
            icon={settings.api_mode === 'local' ? <WifiOff className="w-5 h-5 text-green-400" /> : <Wifi className="w-5 h-5 text-blue-400" />}
            title="Verification Mode"
            description="Choose how governance verification is performed"
          >
            <div className="space-y-3">
              <button
                onClick={() => updateSetting('api_mode', 'local')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  settings.api_mode === 'local'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <WifiOff className={`w-5 h-5 ${settings.api_mode === 'local' ? 'text-green-400' : 'text-zinc-500'}`} />
                  <div>
                    <p className={`font-medium ${settings.api_mode === 'local' ? 'text-green-400' : 'text-zinc-300'}`}>
                      Local-First (Recommended)
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Uses local TruthGit CLI. Data stays on your machine. Requires TruthGit installed.
                    </p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => updateSetting('api_mode', 'remote')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  settings.api_mode === 'remote'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wifi className={`w-5 h-5 ${settings.api_mode === 'remote' ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <div>
                    <p className={`font-medium ${settings.api_mode === 'remote' ? 'text-blue-400' : 'text-zinc-300'}`}>
                      Remote API
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Uses cloud-hosted TruthGit API. Requires internet connection.
                    </p>
                  </div>
                </div>
              </button>
            </div>
            {settings.api_mode === 'remote' && (
              <div className="mt-4">
                <InputField
                  label="API URL"
                  value={settings.api_url}
                  onChange={(v) => updateSetting('api_url', v)}
                  placeholder="https://truthgit-api-xxx.run.app"
                />
              </div>
            )}
          </SettingsSection>

          {/* Paths */}
          <SettingsSection
            icon={<FolderOpen className="w-5 h-5 text-blue-400" />}
            title="Paths"
            description="Configure file system locations"
          >
            <InputField
              label="Obsidian Vault Path"
              value={settings.vault_path}
              onChange={(v) => updateSetting('vault_path', v)}
              placeholder="~/Documents/Obsidian Vault"
            />
            <InputField
              label="Truth Repository Path (.truth)"
              value={settings.truth_repo_path}
              onChange={(v) => updateSetting('truth_repo_path', v)}
              placeholder="~/Almacen_IA/LumenSyntax-Main/.truth"
            />
          </SettingsSection>

          {/* Terminal */}
          <SettingsSection
            icon={<Terminal className="w-5 h-5 text-green-400" />}
            title="Terminal"
            description="Terminal emulator settings"
          >
            <SelectField
              label="Font Size"
              value={settings.terminal_font_size.toString()}
              onChange={(v) => updateSetting('terminal_font_size', parseInt(v))}
              options={[
                { value: '12', label: '12px' },
                { value: '14', label: '14px (Default)' },
                { value: '16', label: '16px' },
                { value: '18', label: '18px' },
              ]}
            />
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400">
                Terminal includes dangerous command detection. Potentially harmful commands will show a warning.
              </p>
            </div>
          </SettingsSection>

          {/* Governance */}
          <SettingsSection
            icon={<Shield className="w-5 h-5 text-amber-400" />}
            title="Governance"
            description="Default governance settings"
          >
            <SelectField
              label="Default Risk Profile"
              value={settings.default_risk_profile}
              onChange={(v) => updateSetting('default_risk_profile', v as 'low' | 'medium' | 'high')}
              options={[
                { value: 'low', label: 'Low - More permissive' },
                { value: 'medium', label: 'Medium - Balanced (Default)' },
                { value: 'high', label: 'High - Conservative' },
              ]}
            />
            <ToggleField
              label="Auto-save Audit Entries"
              description="Automatically save all verification results to the audit log"
              value={settings.auto_save_audit}
              onChange={(v) => updateSetting('auto_save_audit', v)}
            />
          </SettingsSection>

          {/* Version Info */}
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 text-center">
            <p className="text-zinc-400 text-sm mb-2">TruthGit Desktop</p>
            <p className="text-2xl font-light text-zinc-200 mb-1">v0.2.0</p>
            <p className="text-xs text-zinc-600">Phase 6 Complete - Local-First Architecture</p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
              <span>Tauri 2.0</span>
              <span>•</span>
              <span>React 19</span>
              <span>•</span>
              <span>xterm.js</span>
              <span>•</span>
              <span>TruthGit</span>
            </div>
            <div className="mt-3 text-xs text-green-500">
              {settings.api_mode === 'local' ? '🔒 Local-First Mode Active' : '☁️ Remote API Mode'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
