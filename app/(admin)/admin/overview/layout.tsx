export default function OverviewLayout({
  children,
  stats,
  activity,
  alerts,
  modal,
}: {
  children: React.ReactNode;
  stats: React.ReactNode;
  activity: React.ReactNode;
  alerts: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {stats}
            {activity}
          </div>
          <div className="space-y-6">{alerts}</div>
        </div>
      </section>
      {modal}
    </>
  );
}
