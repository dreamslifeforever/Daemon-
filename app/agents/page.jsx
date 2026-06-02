import Roster from '@/components/Roster';

export const metadata = {
  title: 'Roster — Daeman',
  description: 'Browse preset agents or assemble your own, then deploy it straight into the runner.',
};

export default function AgentsPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">The roster.</h1>
          <p className="page__sub">
            Six preset units, each with its own temperament and toolset. Or assemble a
            custom one and deploy it straight into the runner.
          </p>
        </div>
        <span className="page__badge mono">deploy → run</span>
      </div>
      <Roster />
    </div>
  );
}
