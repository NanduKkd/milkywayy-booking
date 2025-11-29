"use client";

import CustomerHeader from "@/components/CustomerHeader";
import { Tabs, Tab } from "@heroui/react";
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
          aria-label="Dashboard Navigation"
          selectedKey={currentTab}
          className="mb-8 w-full"
          classNames={{
            tabList: "bg-zinc-900/50 w-full p-1 rounded-lg gap-1 border border-white/10",
            cursor: "bg-zinc-800 rounded-md shadow-sm border border-white/10",
            tab: "h-10 px-4 data-[hover=true]:bg-white/5 rounded-md transition-colors",
            tabContent: "text-zinc-400 group-data-[selected=true]:text-white font-medium flex items-center gap-2",
          }}
          size="lg"
        >
          {tabs.map((item) => (
            <Tab
              key={item.key}
              title={
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
              }
              href={item.href}
              as={Link}
            />
          ))}
        </Tabs>

        {children}
      </main>
    </div>
  );
}
