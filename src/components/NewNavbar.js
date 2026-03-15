"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";
import VideoModal from "./VideoModal";

const logo = "/logo-with-title.png";

const NewNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [pendingDashboardRedirect, setPendingDashboardRedirect] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { authState, login } = useAuth();
  const frameRef = useRef(null);
  const isScrolledRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(() => {
        const nextScrolled = window.scrollY > 20;
        if (nextScrolled !== isScrolledRef.current) {
          isScrolledRef.current = nextScrolled;
          setIsScrolled(nextScrolled);
        }
        frameRef.current = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pendingDashboardRedirect && authState.isAuthenticated) {
      router.push("/dashboard");
      setPendingDashboardRedirect(false);
    }
  }, [authState.isAuthenticated, pendingDashboardRedirect, router]);

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

  const navItems = [
    { label: "Services", action: () => scrollToSection("services") },
    { label: "How it works", action: () => setShowVideoModal(true) },
    { label: "Our Work", href: "/portfolio" },
    { label: "Reviews", action: () => scrollToSection("reviews") },
    { label: "FAQ", action: () => scrollToSection("faq") },
    { label: "Contact", action: () => scrollToSection("contact") },
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/90 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src={logo}
                alt="Milkywayy Logo"
                width={220}
                height={40}
                className="h-8 md:h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                priority
              />
            </Link>

            <div className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              <Link href="/booking">
                <Button className="btn-primary-premium px-6 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                  Book Now
                </Button>
              </Link>
              <Button
                onClick={handleDashboardClick}
                variant="outline"
                className="border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground hover:border-muted-foreground/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                Dashboard
              </Button>
            </div>

            <button
              type="button"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="lg:hidden mt-3 rounded-2xl border border-white/10 bg-[#121212]/95 p-4 space-y-4">
              {navItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={() => {
                      item.action?.();
                      if (item.label !== "How it works") setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
              <div className="space-y-2 pt-1">
                <Link
                  href="/booking"
                  className="block"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full btn-primary-premium">
                    Book Now
                  </Button>
                </Link>
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
              </div>
            </div>
          )}
        </div>
      </nav>

      <VideoModal open={showVideoModal} onOpenChange={setShowVideoModal} />
    </>
  );
};

export default NewNavbar;
