'use client';

import { useEffect, useRef, useState } from 'react';
import { buildSwarm, hashSeed } from '@/lib/engine';

const STAGES = ['queued', 'working', 'done'];

export default function Swarm() {
  const [goal, setGoal] = useState('Launch a token: pick a name, check the market, draft the announcement');
  const [size, setSize] = useState(4);
  const [lanes, setLanes] = useState([]);
  const [status, setStatus] = useState('idle');
  const timers = useRef([]);
  const abort = useRef(false);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { abort.current = true; clear(); }, []);

  const run = () => {
    abort.current = true; clear();
    const seed = hashSeed(goal + size + Date.now());
    const built = buildSwarm(goal, size, seed).map((l, i) => ({ ...l, id: i, progress: 0, stage: 0 }));
    setLanes(built);
    setStatus('running');
    abort.current = false;

    built.forEach((lane) => {
      const tick = lane.ms / (lane.steps * 10);
      let p = 0;
      const step = () => {
        if (abort.current) return;
        p += 100 / (lane.steps * 10);
        const stage = p >= 100 ? 2 : 1;
        setLanes((prev) => prev.map((l) => (l.id === lane.id ? { ...l, progress: Math.min(100, p), stage } : l)));
        if (p < 100) {
          const t = setTimeout(step, tick);
          timers.current.push(t);
        } else {
          checkDone();
        }
      };
      const t = setTimeout(step, 200 + lane.id * 120);
      timers.current.push(t);
    });
  };

  const checkDone = () => {
    setLanes((prev) => {
      if (prev.length && prev.every((l) => l.progress >= 100)) setStatus('done');
      return prev;
    });
  };

  const stop = () => { abort.current = true; clear(); setStatus('idle'); };
  const reset = () => { stop(); setLanes([]); };

  const overall = lanes.length ? Math.round(lanes.reduce((a, l) => a + l.progress, 0) / lanes.length) : 0;

  return (
    <div className="swarm">
      <div className="swarm__bar">
        <textarea
          className="task-input"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          placeholder="One goal for the whole swarm…"
          spellCheck={false}
        />
        <div className="swarm__ctrl">
          <div className="size-pick mono">
            {[3, 4, 5, 7].map((n) => (
              <button key={n} className={`size${size === n ? ' is-on' : ''}`} onClick={() => setSize(n)}>{n}</button>
            ))}
            <span className="size__lbl">agents</span>
          </div>
          {status === 'running'
            ? <button className="btn btn--stop" onClick={stop}>◼ stop</button>
            : <button className="btn" onClick={run}>⁂ dispatch</button>}
          <button className="btn btn--ghost" onClick={reset}>reset</button>
        </div>
      </div>

      {lanes.length > 0 && (
        <div className="swarm__overall mono">
          <span>swarm progress</span>
          <div className="obar"><i style={{ width: `${overall}%` }} /></div>
          <span>{overall}%</span>
        </div>
      )}

      <div className="lanes">
        {lanes.length === 0 && (
          <div className="trace__empty"><span className="blink">▍</span> dispatch a goal — the swarm splits it across agents and works in parallel.</div>
        )}
        {lanes.map((l) => (
          <div key={l.id} className={`lane lane--${STAGES[l.stage]}`}>
            <span className="lane__agent">{l.agent.glyph} {l.agent.name}</span>
            <span className="lane__task mono">{l.subtask}</span>
            <div className="lane__bar"><i style={{ width: `${l.progress}%` }} /></div>
            <span className={`lane__stage mono stage--${STAGES[l.stage]}`}>{STAGES[l.stage]}</span>
          </div>
        ))}
      </div>

      {status === 'done' && (
        <div className="swarm__result">
          <span className="tline__tag tline__tag--res">✓ merged</span>
          <span className="tline__txt">All {lanes.length} agents reported. Outputs reconciled into a single deliverable for: “{goal.slice(0, 70)}{goal.length > 70 ? '…' : ''}”.</span>
        </div>
      )}
    </div>
  );
}
