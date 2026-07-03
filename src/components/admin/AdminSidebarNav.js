"use client";

import {
  CalendarClock,
  CalendarDays,
  FileText,
  FolderKanban,
  Home,
  Images,
  LineChart,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/analytics", label: "Reports", icon: LineChart },
  { href: "/admin/promotions", label: "Promotions", icon: Sparkles },
  { href: "/admin/scheduling-calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/timeslots", label: "Time Slots", icon: CalendarClock },
  { href: "/admin/prices", label: "Pricing", icon: FileText },
  { href: "/admin/portfolio", label: "Portfolio", icon: Images },
  { href: "/admin/reviews", label: "Reviews", icon: FolderKanban },
];

export default function AdminSidebarNav({ mobile = false }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "space-y-1.5",
        mobile &&
          "admin-panel-subtle flex gap-2 overflow-x-auto rounded-[1.6rem] px-3 py-3 space-y-0",
      )}
    >
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition-all whitespace-nowrap",
              mobile ? "shrink-0" : "",
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
    </nav>
  );
}
