"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      title: "Users",
      description: "Manage users and customers.",
    },
    {
      href: "/admin/invoices",
      title: "Invoices",
      description: "View and manage invoices.",
    },
    {
      href: "/admin/promotions",
      title: "Promotions",
      description: "Manage generic, personal, and automatic promotions.",
    },
    {
      href: "/admin/timeslots",
      title: "Time Slots",
      description: "Manage booking time slots and availability.",
    },
    {
      href: "/admin/coupons",
      title: "Coupons",
      description: "Manage coupons and promo codes.",
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
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Operations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Admin Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full rounded-2xl border-white/10 bg-card/70 transition-colors hover:border-white/20 hover:bg-card">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <Separator className="bg-white/10" />
              <CardContent className="pt-4 text-sm text-muted-foreground">
                <p>{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Keep these links explicit and discoverable in the same UI block */}
        <Link href="/admin/login">
          <Card className="h-full rounded-2xl border-dashed border-white/15 bg-card/50 transition-colors hover:border-white/30 hover:bg-card/70">
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <Separator className="bg-white/10" />
            <CardContent className="pt-4 text-sm text-muted-foreground">
              <p>Access the admin authentication view.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
