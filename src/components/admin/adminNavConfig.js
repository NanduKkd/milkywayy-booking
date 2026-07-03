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

export const ADMIN_NAV_GROUPS = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/admin", label: "Dashboard", icon: Home },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarClock },
      {
        href: "/admin/scheduling-calendar",
        label: "Calendar",
        icon: CalendarDays,
      },
      { href: "/admin/users", label: "Customers", icon: Users },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "/admin/invoices", label: "Invoices", icon: Receipt },
      { href: "/admin/analytics", label: "Reports", icon: LineChart },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { href: "/admin/promotions", label: "Promotions", icon: Sparkles },
      { href: "/admin/timeslots", label: "Time Slots", icon: CalendarClock },
      { href: "/admin/prices", label: "Pricing", icon: FileText },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/portfolio", label: "Portfolio", icon: Images },
      { href: "/admin/reviews", label: "Reviews", icon: FolderKanban },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
