"use client";

import { Calendar, Folder, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CustomerHeader from "@/components/CustomerHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarBackground from "@/components/StarBackground";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    {
      key: "/dashboard/bookings",
      title: "Bookings",
      icon: <Calendar size={16} />,
      href: "/dashboard/bookings",
    },
    {
      key: "/dashboard/files",
      title: "Files",
      icon: <Folder size={16} />,
      href: "/dashboard/files",
    },
    // Wallet tab intentionally hidden for now.
    // {
    //   key: "/dashboard/wallet",
    //   title: "Wallet",
    //   icon: <Wallet size={16} />,
    //   href: "/dashboard/wallet",
    // },
    {
      key: "/dashboard/invoices",
      title: "Invoices",
      icon: <Receipt size={16} />,
      href: "/dashboard/invoices",
    },
  ];

  // Find the active tab based on the current path
  const currentTab =
    tabs.find((tab) => pathname.startsWith(tab.key))?.key || tabs[0].key;

  return (
    <div className="min-h-screen bg-background text-white">
      <StarBackground />
      <CustomerHeader />
      <main className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-24 md:pt-28">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 text-foreground font-heading">
            My Dashboard
          </h1>

          <Tabs value={currentTab} className="mb-8 w-full">
            <TabsList className="bg-secondary w-full p-1 rounded-lg gap-1 h-auto flex text-muted-foreground text-sm">
              {tabs.map((item) => (
                <TabsTrigger
                  key={item.key}
                  value={item.key}
                  asChild
                  className="py-1.5 px-4 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-colors rounded-lg flex items-center gap-2 flex-1 justify-center text-center"
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
        </div>
      </main>
    </div>
  );
}
