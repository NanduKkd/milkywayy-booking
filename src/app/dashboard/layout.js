"use client";

import CustomerHeader from "@/components/CustomerHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Wallet, Receipt } from "lucide-react";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { key: "/dashboard/bookings", title: "Bookings", icon: <Calendar size={18} />, href: "/dashboard/bookings" },
    { key: "/dashboard/wallet", title: "Wallet", icon: <Wallet size={18} />, href: "/dashboard/wallet" },
    { key: "/dashboard/invoices", title: "Invoices", icon: <Receipt size={18} />, href: "/dashboard/invoices" },
  ];

  // Find the active tab based on the current path
  const currentTab = tabs.find((tab) => pathname.startsWith(tab.key))?.key || tabs[0].key;

  return (
    <div className="min-h-screen bg-black text-white">
      <CustomerHeader />
      <main className="container mx-auto px-4 pb-8 pt-30 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8 text-white">My Dashboard</h1>

        <Tabs
          value={currentTab}
          className="mb-8 w-full"
        >
          <TabsList className="bg-zinc-900/50 w-full p-1 rounded-lg gap-1 border border-white/10 h-auto justify-start">
            {tabs.map((item) => (
              <TabsTrigger
                key={item.key}
                value={item.key}
                asChild
                className="h-10 px-4 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 hover:bg-white/5 transition-colors flex items-center gap-2 justify-start"
              >
                <Link href={item.href}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {children}
      </main>
    </div>
  );
}
