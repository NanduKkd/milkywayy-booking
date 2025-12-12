'use client';
import { Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

const AnnouncementBar = ({ onHeightChange }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / 50, 1);
      setScrollProgress(progress);
      onHeightChange?.(36 * (1 - progress)); // 36px is approximate bar height
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onHeightChange]);

  return (
    <div 
      className="text-center text-sm font-medium overflow-hidden transition-all duration-150 bg-gray-300 text-black"
      style={{
        height: `${36 * (1 - scrollProgress)}px`,
        opacity: 1 - scrollProgress,
        paddingTop: `${8 * (1 - scrollProgress)}px`,
        paddingBottom: `${8 * (1 - scrollProgress)}px`,
      }}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 px-4">
        <Sparkles className="w-4 h-4" />
        <span>🚀 Launch Offer: Flat 50% off your first property shoot</span>
        <Sparkles className="w-4 h-4" />
      </div>
    </div>
  );
};

export default AnnouncementBar;
