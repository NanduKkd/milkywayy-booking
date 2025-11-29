import { useEffect, useState } from "react";
// import logo from "@/assets/logo.png";

const Preloader = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
    {/* <img src={logo} alt="Milkywayy Logo" className="h-24 w-auto" /> */}
          </div>
    {/* <img src={logo} alt="Milkywayy Logo" className="h-24 w-auto animate-pulse" /> */}
        </div>
        <p className="font-heading text-xl md:text-2xl font-bold text-foreground animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
          THE LAUNCHPAD FOR YOUR LISTING.
        </p>
      </div>
    </div>
  );
};

export default Preloader;

