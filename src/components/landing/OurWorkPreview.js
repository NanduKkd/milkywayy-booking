"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import { isTouchDevice } from "@/lib/helpers/ui";
import MediaRenderer from "../portfolio/MediaRenderer";

const OurWorkPreview = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(OUR_WORK_TYPES.IMAGE);
  const [isTouch, setIsTouch] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showInteractive360, setShowInteractive360] = useState(false);

  const categories = [
    { label: "Photography", value: OUR_WORK_TYPES.IMAGE },
    { label: "360°", value: OUR_WORK_TYPES.THREE_SIXTY },
    { label: "Short-form", value: OUR_WORK_TYPES.SHORT_VIDEO },
    { label: "Long-form", value: OUR_WORK_TYPES.VIDEO },
  ];

  useEffect(() => {
    setIsTouch(isTouchDevice());

    async function fetchWorks() {
      try {
        const res = await fetch("/api/our-works");
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (error) {
        console.error("Failed to fetch works:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorks();
  }, []);

  const filteredItems = useMemo(
    () => items.filter((item) => item.type === activeCategory).slice(0, 6),
    [items, activeCategory],
  );

  const openPreview = (item) => {
    setSelectedItem(item);
    setShowInteractive360(false);
  };

  const closePreview = () => {
    setSelectedItem(null);
    setShowInteractive360(false);
  };

  return (
    <section id="our-work" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6 lg:px-2">
        <div className="text-center mb-12 fade-in">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-foreground">
            Our Work
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Showcase of recent real estate projects across Dubai.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12 fade-in">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setActiveCategory(category.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-[180ms] ${
                activeCategory === category.value
                  ? "bg-foreground text-background"
                  : "bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-muted/60 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openPreview(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPreview(item);
                  }
                }}
                className="group fade-in text-left"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="relative aspect-[4/3] min-h-[240px] bg-card rounded-xl overflow-hidden border border-border/60">
                  {item.type === OUR_WORK_TYPES.THREE_SIXTY && item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div
                      className={
                        item.type === OUR_WORK_TYPES.IMAGE && !isTouch
                          ? "photography-grayscale h-full w-full"
                          : "h-full w-full"
                      }
                    >
                      <MediaRenderer
                        type={item.type}
                        url={item.mediaContent}
                        title={item.title}
                      />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent">
                    <p className="font-semibold text-white text-xl">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-white/70 text-base mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`placeholder_${i}`}
                className="aspect-[4/3] rounded-xl border border-border/60 bg-gradient-to-br from-card to-secondary/30"
              />
            ))}
          </div>
        )}

        <div className="text-center">
          <Link href="/portfolio">
            <Button
              size="lg"
              variant="outline"
              className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
            >
              See All Work
            </Button>
          </Link>
        </div>
      </div>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-[760px] w-[92vw] p-0 gap-0 border border-white/10 rounded-2xl bg-[#111318]/95 overflow-hidden">
          <DialogTitle className="sr-only">
            {selectedItem?.title || "Our Work Preview"}
          </DialogTitle>

          {selectedItem && (
            <>
              <div className="relative h-[420px] bg-[#222428]">
                {selectedItem.type === OUR_WORK_TYPES.THREE_SIXTY &&
                selectedItem.thumbnail &&
                !showInteractive360 ? (
                  <button
                    type="button"
                    onClick={() => setShowInteractive360(true)}
                    className="h-full w-full relative"
                  >
                    <img
                      src={selectedItem.thumbnail}
                      alt={selectedItem.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-16 w-16 rounded-full border border-white/40 bg-black/30 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </span>
                    </div>
                  </button>
                ) : (
                  <MediaRenderer
                    type={selectedItem.type}
                    url={selectedItem.mediaContent}
                    title={selectedItem.title}
                    className="h-full w-full"
                  />
                )}
              </div>

              <div className="p-6 bg-[#17191d] border-t border-white/10">
                <p className="text-4xl font-bold text-foreground mb-2">
                  {selectedItem.title}
                </p>
                <p className="text-muted-foreground text-xl mb-4">
                  {selectedItem.subtitle
                    ? `${selectedItem.subtitle} - ${categories.find((c) => c.value === selectedItem.type)?.label || "Work"}`
                    : categories.find((c) => c.value === selectedItem.type)?.label || "Work"}
                </p>
                <Button asChild className="rounded-xl bg-gradient-to-b from-white to-zinc-300 text-black hover:from-zinc-100 hover:to-zinc-300">
                  <Link href="/booking">Book a similar shoot</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default OurWorkPreview;

