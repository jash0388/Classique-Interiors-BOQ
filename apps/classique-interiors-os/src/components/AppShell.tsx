"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: <Icon d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  file: <Icon d="M6 2h8l4 4v16H6zM14 2v4h4M9 12h6M9 16h6" />,
  users: (
    <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75" />
  ),
};

export default function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: ICONS.home },
    { href: "/boqs", label: "BOQs", icon: ICONS.file },
  ];
  if (user.role === "OWNER") {
    items.push({ href: "/boqs/trash", label: "Trash", icon: ICONS.file });
    items.push({ href: "/users", label: "Users", icon: ICONS.users });
  }

  const isActive = (href: string) => {
    if (href === "/boqs") return pathname === href || (pathname.startsWith("/boqs/") && pathname !== "/boqs/trash");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-teal-900 px-4 py-5 text-white md:flex">
        <div className="mb-8 flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">CI</span>
          <div>
            <p className="text-sm font-semibold leading-tight">Classique Interiors</p>
            <p className="text-xs text-teal-200">Operations</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                isActive(it.href) ? "bg-white/15 font-semibold" : "text-teal-100 hover:bg-white/10"
              }`}
            >
              {it.icon}
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3">
          <p className="px-3 text-sm font-medium">{user.name}</p>
          <p className="px-3 text-xs capitalize text-teal-200">{user.role.toLowerCase()}</p>
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-teal-100 hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between bg-teal-900 px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-bold">CI</span>
          <span className="text-sm font-semibold">Classique Interiors OS</span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded-lg px-2 py-1 text-xs text-teal-100 hover:bg-white/10">
            Sign out
          </button>
        </form>
      </header>

      <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-6 md:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white md:hidden">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive(it.href) ? "font-semibold text-teal-700" : "text-stone-500"
            }`}
          >
            {it.icon}
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
