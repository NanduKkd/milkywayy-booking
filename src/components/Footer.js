"use client";

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border/30 bg-background">
      <div className="container mx-auto px-6 flex flex-col items-center text-center">
        <img src="/logo.png" alt="Milkywayy" className="h-8 mb-4" />

        <p className="text-sm text-muted-foreground">
          Don't Just List. Dominate.
        </p>

        <div className="w-full border-t border-border/40 mt-10 mb-6" />

        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Milkywayy LLC | All Rights Reserved
        </p>
      </div>
    </footer>
  );
};

export default Footer;

