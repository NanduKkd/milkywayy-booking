"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader, Divider } from "@heroui/react";

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/bookings">
          <Card className="hover:scale-105 transition-transform cursor-pointer">
            <CardHeader className="font-bold text-xl">Bookings</CardHeader>
            <Divider />
            <CardBody>
              <p>Manage all customer bookings.</p>
            </CardBody>
          </Card>
        </Link>

        {/* Add more admin links here */}
        <Link href="/admin/users">
          <Card className="hover:scale-105 transition-transform cursor-pointer">
            <CardHeader className="font-bold text-xl">Users</CardHeader>
            <Divider />
            <CardBody>
              <p>Manage users and customers.</p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/admin/invoices">
          <Card className="hover:scale-105 transition-transform cursor-pointer">
            <CardHeader className="font-bold text-xl">Invoices</CardHeader>
            <Divider />
            <CardBody>
              <p>View and manage invoices.</p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/admin/discounts">
          <Card className="hover:scale-105 transition-transform cursor-pointer">
            <CardHeader className="font-bold text-xl">Discounts</CardHeader>
            <Divider />
            <CardBody>
              <p>Manage discounts and offers.</p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/admin/coupons">
          <Card className="hover:scale-105 transition-transform cursor-pointer">
            <CardHeader className="font-bold text-xl">Coupons</CardHeader>
            <Divider />
            <CardBody>
              <p>Manage coupons and promo codes.</p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/admin/prices">
          <Card className="hover:scale-105 transition-transform cursor-pointer">
            <CardHeader className="font-bold text-xl">Pricing</CardHeader>
            <Divider />
            <CardBody>
              <p>Manage service pricing configuration.</p>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
