'use client';
import { Instagram, Linkedin, Youtube } from "lucide-react";
import Link from 'next/link';
const Footer = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  return <footer className="relative overflow-hidden border-t border-border py-12">
      {/* Video Background */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left: Logo + Tagline */}
          <div>
            <img src={'/logo-sm.png'} alt="Milkywayy Logo" className="h-10 w-auto mb-3 object-fill rounded-none" />
            <p className="text-sm text-muted-foreground">The Launchpad for Your Listings.</p>
          </div>

          {/* Center: Quick Links */}
          <div className="flex flex-col space-y-2">
            <h4 className="font-heading font-semibold mb-2">Quick Links</h4>
            <button onClick={() => scrollToSection("home")} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left">
              Home
            </button>
            <button onClick={() => scrollToSection("services")} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left">
              Services
            </button>
            <button onClick={() => scrollToSection("projects")} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left">
              Projects
            </button>
            <button onClick={() => scrollToSection("contact")} className="text-sm text-muted-foreground hover:text-accent transition-colors text-left">
              Contact
            </button>
          </div>

          {/* Right: Social Icons */}
          <div className="flex flex-col">
            <h4 className="font-heading font-semibold mb-2">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">
                <Youtube size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Milkywayy LLC | Designed by Milkywayy
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;
