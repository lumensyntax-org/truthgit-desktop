import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Clock, Loader2, AlertCircle } from 'lucide-react';

interface VaultNote {
  path: string;
  name: string;
  content: string;
  modified: string | null;
}

interface NoteViewerProps {
  notePath: string | null;
  onLinkClick?: (path: string) => void;
}

export function NoteViewer({ notePath, onLinkClick }: NoteViewerProps) {
  const [note, setNote] = useState<VaultNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNote = useCallback(async () => {
    if (!notePath) {
      setNote(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke<VaultNote>('read_note', {
        relativePath: notePath,
      });
      setNote(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setNote(null);
    } finally {
      setLoading(false);
    }
  }, [notePath]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  // Handle wiki-style links [[Note Name]]
  const processContent = (content: string) => {
    return content.replace(/\[\[([^\]]+)\]\]/g, (_, linkText) => {
      const parts = linkText.split('|');
      const path = parts[0].trim();
      const display = parts[1]?.trim() || path;
      return `[${display}](obsidian://${path})`;
    });
  };

  if (!notePath) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Select a note to view</p>
          <p className="text-zinc-500 text-sm mt-1">
            Browse the vault tree on the left
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400">Failed to load note</p>
          <p className="text-red-400/70 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{note.name}</h1>
          <p className="text-xs text-zinc-500 font-mono">{note.path}</p>
        </div>
        {note.modified && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(note.modified)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <article className="prose prose-invert prose-zinc max-w-none
          prose-headings:text-zinc-100 prose-headings:font-semibold
          prose-h1:text-2xl prose-h1:border-b prose-h1:border-zinc-800 prose-h1:pb-2
          prose-h2:text-xl prose-h2:mt-8
          prose-h3:text-lg prose-h3:mt-6
          prose-p:text-zinc-300 prose-p:leading-relaxed
          prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-zinc-200
          prose-code:text-purple-300 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
          prose-blockquote:border-l-purple-500 prose-blockquote:bg-zinc-900/50 prose-blockquote:py-1 prose-blockquote:not-italic
          prose-ul:text-zinc-300 prose-ol:text-zinc-300
          prose-li:marker:text-zinc-500
          prose-hr:border-zinc-800
          prose-table:text-sm
          prose-th:text-zinc-200 prose-th:bg-zinc-800/50 prose-th:px-3 prose-th:py-2
          prose-td:text-zinc-300 prose-td:px-3 prose-td:py-2 prose-td:border-zinc-800
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
                if (href?.startsWith('obsidian://')) {
                  const notePath = href.replace('obsidian://', '') + '.md';
                  return (
                    <button
                      onClick={() => onLinkClick?.(notePath)}
                      className="text-purple-400 hover:underline"
                    >
                      {children}
                    </button>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              },
            }}
          >
            {processContent(note.content)}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
