/*
// import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import DashboardLoginModal from "./DashboardLoginModal";

const Link = () => {}

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/70 backdrop-blur-lg shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <img src={logo} alt="Milkywayy Logo" className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>

          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection("services")} className="text-sm font-medium hover:text-accent transition-colors">
              Services
            </button>
            <button onClick={() => scrollToSection("projects")} className="text-sm font-medium hover:text-accent transition-colors">
              Our Work
            </button>
            <button onClick={() => scrollToSection("contact")} className="text-sm font-medium hover:text-accent transition-colors">
              Contact
            </button>
            <div className="flex items-center space-x-4">
              <Link to="/booking">
                <Button
                  variant="default"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse"
                >
                  Book Now
                </Button>
              </Link>
              <Button
                onClick={() => setShowLoginModal(true)}
                variant="outline"
                className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
              >
                Dashboard
              </Button>
            </div>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 border-t border-border pt-4">
            <button onClick={() => scrollToSection("services")} className="block w-full text-left text-sm font-medium hover:text-accent transition-colors">
              Services
            </button>
            <button onClick={() => scrollToSection("projects")} className="block w-full text-left text-sm font-medium hover:text-accent transition-colors">
              Our Work
            </button>
            <button onClick={() => scrollToSection("contact")} className="block w-full text-left text-sm font-medium hover:text-accent transition-colors">
              Contact
            </button>
            <Link to="/booking" className="block">
              <Button
                variant="default"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Book Now
              </Button>
            </Link>
            <Button
              onClick={() => setShowLoginModal(true)}
              variant="outline"
              className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Dashboard
            </Button>
          </div>
        )}
      </div>
      </nav>
      <DashboardLoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  );
};

export default Navbar;
*/
