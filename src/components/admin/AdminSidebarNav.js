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
      className={cn("space-y-5", mobile ? "space-y-6" : "space-y-5")}
    >
      {ADMIN_NAV_GROUPS.map((group) => (
        <section key={group.id} className="space-y-2.5">
          <p className="admin-kicker px-1">{group.label}</p>
          <div
            className={cn(
              "space-y-1.5",
              mobile && "admin-panel-subtle rounded-[1.6rem] px-2.5 py-2.5",
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
                    "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition-all",
                    active
                      ? "border-[hsl(var(--admin-highlight)/0.36)] bg-[hsl(var(--admin-highlight)/0.12)] text-[hsl(var(--admin-foreground))] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]"
                      : "border-transparent text-[hsl(var(--admin-muted))] hover:border-[hsl(var(--admin-border-strong)/0.92)] hover:bg-[hsl(var(--admin-surface-soft)/0.34)] hover:text-[hsl(var(--admin-foreground))]",
                  )}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/6 bg-white/[0.03]">
                    <Icon size={16} />
                  </span>
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
