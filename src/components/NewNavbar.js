"use client";

import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";

const logo = "/logo.png";
const VideoModal = dynamic(() => import("./VideoModal"), {
  ssr: false,
});

const NewNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [pendingDashboardRedirect, setPendingDashboardRedirect] =
    useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { authState, login, logout } = useAuth();
  const isBookingPage = pathname === "/booking";
  const showBookingGreeting = isBookingPage && authState.isAuthenticated;
  const showLoginCta = isBookingPage && !authState.isAuthenticated;
  const userDisplay =
    authState.user?.fullName || authState.user?.email || "User";

  useEffect(() => {
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 20;
      setIsScrolled((prev) => (prev === nextScrolled ? prev : nextScrolled));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (pendingDashboardRedirect && authState.isAuthenticated) {
      router.push("/dashboard");
      setPendingDashboardRedirect(false);
    }
  }, [authState.isAuthenticated, pendingDashboardRedirect, router]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id) => {
    if (pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const handleDashboardClick = () => {
    if (authState.isAuthenticated) {
      router.push("/dashboard");
    } else {
      setPendingDashboardRedirect(true);
      login();
    }
  };

  const handlePrimaryCtaClick = () => {
    if (showLoginCta) {
      login();
      return;
    }

    router.push("/booking");
  };

  const navItems = [
    // { label: "Services", action: () => scrollToSection("services") },
    { label: "How it works", action: () => setShowVideoModal(true) },
    // { label: "Our Work", href: "/portfolio" },
    { label: "Our Work", action: () => scrollToSection("our-work") },
    { label: "Reviews", action: () => scrollToSection("reviews") },
    { label: "FAQ", action: () => scrollToSection("faq") },
    { label: "Contact", action: () => scrollToSection("contact") },
  ];

  return (
    <>
      <nav
        className={`transition-all duration-300 relative top-0 ${
          isScrolled ? "bg-background/92 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src={logo}
                alt="Milkywayy Logo"
                width={220}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <div className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) =>
                item.href
                  ? <Link
                      key={item.label}
                      href={item.href}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  : <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </button>,
              )}
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              {showBookingGreeting
                ? <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Hello
                    </p>
                    <p className="text-base font-semibold text-foreground max-w-[220px] truncate">
                      {userDisplay}
                    </p>
                  </div>
                : <Button
                    onClick={handlePrimaryCtaClick}
                    className="btn-primary-premium px-6 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                  >
                    {showLoginCta ? "Login" : "Book Now"}
                  </Button>}
              <Button
                onClick={handleDashboardClick}
                variant="outline"
                className="border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground hover:border-muted-foreground/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                Dashboard
              </Button>
              {showBookingGreeting && (
                <Button
                  onClick={logout}
                  variant="outline"
                  className="border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground hover:border-muted-foreground/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Logout
                </Button>
              )}
            </div>

            <button
              type="button"
              className="lg:hidden text-foreground p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="absolute inset-x-6 top-full z-50 mt-3 max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-border bg-background/90 p-4 shadow-2xl backdrop-blur-sm lg:hidden">
              <div className="space-y-4">
                {navItems.map((item) =>
                  item.href
                    ? <Link
                        key={item.label}
                        href={item.href}
                        className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    : <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          item.action?.();
                          if (item.label !== "How it works")
                            setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </button>,
                )}
                <div className="space-y-2 border-t border-border pt-3">
                  {showBookingGreeting
                    ? <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Hello
                        </p>
                        <p className="mt-1 text-base font-semibold text-foreground">
                          {userDisplay}
                        </p>
                      </div>
                    : <Button
                        onClick={() => {
                          handlePrimaryCtaClick();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full btn-primary-premium"
                      >
                        {showLoginCta ? "Login" : "Book Now"}
                      </Button>}
                  <Button
                    onClick={() => {
                      handleDashboardClick();
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full border-border text-muted-foreground hover:bg-secondary"
                  >
                    Dashboard
                  </Button>
                  {showBookingGreeting && (
                    <Button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full border-border text-muted-foreground hover:bg-secondary"
                    >
                      Logout
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {showVideoModal
        ? <VideoModal open={showVideoModal} onOpenChange={setShowVideoModal} />
        : null}
    </>
  );
};

export default NewNavbar;
