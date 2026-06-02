'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Run', glyph: '▶' },
  { href: '/agents', label: 'Roster', glyph: '◇' },
  { href: '/swarm', label: 'Swarm', glyph: '⁂' },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand__mark" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="9" className="bm-ring" />
            <circle cx="12" cy="12" r="3.4" className="bm-core" />
            <path d="M12 3 V7 M12 17 V21 M3 12 H7 M17 12 H21" className="bm-tick" />
          </svg>
        </span>
        <span className="brand__word">daemon</span>
        <span className="brand__ver mono">v0.1</span>
      </Link>

      <nav className="seg">
        {TABS.map((t) => {
          const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`seg__tab${active ? ' is-on' : ''}`}>
              <span className="seg__glyph">{t.glyph}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>

      <a href="https://x.com/daemonagent" target="_blank" rel="noreferrer" className="topbar__x" aria-label="Daemon on X">
        <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
      </a>
    </header>
  );
}
