import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Search,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { VaultTree } from './VaultTree';
import { NoteViewer } from './NoteViewer';

interface VaultStatus {
  exists: boolean;
  path: string;
  file_count: number;
  folder_count: number;
}

interface SearchResult {
  path: string;
  name: string;
  matches: string[];
  line_numbers: number[];
}

export function KnowledgePanel() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadVaultStatus = useCallback(async () => {
    try {
      const status = await invoke<VaultStatus>('get_vault_status');
      setVaultStatus(status);
    } catch (err) {
      console.error('Failed to load vault status:', err);
    }
  }, []);

  useEffect(() => {
    loadVaultStatus();
  }, [loadVaultStatus]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await invoke<SearchResult[]>('search_notes', {
        query: searchQuery,
      });
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (path: string) => {
    setSelectedNote(path);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!vaultStatus?.exists) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">
            Vault not found
          </h2>
          <p className="text-zinc-400 mb-4">
            Could not find the Obsidian vault at the expected location.
          </p>
          <p className="text-zinc-500 text-sm font-mono bg-zinc-900 px-3 py-2 rounded">
            {vaultStatus?.path || '~/Obsidian/LumenSyntax'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Knowledge Base</h1>
            <p className="text-xs text-zinc-500">
              {vaultStatus.file_count} files · {vaultStatus.folder_count} folders
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`p-2 rounded-lg transition-colors ${
            showSearch
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-zinc-800 overflow-hidden"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search notes..."
                  autoFocus
                  className="w-full pl-10 pr-10 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.path}
                      onClick={() => handleSelectSearchResult(result.path)}
                      className="w-full text-left p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-zinc-100 font-medium">{result.name}</span>
                        <span className="text-xs text-zinc-500">
                          {result.matches.length} matches
                        </span>
                      </div>
                      {result.matches.slice(0, 2).map((match, i) => (
                        <p key={i} className="text-xs text-zinc-400 truncate mt-1">
                          <span className="text-zinc-600">L{result.line_numbers[i]}:</span> {match}
                        </p>
                      ))}
                    </button>
                  ))}
                </div>
              )}

              {isSearching && (
                <p className="text-sm text-zinc-500 mt-2">Searching...</p>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <p className="text-sm text-zinc-500 mt-2">
                  No results found for "{searchQuery}"
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Vault Tree */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <VaultTree
            onSelectNote={setSelectedNote}
            selectedPath={selectedNote}
          />
        </div>

        {/* Main - Note Viewer */}
        <div className="flex-1 overflow-hidden">
          <NoteViewer
            notePath={selectedNote}
            onLinkClick={setSelectedNote}
          />
        </div>
      </div>
    </div>
  );
}
