/**
 * DeployX Remote Shell
 *
 * Thin client over a line-relayed shell transport. All interactive behavior
 * (echo, cursor motion, history, search, completion) lives in a readline-style
 * editor bound to xterm; the terminal itself renders nothing but shell I/O
 * plus terse bracketed system notices.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import io from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';
import './css/Terminal.css';
import Notification from './jsx/Notification';
import apiClient, { API_BASE_URL } from '../services/api';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const HISTORY_KEY = 'deployx:shell-history';
const HISTORY_LIMIT = 200;

const COMMANDS = [
  'cls', 'clear', 'dir', 'cd', 'echo', 'type', 'copy', 'move', 'del', 'ren',
  'mkdir', 'rmdir', 'where', 'systeminfo', 'whoami', 'hostname', 'ipconfig',
  'ping', 'tracert', 'netstat', 'tasklist', 'taskkill', 'sc', 'net', 'wmic',
  'reg', 'shutdown', 'sfc', 'chkdsk', 'driverquery', 'getmac', 'nslookup',
  'Get-ChildItem', 'Get-Content', 'Get-Process', 'Get-Service', 'Get-Item',
  'Set-Location', 'Copy-Item', 'Move-Item', 'Remove-Item', 'New-Item',
  'Stop-Process', 'Start-Process', 'Test-Connection', 'Select-String',
  'ls', 'pwd', 'cat', 'grep', 'curl', 'wget', 'chmod', 'chown', 'df', 'du',
  'ps', 'kill', 'top', 'uname', 'ifconfig', 'ssh', 'scp', 'tar', 'zip',
  'git', 'npm', 'node', 'python', 'pip', 'docker', 'dotnet', 'java',
];

const DARK_THEME = {
  background: 'rgba(0,0,0,0)',
  foreground: '#cbd5e1',
  cursor: '#60a5fa',
  cursorAccent: '#0f172a',
  selectionBackground: 'rgba(29,78,216,0.45)',
  black: '#0f172a', red: '#f87171', green: '#34d399', yellow: '#fbbf24',
  blue: '#60a5fa', magenta: '#c084fc', cyan: '#22d3ee', white: '#e2e8f0',
  brightBlack: '#64748b', brightRed: '#fca5a5', brightGreen: '#6ee7b7',
  brightYellow: '#fde68a', brightBlue: '#93c5fd', brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9', brightWhite: '#f1f5f9',
};

const LIGHT_THEME = {
  background: 'rgba(255,255,255,0)',
  foreground: '#334155',
  cursor: '#2563eb',
  cursorAccent: '#ffffff',
  selectionBackground: 'rgba(147,197,253,0.45)',
  black: '#0f172a', red: '#dc2626', green: '#16a34a', yellow: '#ca8a04',
  blue: '#2563eb', magenta: '#9333ea', cyan: '#0891b2', white: '#94a3b8',
  brightBlack: '#64748b', brightRed: '#ef4444', brightGreen: '#22c55e',
  brightYellow: '#eab308', brightBlue: '#3b82f6', brightMagenta: '#a855f7',
  brightCyan: '#06b6d4', brightWhite: '#0f172a',
};

const DIM = '\x1b[90m';
const RED = '\x1b[91m';
const RESET = '\x1b[0m';

const stripAnsi = (t) => t.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');

/* ── Line editor ───────────────────────────────────────────────────────────── */

/**
 * Readline-style editing bound to an xterm write function. Renders by
 * redrawing the full input line (prompt + buffer) rather than echoing
 * characters individually, which keeps every operation idempotent.
 */
