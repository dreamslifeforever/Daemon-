'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  TOOLS, AGENTS, AGENT_BY_ID, SAMPLE_TASKS, buildRun, hashSeed,
} from '@/lib/engine';

const TYPE_SPEED = 9; // ms per chunk

export default function AgentConsole() {
  const [agentId, setAgentId] = useState('atlas');
  const [task, setTask] = useState(SAMPLE_TASKS[0]);
  const [enabled, setEnabled] = useState(AGENT_BY_ID.atlas.tools);
  const [lines, setLines] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | running | done
  const [runs, setRuns] = useState(0);

  const abort = useRef(false);
  const timers = useRef([]);
  const logRef = useRef(null);

  // hydrate a preset chosen on the Roster page (localStorage handoff)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('daeman:selected');
      if (raw) {
        const sel = JSON.parse(raw);
        if (sel.agentId && AGENT_BY_ID[sel.agentId]) setAgentId(sel.agentId);
        if (Array.isArray(sel.tools)) setEnabled(sel.tools);
        localStorage.removeItem('daeman:selected');
      }
    } catch {}
  }, []);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { abort.current = true; clearTimers(); }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const selectAgent = (id) => {
    setAgentId(id);
    setEnabled(AGENT_BY_ID[id].tools);
  };

  const toggleTool = (id) => {
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const stop = useCallback(() => {
    abort.current = true;
    clearTimers();
    setStatus((s) => (s === 'running' ? 'idle' : s));
  }, []);

  const reset = () => { stop(); setLines([]); setStatus('idle'); };

  const run = () => {
    abort.current = true; clearTimers();
    setLines([]);
    const agent = AGENT_BY_ID[agentId];
    const seed = hashSeed(task + '|' + enabled.join(',') + '|' + Date.now());
    const plan = buildRun(task, enabled, agent, seed);
    setStatus('running');
    setRuns((n) => n + 1);
    abort.current = false;
    stream(plan, 0);
  };

  function stream(plan, i) {
    if (abort.current) return;
    if (i >= plan.length) { setStatus('done'); return;}
    const step = plan[i];
    setLines((prev) => [...prev, { ...step, shown: '' }]);
    typeOut(step.text, 0, () => {
      const t = setTimeout(() => stream(plan, i + 1), step.pause);
      timers.current.push(t);
    });
  }

  function typeOut(full, ci, done) {
    if (abort.current) return;
    if (ci >= full.length) {
      setLines((prev) => mutateLast(prev, (l) => ({ ...l, shown: full, typing: false })));
      done();
      return;
    }
    const next = ci + (full.length > 120 ? 3 : 2);
    setLines((prev) => mutateLast(prev, (l) => ({ ...l, shown: full.slice(0, next), typing: true })));
    const t = setTimeout(() => typeOut(full, next, done), TYPE_SPEED);
    timers.current.push(t);
  }

  const agent = AGENT_BY_ID[agentId];
  const toolCalls = lines.filter((l) => l.type === 'act').length;
  const tokens = lines.reduce((a, l) => a + Math.round((l.tokens || 0) * (l.shown.length / Math.max(1, l.text.length))), 0);

  return (
    <div className="console">
      {/* control rail */}
      <aside className="console__rail">
        <div className="rail__block">
          <span className="rail__label">agent</span>
          <div className="agent-pick">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                className={`agent-chip${agentId === a.id ? ' is-on' : ''}`}
                onClick={() => selectAgent(a.id)}
                title={a.blurb}
              >
                <span className="agent-chip__glyph">{a.glyph}</span>
                <span>{a.name}</span>
              </button>
            ))}
          </div>
          <p className="agent-blurb">{agent.glyph} <b>{agent.name}</b> · {agent.role}<br />{agent.blurb}</p>
        </div>

        <div className="rail__block">
          <span className="rail__label">tools <i>{enabled.length}/{TOOLS.length}</i></span>
          <div className="tool-grid">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className={`tool-toggle${enabled.includes(t.id) ? ' is-on' : ''}`}
                onClick={() => toggleTool(t.id)}
              >
                <span className="tg-glyph">{t.glyph}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="console__main">
        <div className="task-bar">
          <textarea
            className="task-input"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Give the agent a goal…"
            rows={2}
            spellCheck={false}
          />
          <div className="task-actions">
            {status === 'running' ? (
              <button className="btn btn--stop" onClick={stop}>◼ stop</button>
            ) : (
              <button className="btn" onClick={run}>▶ run</button>
            )}
            <button className="btn btn--ghost" onClick={reset}>reset</button>
          </div>
        </div>

        <div className="task-samples">
          {SAMPLE_TASKS.map((s) => (
            <button key={s} className="sample" onClick={() => setTask(s)}>{s}</button>
          ))}
        </div>

        <div className="trace" ref={logRef}>
          {lines.length === 0 && (
            <div className="trace__empty">
              <span className="blink">▍</span> waiting for a goal — pick an agent, toggle tools, hit <b>run</b>.
            </div>
          )}
          {lines.map((l, i) => (
            <Line key={i} line={l} />
          ))}
          {status === 'done' && <div className="trace__done">— run complete · {toolCalls} tool calls · {tokens} tokens —</div>}
        </div>

        <div className="hud mono">
          <span className={`hud__dot hud__dot--${status}`} />
          <span>{status}</span>
          <span className="hud__sep" />
          <span>steps <b>{lines.length}</b></span>
          <span>tools <b>{toolCalls}</b></span>
          <span>tokens <b>{tokens}</b></span>
          <span>runs <b>{runs}</b></span>
        </div>
      </div>
    </div>
  );
}

function Line({ line }) {
  const cls = `tline tline--${line.type}`;
  if (line.type === 'act') {
    return (
      <div className={cls}>
        <span className="tline__tag">{line.glyph} call</span>
        <code className="tline__code">{line.shown}{line.typing && <span className="caret">▍</span>}</code>
      </div>
    );
  }
  if (line.type === 'observe') {
    return (
      <div className={cls}>
        <span className="tline__tag tline__tag--obs">↳ obs</span>
        <span className="tline__txt">{line.shown}{line.typing && <span className="caret">▍</span>}</span>
      </div>
    );
  }
  if (line.type === 'result') {
    return (
      <div className={cls}>
        <span className="tline__tag tline__tag--res">✓ result</span>
        <span className="tline__txt">{line.shown}{line.typing && <span className="caret">▍</span>}</span>
      </div>
    );
  }
  return (
    <div className={cls}>
      <span className="tline__tag tline__tag--think">· think</span>
      <span className="tline__txt">{line.shown}{line.typing && <span className="caret">▍</span>}</span>
    </div>
  );
}

function mutateLast(arr, fn) {
  if (arr.length === 0) return arr;
  const cp = arr.slice();
  cp[cp.length - 1] = fn(cp[cp.length - 1]);
  return cp;
}
