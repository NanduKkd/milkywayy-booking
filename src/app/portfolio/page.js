"use client";

import { Play, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import MediaRenderer from "@/components/portfolio/MediaRenderer";
import StarBackground from "@/components/StarBackground";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import { isTouchDevice } from "@/lib/helpers/ui";

const filters = [
  { key: OUR_WORK_TYPES.IMAGE, label: "Photography" },
  { key: OUR_WORK_TYPES.THREE_SIXTY, label: "360°" },
  { key: OUR_WORK_TYPES.SHORT_VIDEO, label: "Short-form Videos" },
  { key: OUR_WORK_TYPES.VIDEO, label: "Long-form Videos" },
];

export default function PortfolioPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTouch, setIsTouch] = useState(false);
  const [activeFilter, setActiveFilter] = useState(OUR_WORK_TYPES.IMAGE);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showInteractive360, setShowInteractive360] = useState(false);

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
    () => items.filter((item) => item.type === activeFilter),
    [items, activeFilter],
  );

  const getGridClass = () => {
    switch (activeFilter) {
      case OUR_WORK_TYPES.SHORT_VIDEO:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
      case OUR_WORK_TYPES.VIDEO:
        return "grid-cols-1 md:grid-cols-2";
      default:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  const getAspectClass = () => {
    switch (activeFilter) {
      case OUR_WORK_TYPES.SHORT_VIDEO:
        return "aspect-[9/16]";
      case OUR_WORK_TYPES.VIDEO:
        return "aspect-video";
      default:
        return "aspect-[4/3]";
    }
  };

  const openPreview = (item) => {
    setSelectedItem(item);
    setShowInteractive360(false);
  };

  const closePreview = () => {
    setSelectedItem(null);
    setShowInteractive360(false);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <StarBackground />
      <NewNavbar />

      <section className="pt-32 pb-16 relative">
        <div className="starfield opacity-10" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto fade-in">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our Works
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore photography, 360° tours, and video work built for Dubai listings.
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <section className="pb-8 sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-6">
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="h-auto bg-transparent gap-2">
                {filters.map((filter) => (
                  <TabsTrigger
                    key={filter.key}
                    value={filter.key}
                    className="px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-accent data-[state=active]:text-accent-foreground bg-secondary text-foreground hover:bg-secondary/80"
                  >
                    {filter.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-6">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[4/3] bg-white/5 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className={`grid ${getGridClass()} gap-4`}>
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => openPreview(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPreview(item);
                      }
                    }}
                    className={`group relative ${getAspectClass()} bg-card rounded-xl overflow-hidden cursor-pointer hover-lift fade-in ${
                      activeFilter === OUR_WORK_TYPES.VIDEO && index % 3 === 0 ? "md:col-span-2" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted/50 to-secondary" />

                  <div className="relative h-full w-full">
                    {item.type === OUR_WORK_TYPES.THREE_SIXTY && item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className={
                          item.type === OUR_WORK_TYPES.IMAGE && !isTouch
                            ? "photography-grayscale h-full w-full"
                            : "h-full w-full"
                        }
                      >
                        <MediaRenderer type={item.type} url={item.mediaContent} title={item.title} />
                      </div>
                    )}
                  </div>

                  {(activeFilter === OUR_WORK_TYPES.SHORT_VIDEO || activeFilter === OUR_WORK_TYPES.VIDEO) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 text-accent-foreground ml-1" />
                      </div>
                    </div>
                  )}

                  {activeFilter === OUR_WORK_TYPES.THREE_SIXTY && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="px-2 py-1 bg-accent/90 rounded-full text-xs font-medium text-accent-foreground">
                        360°
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle || "Dubai"}</p>
                  </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">No entries found in this category.</div>
            )}
          </div>
        </section>
      </Tabs>

      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center fade-in">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
              Want content like this for your next listing?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/booking">
                <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse">
                  Book Now
                </Button>
              </Link>
              <a href="https://wa.me/971507263306" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-border">
                  WhatsApp Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="sm:max-w-4xl bg-card border-border p-0 overflow-hidden">
          <DialogTitle className="sr-only">{selectedItem?.title || "Work Preview"}</DialogTitle>
          {selectedItem && (
            <div className="relative">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className={`${selectedItem.type === OUR_WORK_TYPES.SHORT_VIDEO ? "aspect-[9/16] max-h-[80vh]" : "aspect-video"} bg-secondary`}>
                {selectedItem.type === OUR_WORK_TYPES.THREE_SIXTY && selectedItem.thumbnail && !showInteractive360 ? (
                  <button type="button" onClick={() => setShowInteractive360(true)} className="h-full w-full relative">
                    <Image src={selectedItem.thumbnail} alt={selectedItem.title} fill sizes="92vw" className="object-cover" />
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

              <div className="p-6">
                <h3 className="font-heading text-xl font-bold mb-1">{selectedItem.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{selectedItem.subtitle || "Dubai"}</p>
                <Link href="/booking">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Book a similar shoot
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
