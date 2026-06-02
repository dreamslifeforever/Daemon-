// engine.js — the in-browser agent simulation.
//
// No network, no API keys. Given a task string + an enabled toolset, it builds
// a believable step-by-step trace (plan → tool calls → observations → result)
// that an autonomous agent might produce. Output is seeded so a given task is
// reproducible, but varies between tasks.

// ---- deterministic RNG -------------------------------------------------

export function hashSeed(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ---- tools -------------------------------------------------------------

export const TOOLS = [
  { id: 'web', label: 'web.search', glyph: '◍', kw: ['search', 'find', 'who', 'what', 'latest', 'news', 'look up', 'research'] },
  { id: 'code', label: 'code.run', glyph: '⌘', kw: ['code', 'script', 'function', 'compute', 'algorithm', 'write a', 'program', 'parse'] },
  { id: 'market', label: 'market.feed', glyph: '$', kw: ['price', 'token', 'market', 'sol', 'chart', 'trade', 'crypto', 'cap'] },
  { id: 'memory', label: 'memory.recall', glyph: '❖', kw: ['remember', 'recall', 'earlier', 'history', 'context', 'before'] },
  { id: 'browser', label: 'browser.open', glyph: '⊞', kw: ['open', 'page', 'site', 'click', 'navigate', 'url', 'website'] },
  { id: 'files', label: 'files.read', glyph: '▤', kw: ['file', 'read', 'document', 'pdf', 'csv', 'data', 'report'] },
  { id: 'calc', label: 'calc.eval', glyph: '∑', kw: ['calculate', 'sum', 'average', 'math', 'percent', 'how many', 'total'] },
  { id: 'image', label: 'image.gen', glyph: '◐', kw: ['image', 'draw', 'picture', 'render', 'logo', 'design', 'art'] },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

// ---- agent presets -----------------------------------------------------

export const AGENTS = [
  { id: 'atlas', name: 'ATLAS', role: 'generalist', glyph: '△', temperament: 'methodical', tools: ['web', 'code', 'calc', 'memory'], blurb: 'Balanced operator. Plans first, verifies twice.' },
  { id: 'quill', name: 'QUILL', role: 'researcher', glyph: '✎', temperament: 'curious', tools: ['web', 'browser', 'files', 'memory'], blurb: 'Digs through sources and cites everything.' },
  { id: 'forge', name: 'FORGE', role: 'engineer', glyph: '⚙', temperament: 'precise', tools: ['code', 'files', 'calc'], blurb: 'Writes and runs code. Hates ambiguity.' },
  { id: 'vega', name: 'VEGA', role: 'analyst', glyph: '◇', temperament: 'sharp', tools: ['market', 'calc', 'web'], blurb: 'Reads markets and numbers. Fast and blunt.' },
  { id: 'nyx', name: 'NYX', role: 'creative', glyph: '✦', temperament: 'lateral', tools: ['image', 'web', 'memory'], blurb: 'Makes things. Thinks sideways.' },
  { id: 'echo', name: 'ECHO', role: 'minimalist', glyph: '○', temperament: 'terse', tools: ['web', 'calc'], blurb: 'Does the least to get it right.' },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a]));

export const SAMPLE_TASKS = [
  'Find the current price of SOL and tell me if it moved >5% today',
  'Write a function that reverses the words in a sentence',
  'Research who founded the Solana blockchain and summarize it',
  'Calculate a 15% tip on a $84.50 bill, split 3 ways',
  'Design a logo concept for an AI agent startup called Daemon',
  'Read the latest AI agent news and give me 3 headlines',
];

// ---- planning ----------------------------------------------------------

function detectTools(task, enabled) {
  const t = task.toLowerCase();
  const hits = [];
  for (const tool of TOOLS) {
    if (!enabled.includes(tool.id)) continue;
    if (tool.kw.some((k) => t.includes(k))) hits.push(tool.id);
  }
  return hits;
}

const THINKS = {
  open: [
    'Parsing the request and breaking it into steps.',
    'Got it. Let me figure out what this needs.',
    'Understood. Mapping this to a plan before I act.',
    'Reading the task. Deciding which tools apply.',
  ],
  web: ['I should look this up rather than guess.', 'Best to pull a fresh source for this.', 'Searching for authoritative results.'],
  code: ['This is mechanical — I will write a small program.', 'Cleaner to express this as code and run it.', 'Drafting a function for this.'],
  market: ['I need live numbers, querying the market feed.', 'Pulling current market data.', 'Checking the feed for fresh quotes.'],
  memory: ['Checking what I already know from earlier context.', 'Recalling relevant prior context.'],
  browser: ['Opening the page to read it directly.', 'Navigating to the source.'],
  files: ['Reading the document into context.', 'Loading the file to extract what matters.'],
  calc: ['Straightforward arithmetic — computing it.', 'Running the numbers.'],
  image: ['This is generative — sketching options.', 'Composing a visual concept.'],
  none: ['No tool needed — I can reason this out directly.', 'I can answer from what I already know.', 'This is reasoning-only; no external call.'],
};

