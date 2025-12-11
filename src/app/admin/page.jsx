"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/bookings">
          <Card className="hover:scale-105 transition-transform cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p>Manage all customer bookings.</p>
            </CardContent>
          </Card>
        </Link>

        {/* Add more admin links here */}
        <Link href="/admin/users">
          <Card className="hover:scale-105 transition-transform cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p>Manage users and customers.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/invoices">
          <Card className="hover:scale-105 transition-transform cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p>View and manage invoices.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/discounts">
          <Card className="hover:scale-105 transition-transform cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Discounts</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p>Manage discounts and offers.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/coupons">
          <Card className="hover:scale-105 transition-transform cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Coupons</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p>Manage coupons and promo codes.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/prices">
          <Card className="hover:scale-105 transition-transform cursor-pointer h-full">
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p>Manage service pricing configuration.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
