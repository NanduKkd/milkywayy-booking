'use client';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useState } from "react";
import Photography from "./our-work/Photography";
import ThreeSixty from "./our-work/ThreeSixty";
import ShortForm from "./our-work/ShortForm";
import LongForm from "./our-work/LongForm";

const OurWorkPreview = () => {
  const [activeCategory, setActiveCategory] = useState("Photography");

  const allWorkItems = [
    { type: "photo", title: "Marina Penthouse", category: "Photography" },
    { type: "photo", title: "Downtown Apartment", category: "Photography" },
    { type: "photo", title: "Creek Harbour View", category: "Photography" },
    { type: "photo", title: "DIFC Tower Suite", category: "Photography" },
    { type: "photo", title: "JLT Lakefront", category: "Photography" },
    { type: "photo", title: "Business Bay Duplex", category: "Photography" },
    { type: "360", title: "JBR Luxury Suite", category: "360°" },
    { type: "360", title: "Palm Beachfront Villa", category: "360°" },
    { type: "360", title: "Marina Walk Apartment", category: "360°" },
    { type: "360", title: "Downtown Penthouse", category: "360°" },
    { type: "360", title: "Dubai Hills Villa", category: "360°" },
    { type: "360", title: "City Walk Loft", category: "360°" },
    { type: "short-form", title: "Palm Villa Reel", category: "Short-form" },
    { type: "short-form", title: "Marina Lifestyle", category: "Short-form" },
    { type: "short-form", title: "Downtown Living", category: "Short-form" },
    { type: "short-form", title: "JBR Beach View", category: "Short-form" },
    { type: "short-form", title: "Business Bay Tour", category: "Short-form" },
    { type: "short-form", title: "Creek Harbour Sunset", category: "Short-form" },
    { type: "long-form", title: "Palm Villa Walkthrough", category: "Long-form" },
    { type: "long-form", title: "Emirates Hills Estate", category: "Long-form" },
    { type: "long-form", title: "Downtown Sky Collection", category: "Long-form" },
    { type: "long-form", title: "Bluewaters Penthouse", category: "Long-form" },
    { type: "long-form", title: "Dubai Marina Tower", category: "Long-form" },
    { type: "long-form", title: "Palm Jumeirah Villa", category: "Long-form" },
  ];

  const categories = ["Photography", "360°", "Short-form", "Long-form"];

  return (
    <section id="our-work" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 fade-in">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Our Work
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Explore our portfolio of stunning property visuals across Dubai.
          </p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 fade-in">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeCategory === category
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Work Components */}
        <div className={activeCategory === 'Photography' ? 'block' : 'hidden'}>
          <Photography items={allWorkItems.filter(i => i.category === 'Photography')} />
        </div>
        <div className={activeCategory === '360°' ? 'block' : 'hidden'}>
          <ThreeSixty items={allWorkItems.filter(i => i.category === '360°')} />
        </div>
        <div className={activeCategory === 'Short-form' ? 'block' : 'hidden'}>
          <ShortForm items={allWorkItems.filter(i => i.category === 'Short-form')} />
        </div>
        <div className={activeCategory === 'Long-form' ? 'block' : 'hidden'}>
          <LongForm items={allWorkItems.filter(i => i.category === 'Long-form')} />
        </div>

        {/* Load More button */}
        <div className="text-center">
          <Link href="/portfolio">
            <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Load More
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OurWorkPreview;