import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
// import logo from "@/assets/logo.png";
import DashboardLoginModal from "./LoginModal";
import VideoModal from "./VideoModal";

const logo = "/logo-with-title.png";

const NewNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        className={`transition-all duration-300 ${isScrolled ? "bg-background/90 backdrop-blur-lg shadow-lg" : "bg-transparent"
          }`}
      >
        <div className="container mx-auto pl-2 pr-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img src={logo} alt="Milkywayy Logo" className="h-10 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-sm font-medium hover:text-accent"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="text-sm font-medium hover:text-accent transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center space-x-4">

              <Link href="/booking">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse">
                  Book Now
                </Button>
              </Link>
              <Button
                onClick={() => setShowLoginModal(true)}
                variant="outline"
                className="border-border hover:bg-secondary"
              >
                Dashboard
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-foreground p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 space-y-4 border-t border-border pt-4 bg-background/90 backdrop-blur-lg shadow-lg">
              {navItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block text-sm font-medium hover:text-accent transition-colors"
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
                    className="block w-full text-left text-sm font-medium hover:text-accent transition-colors"
                  >
                    {item.label}
                  </button>
                )
              )}
              <div className="space-y-2 pt-2">
                <Link href="/booking" className="block" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Book Now
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    setShowLoginModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-border"
                  onClickCapture={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <DashboardLoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      <VideoModal open={showVideoModal} onOpenChange={setShowVideoModal} />
    </>
  );
};

export default NewNavbar;
