import AgentConsole from '@/components/AgentConsole';

export default function RunPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Run an agent.</h1>
          <p className="page__sub">
            Pick an agent, toggle its tools, hand it a goal. Watch it plan, call tools and
            return an answer — streamed live, entirely in your browser.
          </p>
        </div>
        <span className="page__badge mono">sandbox · live</span>
      </div>
      <AgentConsole />
    </div>
  );
}
