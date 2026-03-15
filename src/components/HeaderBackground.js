"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function HeaderBackground({ children, className, ...props }) {
  const [isScrolled, setIsScrolled] = useState(false);
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

    // Check initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <nav
      className={cn(
        "transition-all duration-300",
        isScrolled
          ? "bg-background/90 backdrop-blur-lg shadow-lg"
          : "bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </nav>
  );
}
