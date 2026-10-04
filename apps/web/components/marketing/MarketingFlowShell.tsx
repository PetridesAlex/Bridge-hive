/** Continuous light hive-flow background for stacked marketing bands. */
export function MarketingFlowShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-flow-shell">
      <div
        className="m-flow-shell-media"
        aria-hidden="true"
        style={{ backgroundImage: "url('/marketing/flow-bg.jpg')" }}
      >
        <div className="m-flow-shell-wash" />
      </div>
      <div className="m-flow-shell-content">{children}</div>
    </div>
  );
}
