"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  CalendarClock,
  FileText,
  FolderKanban,
  Home,
  Images,
  Receipt,
  Tags,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent },
  { href: "/admin/coupons", label: "Coupons", icon: Tags },
  { href: "/admin/timeslots", label: "Time Slots", icon: CalendarClock },
  { href: "/admin/prices", label: "Pricing", icon: FileText },
  { href: "/admin/portfolio", label: "Portfolio", icon: Images },
  { href: "/admin/reviews", label: "Reviews", icon: FolderKanban },
];

export default function AdminSidebarNav({ mobile = false }) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-1", mobile && "flex gap-2 overflow-x-auto pb-2")}>
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
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors whitespace-nowrap",
              mobile ? "shrink-0" : "",
              active
                ? "border-white/20 bg-white/10 text-white"
                : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
