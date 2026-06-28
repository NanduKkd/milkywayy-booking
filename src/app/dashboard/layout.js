"use client";

import { Calendar, Folder, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import CustomerHeader from "@/components/CustomerHeader";
import DashboardAccessGate from "@/components/DashboardAccessGate";
import StarBackground from "@/components/StarBackground";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/contexts/auth";
import {
  buildDashboardAccessHref,
  getDashboardReturnPath,
  isDashboardRootPath,
} from "@/lib/helpers/dashboardAuth";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authState } = useAuth();
  const isAuthenticated = authState.isAuthenticated;
  const username = authState.user?.fullName || authState.user?.email || "User";
  const search = searchParams.toString();
  const currentPath = getDashboardReturnPath(
    pathname,
    search ? `?${search}` : "",
  );
  const isDashboardRoot = isDashboardRootPath(pathname);

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

  useEffect(() => {
    if (isAuthenticated || isDashboardRoot) {
      return;
    }

    router.replace(buildDashboardAccessHref(currentPath));
  }, [currentPath, isAuthenticated, isDashboardRoot, router]);

  return (
    <div className="min-h-screen bg-background text-white">
      <StarBackground />
      <CustomerHeader mode="dashboard" />
      <main className="relative mx-auto w-full max-w-7xl px-6 pb-10 pt-12 md:pt-16">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
            My Dashboard
          </h1>
          {isAuthenticated
            ? <>
                <p className="text-sm md:text-base text-muted-foreground mt-2 mb-8">
                  Hello, {username}
                </p>

                <Tabs value={currentTab} className="mb-8 w-full">
                  <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl border border-border bg-secondary p-1 text-sm">
                    {tabs.map((item) => (
                      <TabsTrigger
                        key={item.key}
                        value={item.key}
                        asChild
                        className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-center text-muted-foreground transition-colors data-[state=active]:bg-muted data-[state=active]:text-foreground"
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
              </>
            : isDashboardRoot
              ? children
              : <DashboardAccessGate
                  nextPath={currentPath}
                  openOnMount={false}
                />}
        </div>
      </main>
    </div>
  );
}
