export default function LearnLayout({
  children,
  guide,
  faq,
  modal,
}: {
  children: React.ReactNode;
  guide: React.ReactNode;
  faq: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">{guide}</div>
          <div className="space-y-6">{faq}</div>
        </div>
      </section>
      {modal}
    </>
  );
}