function createLineEditor({ write, getPrompt, onSubmit, onInterrupt, onEof, onSuspend }) {
  const s = {
    buf: '', cur: 0,
    hist: [], idx: -1, draft: '',
    search: null,               // { query, matches, matchIdx }
  };

  const redraw = () => {
    write(`\r\x1b[K${getPrompt()}${s.buf}`);
    if (s.buf.length > s.cur) write(`\x1b[${s.buf.length - s.cur}D`);
  };

  const insert = (text) => {
    s.buf = s.buf.slice(0, s.cur) + text + s.buf.slice(s.cur);
    s.cur += text.length;
    redraw();
  };

  const delBack = (n = 1) => {
    if (s.cur === 0) return;
    const start = Math.max(0, s.cur - n);
    s.buf = s.buf.slice(0, start) + s.buf.slice(s.cur);
    s.cur = start;
    redraw();
  };

  const delFwd = (n = 1) => {
    if (s.cur >= s.buf.length) return;
    s.buf = s.buf.slice(0, s.cur) + s.buf.slice(s.cur + n);
    redraw();
  };

  const killEnd = () => { s.buf = s.buf.slice(0, s.cur); redraw(); };
  const killStart = () => { s.buf = s.buf.slice(s.cur); s.cur = 0; redraw(); };

  const wordBack = (from) => {
    let i = from;
    while (i > 0 && /\s/.test(s.buf[i - 1])) i--;
    while (i > 0 && !/\s/.test(s.buf[i - 1])) i--;
    return i;
  };
  const wordFwd = (from) => {
    let i = from;
    while (i < s.buf.length && /\s/.test(s.buf[i])) i++;
    while (i < s.buf.length && !/\s/.test(s.buf[i])) i++;
    return i;
  };

  const moveWord = (dir) => { s.cur = dir < 0 ? wordBack(s.cur) : wordFwd(s.cur); redraw(); };
  const move = (d) => {
    const p = s.cur + d;
    if (p < 0 || p > s.buf.length) return;
    s.cur = p; redraw();
  };
  const home = () => { s.cur = 0; redraw(); };
  const end = () => { s.cur = s.buf.length; redraw(); };
  const delWordBack = () => {
    const i = wordBack(s.cur);
    s.buf = s.buf.slice(0, i) + s.buf.slice(s.cur);
    s.cur = i; redraw();
  };

  /* history */
  const pushHist = (cmd) => {
    const t = cmd.trim();
    if (!t) return;
    if (s.hist.length === 0 || s.hist[s.hist.length - 1] !== t) {
      s.hist.push(t);
      if (s.hist.length > HISTORY_LIMIT) s.hist.shift();
    }
    s.idx = -1; s.draft = '';
  };
  const histNav = (dir) => {
    if (!s.hist.length) return;
    if (dir === 'up') {
      if (s.idx === -1) { s.draft = s.buf; s.idx = s.hist.length - 1; }
      else if (s.idx > 0) s.idx -= 1;
      else return;
    } else {
      if (s.idx === -1) return;
      s.idx += 1;
      if (s.idx >= s.hist.length) { s.idx = -1; s.buf = s.draft; s.cur = s.buf.length; redraw(); return; }
    }
    s.buf = s.hist[s.idx]; s.cur = s.buf.length; redraw();
  };

  /* reverse search */
  const searchRender = () => {
    const q = s.search.query.toLowerCase();
    s.search.matches = s.hist.filter((c) => c.toLowerCase().includes(q));
    s.search.matchIdx = Math.min(
      s.search.matchIdx ?? s.search.matches.length - 1,
      s.search.matches.length - 1
    );
    const hit = s.search.matches[s.search.matchIdx] ?? '';
    write(`\r\x1b[K${DIM}(reverse-i-search)\`${RESET}\x1b[36m${s.search.query}${RESET}${DIM}': ${RESET}${hit}`);
  };
  const searchExit = (accept) => {
    const hit = accept ? s.search?.matches?.[s.search.matchIdx] : null;
    s.search = null;
    if (hit != null) { s.buf = hit; s.cur = s.buf.length; }
    redraw();
  };

  /* completion */
  const complete = () => {
    const before = s.buf.slice(0, s.cur);
    const m = before.match(/(^|[\s&|;])([^\s&|;]*)$/);
    const token = m ? m[2] : '';
    if (!token && /\s/.test(before.trimEnd())) return;

    const hits = COMMANDS.filter((c) => c.toLowerCase().startsWith(token.toLowerCase()) && c !== token);
    if (!hits.length) { write('\x07'); return; }

    if (hits.length === 1) {
      insert(hits[0].slice(token.length) + ' ');
      return;
    }
    let common = hits[0];
    for (const h of hits) while (!h.toLowerCase().startsWith(common.toLowerCase())) common = common.slice(0, -1);
    if (common.length > token.length) { insert(common.slice(token.length)); return; }

    write('\r\n\x1b[K' + DIM + hits.join('   ') + RESET + '\r\n');
    redraw();
  };

  /* submit */
  const doSubmit = () => {
    write('\r\n');
    const line = s.buf;
    pushHist(line);
    s.buf = ''; s.cur = 0; s.idx = -1;
    onSubmit(line);
  };

  /** Feed one key event. Returns true when consumed. */
  const key = (data) => {
    /* ctrl+r search mode captures everything first */
    if (s.search) {
      switch (data) {
        case '\r':
          write('\r\n');
          searchExit(true);
          break;
        case '\x12':
          s.search.matchIdx = Math.max((s.search.matchIdx ?? s.search.matches.length) - 1, 0);
          searchRender();
          break;
        case '\x7f': case '\b':
          s.search.query = s.search.query.slice(0, -1);
          s.search.matchIdx = undefined;
          searchRender();
          break;
        case '\x1b': case '\u0003': case '\u0007':
          write('\r\n');
          searchExit(false);
          break;
        default:
          if (data.charCodeAt(0) >= 32) { s.search.query += data; s.search.matchIdx = undefined; searchRender(); }
          break;
      }
      return true;
    }

    switch (data) {
      case '\r': case '\n':            doSubmit(); return true;
      case '\x7f': case '\b':          delBack(); return true;
      case '\x1b[3~':                  delFwd(); return true;
      case '\x1b[A':                   histNav('up'); return true;
      case '\x1b[B':                   histNav('down'); return true;
      case '\x1b[D':                   move(-1); return true;
      case '\x1b[C':                   move(1); return true;
      case '\x1b[1;5D': case '\x1bb':  moveWord(-1); return true;
      case '\x1b[1;5C': case '\x1bf':  moveWord(1); return true;
      case '\x1b[H': case '\x1b[1~': case '\u0001': home(); return true;
      case '\x1b[F': case '\x1b[4~': case '\u0005': end(); return true;
      case '\u000b':                   killEnd(); return true;
      case '\u0015':                   killStart(); return true;
      case '\u0017':                   delWordBack(); return true;
      case '\u000c':                   write('\x1b[2J\x1b[H'); redraw(); return true;
      case '\u0003':                   write('^C\r\n'); s.buf = ''; s.cur = 0; s.idx = -1; onInterrupt(); redraw(); return true;
      case '\u001a':                   write('^Z\r\n'); s.buf = ''; s.cur = 0; onSuspend(); redraw(); return true;
      case '\u0004':                   onEof(); return true;
      case '\x12':                     s.search = { query: '', matches: [], matchIdx: undefined }; searchRender(); return true;
      case '\t':                       complete(); return true;
      default:                         break;
    }

    if (data.charCodeAt(0) >= 32) insert(data.replace(/[\r\n]+/g, ' '));
    return true;
  };

  return {
    key,
    redraw,
    reset: () => { s.buf = ''; s.cur = 0; s.idx = -1; s.search = null; },
    setHistory: (h) => { s.hist = h; },
    getHistory: () => s.hist,
    buffer: () => s.buf,
  };
}