const OBSERVE = {
  web: (r) => pick(r, [
    '5 results · top hit looks authoritative (relevance 0.94).',
    'Found 8 sources, 2 corroborate each other.',
    'Top result is a primary source — using it.',
  ]),
  code: (r) => pick(r, [
    'exit 0 · ran in 38ms · output matches expected.',
    'compiled + executed, no errors. result captured.',
    'tests pass (3/3). returning value.',
  ]),
  market: (r) => `SOL $${(120 + r() * 90).toFixed(2)} · 24h ${r() > 0.5 ? '+' : '-'}${(r() * 9).toFixed(2)}% · vol $${(0.8 + r() * 3).toFixed(1)}B`,
  memory: (r) => pick(r, ['recalled 2 relevant notes from this session.', 'no prior context — starting fresh.']),
  browser: (r) => pick(r, ['page loaded · 1,420 words extracted.', 'DOM parsed · pulled the main article body.']),
  files: (r) => pick(r, ['parsed 12 pages · 3 tables extracted.', 'read 240 rows · schema inferred.']),
  calc: (r) => `evaluated · result = ${(r() * 100).toFixed(2)}`,
  image: (r) => pick(r, ['rendered 3 candidates · returning the strongest.', 'generated concept · 1024×1024.']),
};

const RESULTS = [
  'Done. Here is the synthesized answer, grounded in the steps above.',
  'Finished. I cross-checked the result before returning it.',
  'Complete. Confidence is high — the sources and computation agree.',
  'Wrapped up. Final answer assembled from the tool outputs above.',
];

// Build a full run: array of steps. Each step:
//   { type: 'think'|'act'|'observe'|'result', tool?, glyph?, text, tokens, pause }
export function buildRun(task, enabledTools, agent, seed) {
  const r = rng(seed >>> 0);
  const steps = [];
  const cleanTask = (task || '').trim() || 'idle';

  const push = (type, text, extra = {}) =>
    steps.push({ type, text, tokens: 6 + Math.floor(text.length / 3) + Math.floor(r() * 14), pause: 240 + Math.floor(r() * 320), ...extra });

  push('think', pick(r, THINKS.open) + ` Objective: “${truncate(cleanTask, 80)}”.`);

  let chosen = detectTools(cleanTask, enabledTools);
  // ensure at least one action if any tool is enabled
  if (chosen.length === 0 && enabledTools.length) {
    chosen = [pick(r, enabledTools)];
  }
  // cap and lightly shuffle for variety
  chosen = dedupe(chosen).slice(0, 4);
  if (chosen.length > 1 && r() > 0.6) chosen.reverse();

  if (chosen.length === 0) {
    push('think', pick(r, THINKS.none));
  } else {
    push('think', `Plan: ${chosen.map((id) => TOOL_BY_ID[id].label).join(' → ')}.`);
    for (const id of chosen) {
      const tool = TOOL_BY_ID[id];
      push('think', pick(r, THINKS[id] || THINKS.open));
      push('act', `${tool.label}(${argFor(id, cleanTask, r)})`, { tool: id, glyph: tool.glyph });
      push('observe', (OBSERVE[id] || (() => 'ok'))(r), { tool: id });
    }
  }

  push('think', 'All steps returned. Composing the final response.');
  push('result', pick(r, RESULTS));
  return steps;
}

function argFor(id, task, r) {
  const words = task.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const q = words.slice(0, 4).join(' ') || 'query';
  switch (id) {
    case 'web': return `"${q}"`;
    case 'market': return 'symbol: SOL';
    case 'code': return 'lang: js, src: <generated>';
    case 'calc': return 'expr: <derived>';
    case 'browser': return 'url: top_result';
    case 'files': return 'path: ./input';
    case 'memory': return 'scope: session';
    case 'image': return `prompt: "${q}"`;
    default: return '';
  }
}

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function dedupe(a) { return [...new Set(a)]; }

// ---- swarm decomposition ----------------------------------------------

const SUBTASK_VERBS = ['scope', 'research', 'draft', 'verify', 'compute', 'synthesize', 'review', 'collect'];

export function buildSwarm(goal, size, seed) {
  const r = rng(seed >>> 0);
  const g = (goal || '').trim() || 'ship something';
  const lanes = [];
  const agents = [...AGENTS];
  for (let i = 0; i < size; i++) {
    const agent = agents[i % agents.length];
    const verb = SUBTASK_VERBS[(i + Math.floor(r() * 3)) % SUBTASK_VERBS.length];
    lanes.push({
      agent,
      subtask: `${verb} · ${truncate(g, 46)}`,
      steps: 2 + Math.floor(r() * 3),
      ms: 900 + Math.floor(r() * 2600),
    });
  }
  return lanes;
}
