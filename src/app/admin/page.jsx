"use client";

import Link from "next/link";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminPrimitives";
import { Separator } from "@/components/ui/separator";

export default function AdminDashboard() {
  const links = [
    {
      href: "/admin/bookings",
      title: "Bookings",
      description: "Manage all customer bookings.",
    },
    {
      href: "/admin/users",
      title: "Customers",
      description: "Manage current customer accounts and records.",
    },
    {
      href: "/admin/invoices",
      title: "Invoices",
      description: "View and manage invoices.",
    },
    {
      href: "/admin/analytics",
      title: "Reports",
      description:
        "Track live revenue, expenses, profit, and monthly comparisons.",
    },
    {
      href: "/admin/promotions",
      title: "Promotions",
      description: "Manage generic, personal, and automatic promotions.",
    },
    {
      href: "/admin/scheduling-calendar",
      title: "Calendar",
      description:
        "Monitor live bookings, events, and schedule blocks in one view.",
    },
    {
      href: "/admin/timeslots",
      title: "Time Slots",
      description: "Manage booking time slots and availability.",
    },
    {
      href: "/admin/prices",
      title: "Pricing",
      description: "Manage service pricing configuration.",
    },
    {
      href: "/admin/portfolio",
      title: "Portfolio",
      description: "Manage 'Our Works' portfolio items.",
    },
    {
      href: "/admin/reviews",
      title: "Reviews",
      description: "Manage landing page testimonial reviews.",
    },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations"
        title="Admin Dashboard"
        description="Shared admin tokens are now centralized for headers, cards, filters, tables, badges, dialogs, and async states. The page links below stay as the current route inventory until the live dashboard migration lands."
        actions={<AdminBadge tone="info">Shared Foundation</AdminBadge>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <AdminCard className="h-full transition-transform duration-200 hover:-translate-y-1">
              <AdminCardHeader>
                <AdminCardTitle className="text-lg">
                  {item.title}
                </AdminCardTitle>
                <AdminCardDescription>
                  Current route destination
                </AdminCardDescription>
              </AdminCardHeader>
              <Separator className="admin-divider" />
              <AdminCardContent className="pt-4 text-sm text-[hsl(var(--admin-muted))]">
                <p>{item.description}</p>
              </AdminCardContent>
            </AdminCard>
          </Link>
        ))}

        {/* Keep these links explicit and discoverable in the same UI block */}
        <Link href="/admin/login">
          <AdminCard
            tone="muted"
            className="h-full border-dashed transition-transform duration-200 hover:-translate-y-1"
          >
            <AdminCardHeader>
              <AdminCardTitle>Admin Login</AdminCardTitle>
              <AdminCardDescription>Shared shell excluded</AdminCardDescription>
            </AdminCardHeader>
            <Separator className="admin-divider" />
            <AdminCardContent className="pt-4 text-sm text-[hsl(var(--admin-muted))]">
              <p>Access the admin authentication view.</p>
            </AdminCardContent>
          </AdminCard>
        </Link>
      </div>
    </AdminPage>
  );
}
