import Link from "next/link";

type SidebarItem = {
  label: string;
  href: string;
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
};

export default function ConceptsSidebar({
  sections,
  startHref,
}: {
  sections: SidebarSection[];
  startHref: string;
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Quick Nav</p>
      <h2 className="mt-2 text-lg font-black text-slate-900">Next Concepts</h2>
      <p className="mt-2 text-xs text-slate-500">
        Jump straight to any concept demo.
      </p>
      <div className="mt-4">
        <Link
          href={startHref}
          className="inline-flex rounded-lg bg-black px-3 py-2 text-[10px] font-semibold text-white"
        >
          Start here
        </Link>
      </div>
      <div className="mt-6 space-y-4 text-sm">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {section.title}
            </p>
            <ul className="mt-2 space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-slate-700 hover:text-black hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
