"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS } from "@/components/admin/adminNavConfig";
import { cn } from "@/lib/utils";

function isActivePath(pathname, href) {
  return href === "/admin" ? pathname === "/admin" : pathname?.startsWith(href);
}

export default function AdminSidebarNav({ mobile = false, onNavigate }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(mobile ? "space-y-4" : "space-y-1")}
    >
      {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
        <section key={group.id} className={cn(groupIndex > 0 && "mt-1")}>
          <p className="px-4 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            {group.label}
          </p>
          <div
            className={cn(
              mobile && "rounded-xl border border-zinc-800 bg-zinc-900 py-1",
            )}
          >
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors",
                    active
                      ? "bg-zinc-800 font-semibold text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r-full before:bg-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300",
                  )}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
