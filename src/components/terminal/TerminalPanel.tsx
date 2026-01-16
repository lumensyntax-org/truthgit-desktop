import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon, Trash2, ChevronRight } from 'lucide-react';

interface ShellOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
  success: boolean;
}

const WELCOME_MESSAGE = `\x1b[1;35m╔══════════════════════════════════════════════════════════╗
║           TruthGit Terminal - Governance Layer            ║
╚══════════════════════════════════════════════════════════╝\x1b[0m

\x1b[90mType commands to interact with the ecosystem.
Quick commands: truthgit status, truthgit verify "claim"\x1b[0m

`;

const PROMPT = '\x1b[1;36mtruthgit\x1b[0m:\x1b[1;34m~\x1b[0m$ ';

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [currentLine, setCurrentLine] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);

  const writePrompt = useCallback(() => {
    xtermRef.current?.write(PROMPT);
  }, []);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) {
      writePrompt();
      return;
    }

    setIsExecuting(true);
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    try {
      const result = await invoke<ShellOutput>('execute_shell', {
        command,
        cwd: null,
      });

      if (result.stdout) {
        xtermRef.current?.write(result.stdout);
        if (!result.stdout.endsWith('\n')) {
          xtermRef.current?.write('\r\n');
        }
      }

      if (result.stderr) {
        xtermRef.current?.write(`\x1b[31m${result.stderr}\x1b[0m`);
        if (!result.stderr.endsWith('\n')) {
          xtermRef.current?.write('\r\n');
        }
      }

      if (!result.success) {
        xtermRef.current?.write(`\x1b[90mExit code: ${result.exit_code}\x1b[0m\r\n`);
      }
    } catch (err) {
      xtermRef.current?.write(`\x1b[31mError: ${err}\x1b[0m\r\n`);
    }

    setIsExecuting(false);
    writePrompt();
  }, [writePrompt]);

  const handleKeyEvent = useCallback((event: { key: string; domEvent: KeyboardEvent }) => {
    const { key, domEvent } = event;
    const term = xtermRef.current;
    if (!term || isExecuting) return;

    // Handle special keys
    if (domEvent.key === 'Enter') {
      term.write('\r\n');
      executeCommand(currentLine);
      setCurrentLine('');
      return;
    }

    if (domEvent.key === 'Backspace') {
      if (currentLine.length > 0) {
        setCurrentLine((prev) => prev.slice(0, -1));
        term.write('\b \b');
      }
      return;
    }

    if (domEvent.key === 'ArrowUp') {
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        const historyCmd = commandHistory[commandHistory.length - 1 - newIndex];
        // Clear current line
        term.write('\r' + PROMPT + ' '.repeat(currentLine.length) + '\r' + PROMPT);
        term.write(historyCmd);
        setCurrentLine(historyCmd);
      }
      return;
    }

    if (domEvent.key === 'ArrowDown') {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const historyCmd = commandHistory[commandHistory.length - 1 - newIndex];
        term.write('\r' + PROMPT + ' '.repeat(currentLine.length) + '\r' + PROMPT);
        term.write(historyCmd);
        setCurrentLine(historyCmd);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        term.write('\r' + PROMPT + ' '.repeat(currentLine.length) + '\r' + PROMPT);
        setCurrentLine('');
      }
      return;
    }

    // Handle Ctrl+C
    if (domEvent.ctrlKey && domEvent.key === 'c') {
      term.write('^C\r\n');
      setCurrentLine('');
      writePrompt();
      return;
    }

    // Handle Ctrl+L (clear)
    if (domEvent.ctrlKey && domEvent.key === 'l') {
      term.clear();
      writePrompt();
      return;
    }

    // Regular character input
    if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
      setCurrentLine((prev) => prev + key);
      term.write(key);
    }
  }, [currentLine, commandHistory, historyIndex, isExecuting, executeCommand, writePrompt]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#0a0a12',
        foreground: '#e4e4e7',
        cursor: '#a855f7',
        cursorAccent: '#0a0a12',
        selectionBackground: '#6366f144',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    term.write(WELCOME_MESSAGE);
    term.write(PROMPT);

    term.onKey(handleKeyEvent);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, [handleKeyEvent]);

  const clearTerminal = () => {
    xtermRef.current?.clear();
    xtermRef.current?.write(WELCOME_MESSAGE);
    writePrompt();
    setCurrentLine('');
  };

  const quickCommands = [
    { label: 'TruthGit Status', command: 'truthgit status' },
    { label: 'List Claims', command: 'truthgit search ""' },
    { label: 'Git Status', command: 'git status' },
  ];

  const runQuickCommand = (command: string) => {
    if (xtermRef.current && !isExecuting) {
      xtermRef.current.write(command + '\r\n');
      executeCommand(command);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a12]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-500/20 to-zinc-600/20 flex items-center justify-center">
            <TerminalIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Terminal</h1>
            <p className="text-xs text-zinc-500">~/Almacen_IA/LumenSyntax-Main</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Commands */}
          <div className="flex items-center gap-1">
            {quickCommands.map((cmd) => (
              <button
                key={cmd.command}
                onClick={() => runQuickCommand(cmd.command)}
                disabled={isExecuting}
                className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-3 h-3 inline mr-1" />
                {cmd.label}
              </button>
            ))}
          </div>

          <button
            onClick={clearTerminal}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 p-2 overflow-hidden">
        <div
          ref={terminalRef}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
