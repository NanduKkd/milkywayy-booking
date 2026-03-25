"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const AnnouncementBar = ({ onHeightChange }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const frameRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (frameRef.current) return;

      frameRef.current = window.requestAnimationFrame(() => {
        const progress = Math.min(window.scrollY / 50, 1);
        if (progress !== progressRef.current) {
          progressRef.current = progress;
          setScrollProgress(progress);
          onHeightChange?.(36 * (1 - progress));
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
  }, [onHeightChange]);

  return (
    <div 
      className="bg-secondary border-b border-border text-foreground text-center text-sm font-medium overflow-hidden transition-all duration-150"
      style={{
        height: `${36 * (1 - scrollProgress)}px`,
        opacity: 1 - scrollProgress,
        paddingTop: `${8 * (1 - scrollProgress)}px`,
        paddingBottom: `${8 * (1 - scrollProgress)}px`,
      }}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 px-4">
        <Sparkles className="w-4 h-4 hidden md:block text-muted-foreground" />
        <span className="text-muted-foreground">Launch Offer: <span className="font-bold text-foreground/70">Up to AED 500 off</span> your 1st shoot</span>
        <Sparkles className="w-4 h-4 hidden md:block text-muted-foreground" />
      </div>
    </div>
  );
};

export default AnnouncementBar;

