import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Home,
} from 'lucide-react';

interface VaultFile {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
}

interface VaultTreeProps {
  onSelectNote: (path: string) => void;
  selectedPath: string | null;
}

interface TreeNodeProps {
  file: VaultFile;
  depth: number;
  onSelectNote: (path: string) => void;
  selectedPath: string | null;
}

function TreeNode({ file, depth, onSelectNote, selectedPath }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!file.is_dir) return;
    setLoading(true);
    try {
      const result = await invoke<VaultFile[]>('list_vault_directory', {
        relativePath: file.path,
      });
      setChildren(result);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  }, [file.path, file.is_dir]);

  const handleClick = () => {
    if (file.is_dir) {
      if (!isOpen && children.length === 0) {
        loadChildren();
      }
      setIsOpen(!isOpen);
    } else if (file.extension === 'md') {
      onSelectNote(file.path);
    }
  };

  const isSelected = selectedPath === file.path;
  const isMarkdown = file.extension === 'md';

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-md transition-colors ${
          isSelected
            ? 'bg-purple-500/20 text-purple-300'
            : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {file.is_dir ? (
          <>
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
            ) : isOpen ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
            {isOpen ? (
              <FolderOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <Folder className="w-4 h-4 text-amber-400" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <FileText className={`w-4 h-4 ${isMarkdown ? 'text-blue-400' : 'text-zinc-500'}`} />
          </>
        )}
        <span className="truncate">{file.name}</span>
      </button>

      <AnimatePresence>
        {isOpen && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children.map((child) => (
              <TreeNode
                key={child.path}
                file={child}
                depth={depth + 1}
                onSelectNote={onSelectNote}
                selectedPath={selectedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VaultTree({ onSelectNote, selectedPath }: VaultTreeProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<VaultFile[]>('list_vault_directory', {
        relativePath: null,
      });
      setFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Home className="w-4 h-4" />
          <span>Vault</span>
        </div>
        <button
          onClick={loadRoot}
          disabled={loading}
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading && files.length === 0 ? (
          <div className="px-3 py-4 text-center text-zinc-500 text-sm">
            Loading vault...
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-center text-red-400 text-sm">
            {error}
          </div>
        ) : files.length === 0 ? (
          <div className="px-3 py-4 text-center text-zinc-500 text-sm">
            No files in vault
          </div>
        ) : (
          files.map((file) => (
            <TreeNode
              key={file.path}
              file={file}
              depth={0}
              onSelectNote={onSelectNote}
              selectedPath={selectedPath}
            />
          ))
        )}
      </div>
    </div>
  );
}