/* ── Component ─────────────────────────────────────────────────────────────── */

const TerminalComponent = ({ height = '70vh' }) => {
  const hostRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const sockRef = useRef(null);
  const editorRef = useRef(null);
  const mountedRef = useRef(true);
  const connectAttemptedRef = useRef(false);

  const agentsRef = useRef([]);
  const agentRef = useRef('');
  const shellOnRef = useRef(false);
  const promptRef = useRef('');
  const pathRef = useRef('');
  const suppressPromptRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [shells, setShells] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedShell, setSelectedShell] = useState('');
  const [shellActive, setShellActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [toasts, setToasts] = useState([]);

  const agentName = agents.find((a) => a.agent_id === selectedAgent)?.hostname || selectedAgent || '—';
  const fmtTime = (v) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;

  /* ── toast helpers ── */
  const toast = useCallback((message, type = 'info') => {
    const durations = { error: 8000, warning: 6000, success: 3000, info: 2000 };
    setToasts((prev) => [...prev.filter((t) => t.message !== message),
      { id: Date.now() + Math.random(), message, type, duration: durations[type] || 5000 }]);
  }, []);
  const closeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  /* ── groups (for group-targeted sessions) ── */
  useEffect(() => {
    apiClient.get('/groups/')
      .then((d) => setGroups(d || []))
      .catch((err) => console.error('Failed to load groups:', err));
  }, []);

  useEffect(() => { agentRef.current = selectedAgent; }, [selectedAgent]);
  useEffect(() => { shellOnRef.current = shellActive; }, [shellActive]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  useEffect(() => {
    if (!shellActive) { setSessionSecs(0); return; }
    const t = setInterval(() => setSessionSecs((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [shellActive]);

  /* restore persisted history */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) editorRef.current?.setHistory(JSON.parse(raw).slice(-HISTORY_LIMIT) || []);
    } catch { /* noop */ }
  }, []);

  const persistHistory = useCallback(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(editorRef.current.getHistory().slice(-HISTORY_LIMIT)));
    } catch { /* noop */ }
  }, []);

  /* ── prompt handling ── */
  const getPrompt = useCallback(() => {
    if (promptRef.current) return promptRef.current;
    const host = agentsRef.current.find((a) => a.agent_id === agentRef.current)?.hostname || agentRef.current || 'deployx';
    return `\x1b[38;5;111m\x1b[1m${host}\x1b[0m\x1b[90m ❯\x1b[0m `;
  }, []);

  const note = useCallback((msg) => {
    termRef.current?.write(`\r\n${DIM}[${msg}]${RESET}\r\n`);
    editorRef.current?.redraw();
  }, []);

  const detectPrompt = useCallback((text) => {
    const lines = text.replace(/\r/g, '').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const t = lines[i].trimEnd();
      if (!t) continue;
      const cmd = t.match(/^([A-Za-z]:\\[^>]*?)>$/);
      const ps = t.match(/^PS\s+(.+?)>$/);
      const sh = t.match(/^(?:\[?[\w@.-]+\]?[:\s])?[#$]\s*$/);
      if (cmd || ps || sh) {
        promptRef.current = t;
        if (cmd) pathRef.current = cmd[1];
        else if (ps) pathRef.current = ps[1];
        break;
      }
    }

    if (suppressPromptRef.current) {
      const rawLines = text.split('\n');
      let j = rawLines.length - 1;
      const strip = (ln) => stripAnsi(ln.replace(/\r/g, '')).trimEnd();
      while (j >= 0 && strip(rawLines[j]).trim() === '') j--;
      suppressPromptRef.current = false;
      if (j >= 0 && /^(?:[A-Za-z]:\\.*>|PS\s+.*>|.*[#$]\s*)$/.test(strip(rawLines[j]))) {
        return rawLines.slice(0, j).join('\n');
      }
    }
    return text;
  }, []);

  const writeOutput = useCallback((text) => {
    const term = termRef.current;
    if (!term || !text) return;
    const ed = editorRef.current;
    const editing = ed && (ed.buffer().length > 0);
    if (editing && /\n\r?$/.test(text)) {
      term.write('\r\x1b[K');
      term.write(text);
      ed.redraw();
    } else {
      term.write(text);
    }
  }, []);

  /* ── submit / control plumbing ── */
  const sendCommand = useCallback((cmd) => {
    const socket = sockRef.current;
    const agent = agentRef.current;
    if (!socket?.connected || !agent) return false;
    socket.emit('command_input', { agent_id: agent, command: cmd });
    return true;
  }, []);

  const handleSubmit = useCallback((line) => {
    const socket = sockRef.current;
    if (!agentRef.current || !shellOnRef.current) {
      termRef.current?.write(`${DIM}[no active session]${RESET}\r\n`);
      editorRef.current?.redraw();
      return;
    }
    if (!socket?.connected) {
      termRef.current?.write(`${RED}[backend offline]${RESET}\r\n`);
      editorRef.current?.redraw();
      return;
    }

    const lower = line.trim().toLowerCase();
    if (lower === 'clear' || lower === 'cls') {
      persistHistory();
      sendCommand(line + '\n');
      suppressPromptRef.current = true;
      editorRef.current.reset();
      termRef.current.clear();
      editorRef.current.redraw();
      return;
    }

    persistHistory();
    sendCommand(line + '\n');
    editorRef.current.reset();
  }, [persistHistory, sendCommand]);

  /* ── layout ── */
  /** Fit only when the terminal is attached and has non-zero box, otherwise
      xterm's RenderService throws "reading 'dimensions'". */
  const safeFit = useCallback(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    const el = term.element;
    if (!el || !el.isConnected || el.clientWidth === 0 || el.clientHeight === 0) return;
    try { fit.fit(); term.scrollToBottom(); } catch { /* noop */ }
  }, []);

  /* ── xterm setup (theme-aware, re-runs nothing on toggle) ── */
  useEffect(() => {
    if (!hostRef.current) return;

    const applyTheme = () => {
      const light = !document.documentElement.classList.contains('dark');
      if (termRef.current) termRef.current.options.theme = light ? LIGHT_THEME : DARK_THEME;
    };

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontSize: 14,
      lineHeight: 1.25,
      fontFamily: '"JetBrains Mono", Consolas, "Cascadia Code", monospace',
      scrollback: 5000,
      allowTransparency: true,
      theme: document.documentElement.classList.contains('dark') ? DARK_THEME : LIGHT_THEME,
    });
    termRef.current = term;

    const fit = new FitAddon();
    fitRef.current = fit;
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(hostRef.current);

    editorRef.current = createLineEditor({
      write: (t) => term.write(t),
      getPrompt,
      onSubmit: handleSubmit,
      onInterrupt: () => sendCommand('\u0003'),
      onEof: () => sendCommand('\u0004'),
      onSuspend: () => sendCommand('\u001a'),
    });

    /* hydrate persisted history now that the editor exists */
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) editorRef.current.setHistory(JSON.parse(raw).slice(-HISTORY_LIMIT) || []);
    } catch { /* noop */ }

    /* First fit must wait for layout; fitting a 0×0 or detached element makes
       xterm's RenderService blow up with "reading 'dimensions'". */
    requestAnimationFrame(safeFit);

    term.onData((data) => {
      const ed = editorRef.current;
      if (!ed) return;
      if ((!agentRef.current || !shellOnRef.current) && data !== '\u0003' && !ed.buffer()) {
        if (data === '\r' || data === '\n') {
          term.write(`\r\n${DIM}[no active session - start one from the toolbar]${RESET}\r\n\r\n${getPrompt()}`);
        }
        return;
      }
      if (!sockRef.current?.connected && data !== '\u0003') return;
      ed.key(data);
    });

    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── resize ── */
  useEffect(() => {
    window.addEventListener('resize', safeFit);
    let ro;
    if (hostRef.current) {
      ro = new ResizeObserver(safeFit);
      ro.observe(hostRef.current);
    }
    return () => {
      window.removeEventListener('resize', safeFit);
      ro?.disconnect();
    };
  }, [safeFit]);

  /* ── socket transport ── */
  useEffect(() => {
    mountedRef.current = true;
    if (sockRef.current || connectAttemptedRef.current) return;
    connectAttemptedRef.current = true;

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    sockRef.current = socket;

    socket.on('connect', () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      setConnecting(false);
      setConnectionError(null);
      toast('Connected to backend server', 'success');
      socket.emit('frontend_register', {});
      setTimeout(() => socket.connected && socket.emit('get_agents'), 200);
    });

    socket.on('connect_error', (err) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      setConnecting(false);
      setConnectionError(`Failed to connect: ${err.message}`);
    });

    socket.on('disconnect', (reason) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      setShellActive(false);
      setConnectionError(`Disconnected: ${reason}`);
      note(`disconnected: ${reason}`);
      setAgents([]);
      setShells([]);
      setSelectedAgent('');
      setSelectedShell('');
      promptRef.current = '';
    });

    socket.on('agents_list', (list) => {
      if (!mountedRef.current) return;
      if (!Array.isArray(list)) return;
      const online = list.filter((a) => a.status === 'online');
      setAgents((prev) =>
        prev.map((a) => a.agent_id).join(',') === online.map((a) => a.agent_id).join(',') ? prev : online
      );
      if (online.length && !agentRef.current) {
        setSelectedAgent(online[0].agent_id);
        socket.emit('get_shells', online[0].agent_id);
      } else if (!online.length) {
        toast('No active agents available.', 'warning');
      }
    });

    socket.on('shells_list', (list) => {
      if (!mountedRef.current || !Array.isArray(list)) return;
      setShells(list);
      setSelectedShell((prev) => prev || (list.includes('cmd') ? 'cmd' : list.includes('powershell') ? 'powershell' : list[0]));
    });

    socket.on('command_output', (chunk) => {
      if (!mountedRef.current) return;
      const text = typeof chunk === 'string' ? chunk : '';
      if (!text) return;
      writeOutput(detectPrompt(text));
    });

    socket.on('shell_started', (shell) => {
      if (!mountedRef.current) return;
      setShellActive(true);
      setStarting(false);
      promptRef.current = '';
      toast(`${shell} session started on ${agentRef.current}`, 'success');
      const term = termRef.current;
      if (term) {
        term.clear();
        editorRef.current?.reset();
        editorRef.current?.redraw();
      }
    });

    socket.on('shell_stopped', () => {
      if (!mountedRef.current) return;
      setShellActive(false);
      setStopping(false);
      toast(`Shell stopped on ${agentRef.current}`, 'success');
      note('session closed');
    });

    socket.on('clear_terminal', () => {
      termRef.current?.clear();
      editorRef.current?.redraw();
    });

    socket.on('error', (err) => {
      if (!mountedRef.current) return;
      const msg = err?.message || String(err || 'unknown error');
      setConnectionError(msg);
      note(`error: ${msg}`);
    });

    return () => {
      mountedRef.current = false;
      socket.removeAllListeners();
      socket.disconnect();
      sockRef.current = null;
      connectAttemptedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /* ── session controls ── */
  const handleAgentChange = useCallback((agentId) => {
    if (!sockRef.current?.connected) return;
    setSelectedAgent(agentId);
    setShellActive(false);
    setSelectedShell('');
    setShells([]);
    promptRef.current = '';
    if (agentId) sockRef.current.emit('get_shells', agentId);
  }, []);

  const resolveGroupTargets = useCallback(() => {
    const targets = [];
    selectedGroups.forEach((gid) => {
      groups.find((g) => g.id === gid)?.devices?.forEach((d) => {
        if (agents.some((a) => a.agent_id === d.agent_id) && !targets.includes(d.agent_id)) targets.push(d.agent_id);
      });
    });
    return targets;
  }, [selectedGroups, groups, agents]);

  const startShell = useCallback(() => {
    const hasTarget = selectedAgent || selectedGroups.length > 0;
    if (!hasTarget || !selectedShell || shellActive || !sockRef.current?.connected || starting) return;
    setStarting(true);

    if (selectedGroups.length > 0) {
      const targets = resolveGroupTargets();
      if (!targets.length) {
        toast('No online agents found in selected groups', 'error');
        setStarting(false);
        return;
      }
      targets.forEach((id) => sockRef.current.emit('start_shell', { agent_id: id, shell: selectedShell }));
    } else {
      termRef.current?.clear();
      sockRef.current.emit('start_shell', { agent_id: selectedAgent, shell: selectedShell });
    }
  }, [selectedAgent, selectedGroups, selectedShell, shellActive, starting, resolveGroupTargets, toast]);

  const stopShell = useCallback(() => {
    const hasTarget = selectedAgent || selectedGroups.length > 0;
    if (!hasTarget || !shellActive || !sockRef.current?.connected || stopping) return;
    setStopping(true);
    if (selectedGroups.length > 0) {
      resolveGroupTargets().forEach((id) => sockRef.current.emit('stop_shell', { agent_id: id }));
    } else {
      sockRef.current.emit('stop_shell', { agent_id: selectedAgent });
    }
  }, [selectedAgent, selectedGroups, shellActive, stopping, resolveGroupTargets]);

  /* ── render ── */
  return (
    <div className="terminal-container" style={{ height }}>
      <div className="notification-container">
        {toasts.map(({ id, message, type, duration }) => (
          <Notification key={id} message={message} type={type} duration={duration} onClose={() => closeToast(id)} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="terminal-header">
        <div className="terminal-controls">
          <div className="control-group">
            <label>Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => handleAgentChange(e.target.value)}
              disabled={agents.length === 0 || !isConnected}
            >
              <option value="">
                {connecting ? 'Connecting…' : `Select agent (${agents.length} online)`}
              </option>
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>{a.hostname} ({a.agent_id})</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Shell</label>
            <select
              value={selectedShell}
              onChange={(e) => {
                const next = e.target.value;
                if (shellActive && next && next !== selectedShell) stopShell();
                setSelectedShell(next);
              }}
              disabled={shells.length === 0 || !isConnected}
            >
              <option value="">Select shell ({shells.length})</option>
              {shells.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="control-group">
            <label>&nbsp;</label>
            {shellActive ? (
              <button onClick={stopShell} disabled={!isConnected || stopping} className="btn-danger btn-stop">
                {stopping ? 'Stopping…' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={startShell}
                disabled={(!selectedAgent && selectedGroups.length === 0) || !selectedShell || !isConnected || starting}
                className="btn-primary btn-start"
              >
                {starting ? 'Starting…' : 'Start Shell'}
              </button>
            )}
          </div>

          <div className={`status-indicator ${isConnected ? 'ok' : 'bad'}`}>
            <span className="status-dot" />
            <span>{connecting ? 'connecting' : isConnected ? 'connected' : 'offline'}</span>
            {shellActive && <span className="session-chip">{agentName} · {fmtTime(sessionSecs)}</span>}
          </div>
        </div>

        {connectionError && <div className="error-message">⚠ {connectionError}</div>}
      </div>

      {/* Viewport */}
      <div className="terminal-wrapper">
        <div ref={hostRef} className="terminal" />
      </div>

      {/* Status bar */}
      <div className="terminal-statusbar">
        <span className={`sb-dot ${isConnected ? 'ok' : 'bad'}`} />
        <span>{isConnected ? 'live' : 'offline'}</span>
        <span className="sb-sep">│</span>
        <span className="sb-item">{agentName}</span>
        {shellActive && (
          <>
            <span className="sb-sep">│</span>
            <span className="sb-accent">{selectedShell} · {fmtTime(sessionSecs)}</span>
          </>
        )}
        <span className="sb-spacer" />
        <span className="sb-hint"><kbd>↑↓</kbd> history</span>
        <span className="sb-hint"><kbd>Tab</kbd> complete</span>
        <span className="sb-hint hidden-sm"><kbd>Ctrl+R</kbd> search</span>
        <span className="sb-hint hidden-sm"><kbd>Ctrl+L</kbd> clear</span>
      </div>
    </div>
  );
};

export default TerminalComponent;
