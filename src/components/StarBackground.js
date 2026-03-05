"use client";

import { useEffect, useRef } from "react";

export default function StarBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const stars = [];
    const numStars = 250; // Increased number of stars for better effect

    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.5 + 0.5, // Radius between 0.5 and 3.0
        speed: Math.random() * 0.5 + 0.1, // Speed between 0.1 and 0.6
        angle: -Math.PI / 2 + (Math.random() * 0.8 - 0.4), // More angle variance
        opacity: Math.random() * 0.5 + 0.3, // Higher opacity for better visibility
        twinkleSpeed: Math.random() * 0.03 + 0.01, // Twinkling speed
        twinklePhase: Math.random() * Math.PI * 2, // Random starting phase for twinkling
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        // Add twinkling effect
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.4 + 0.6; // Oscillate between 0.2 and 1.0
        const currentOpacity = star.opacity * twinkle;
        
        // Create gradient for more realistic stars
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.radius * 2
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${currentOpacity * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Update position
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;

        // Reset if out of bounds (top)
        if (star.y < -20) {
          star.y = canvas.height + 20;
          star.x = Math.random() * canvas.width;
          // Reset other properties for variety
          star.speed = Math.random() * 0.5 + 0.1;
          star.angle = -Math.PI / 2 + (Math.random() * 0.8 - 0.4);
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ 
        background: "transparent",
        zIndex: 0
      }}
    />
  );
}
