"use client";

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border/30 bg-background">
      <div className="container mx-auto px-6 flex flex-col items-center text-center">
        {/* Logo */}
        <img
          src="/logo-with-title.png"
          alt="Milkywayy"
          className="h-8 w-auto mb-4"
        />

        {/* Tagline */}
        <p className="text-sm text-muted-foreground">
          Don&apos;t Just List. Dominate.
        </p>

        {/* Divider */}
        <div className="w-full border-t border-border/40 mt-10 mb-6" />

        {/* Copyright */}
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Milkywayy LLC | All Rights Reserved
        </p>
      </div>
    </footer>
  );
};

export default Footer;
