'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGENTS, TOOLS } from '@/lib/engine';

const GLYPHS = ['△', '✎', '⚙', '◇', '✦', '○', '◐', '⬢', '✧', '◭'];

export default function Roster() {
  const router = useRouter();
  const [custom, setCustom] = useState([]);
  const [name, setName] = useState('');
  const [tools, setTools] = useState(['web', 'code']);
  const [temp, setTemp] = useState(50);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('daeman:custom');
      if (raw) setCustom(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next) => {
    setCustom(next);
    try { localStorage.setItem('daeman:custom', JSON.stringify(next)); } catch {}
  };

  const toggle = (id) =>
    setTools((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = () => {
    const nm = (name.trim() || 'UNIT').toUpperCase().slice(0, 12);
    const agent = {
      id: 'c_' + nm.toLowerCase() + '_' + custom.length,
      name: nm,
      role: temp > 66 ? 'maverick' : temp < 33 ? 'careful' : 'balanced',
      glyph: GLYPHS[(nm.charCodeAt(0) + custom.length) % GLYPHS.length],
      temperament: temp > 66 ? 'lateral' : temp < 33 ? 'methodical' : 'balanced',
      tools: tools.length ? tools : ['web'],
      blurb: 'Custom unit assembled in the roster.',
      custom: true,
    };
    persist([...custom, agent]);
    setName('');
    setFlash(`${nm} assembled ✓`);
    setTimeout(() => setFlash(''), 2200);
  };

  const remove = (id) => persist(custom.filter((a) => a.id !== id));

  const deploy = (a) => {
    try {
      localStorage.setItem('daeman:selected', JSON.stringify({ agentId: a.id, tools: a.tools }));
      // custom agents aren't in the engine registry; fall back to a base agent id
      if (a.custom) localStorage.setItem('daeman:selected', JSON.stringify({ agentId: 'atlas', tools: a.tools }));
    } catch {}
    router.push('/');
  };

  return (
    <div className="roster">
      <div className="roster__grid">
        {AGENTS.map((a) => (
          <article key={a.id} className="acard">
            <div className="acard__top">
              <span className="acard__glyph">{a.glyph}</span>
              <div>
                <h3>{a.name}</h3>
                <span className="acard__role mono">{a.role} · {a.temperament}</span>
              </div>
            </div>
            <p className="acard__blurb">{a.blurb}</p>
            <div className="acard__tools mono">
              {a.tools.map((t) => <span key={t} className="ttag">{t}</span>)}
            </div>
            <button className="btn btn--sm" onClick={() => deploy(a)}>deploy → run</button>
          </article>
        ))}

        {custom.map((a) => (
          <article key={a.id} className="acard acard--custom">
            <div className="acard__top">
              <span className="acard__glyph">{a.glyph}</span>
              <div>
                <h3>{a.name}</h3>
                <span className="acard__role mono">{a.role} · custom</span>
              </div>
              <button className="acard__x" onClick={() => remove(a.id)} aria-label="delete">×</button>
            </div>
            <p className="acard__blurb">{a.blurb}</p>
            <div className="acard__tools mono">
              {a.tools.map((t) => <span key={t} className="ttag">{t}</span>)}
            </div>
            <button className="btn btn--sm" onClick={() => deploy(a)}>deploy → run</button>
          </article>
        ))}
      </div>

      {/* forge */}
      <aside className="forge">
        <span className="forge__title mono">⊹ assemble a unit</span>
        <label className="forge__label">name</label>
        <input
          className="forge__name mono"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. RAVEN"
          maxLength={12}
        />

        <label className="forge__label">tools</label>
        <div className="forge__tools">
          {TOOLS.map((t) => (
            <button key={t.id} className={`tool-toggle${tools.includes(t.id) ? ' is-on' : ''}`} onClick={() => toggle(t.id)}>
              <span className="tg-glyph">{t.glyph}</span>{t.label}
            </button>
          ))}
        </div>

        <label className="forge__label">temperament <i className="mono">{temp < 33 ? 'methodical' : temp > 66 ? 'lateral' : 'balanced'}</i></label>
        <input type="range" min="0" max="100" value={temp} onChange={(e) => setTemp(+e.target.value)} className="forge__range" />

        <button className="btn forge__create" onClick={create}>assemble unit</button>
        {flash && <span className="forge__flash mono">{flash}</span>}
      </aside>
    </div>
  );
}
