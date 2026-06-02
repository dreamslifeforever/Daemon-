import Swarm from '@/components/Swarm';

export const metadata = {
  title: 'Swarm — Daemon',
  description: 'Hand one goal to many agents. Watch the swarm split it up and work in parallel.',
};

export default function SwarmPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Run a swarm.</h1>
          <p className="page__sub">
            One goal, many agents. The swarm decomposes the objective, fans it out across
            units working in parallel, and reconciles their outputs into one result.
          </p>
        </div>
        <span className="page__badge mono">parallel · live</span>
      </div>
      <Swarm />
    </div>
  );
}
