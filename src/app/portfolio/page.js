"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import NewNavbar from "@/components/NewNavbar";
import WorkPreviewCard from "@/components/portfolio/WorkPreviewCard";
import WorkPreviewDialog from "@/components/portfolio/WorkPreviewDialog";
import StarBackground from "@/components/StarBackground";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import { isTouchDevice } from "@/lib/helpers/ui";

const filters = [
  { key: OUR_WORK_TYPES.IMAGE, label: "Photography" },
  { key: OUR_WORK_TYPES.THREE_SIXTY, label: "360°" },
  { key: OUR_WORK_TYPES.SHORT_VIDEO, label: "Short-form Videos" },
  { key: OUR_WORK_TYPES.VIDEO, label: "Long-form Videos" },
];

const loadingPlaceholderIds = Array.from(
  { length: 8 },
  (_, index) => `portfolio-loading-${index + 1}`,
);

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
              Explore photography, 360° tours, and video work built for Dubai
              listings.
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <section className="pb-8 sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
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
            {loading
              ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {loadingPlaceholderIds.map((placeholderId) => (
                    <div
                      key={placeholderId}
                      className="aspect-[4/3] bg-white/5 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              : <div className={`grid ${getGridClass()} gap-4`}>
                  {filteredItems.map((item, index) => (
                    <WorkPreviewCard
                      key={item.id}
                      item={item}
                      index={index}
                      onOpen={openPreview}
                      aspectClass={getAspectClass()}
                      className={
                        activeFilter === OUR_WORK_TYPES.VIDEO && index % 3 === 0
                          ? "md:col-span-2"
                          : ""
                      }
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      isTouch={isTouch}
                    />
                  ))}
                </div>}

            {!loading && filteredItems.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                No entries found in this category.
              </div>
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
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 glow-pulse"
                >
                  Book Now
                </Button>
              </Link>
              <a
                href="https://wa.me/971507263306"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-border"
                >
                  WhatsApp Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <WorkPreviewDialog
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={closePreview}
        showInteractive360={showInteractive360}
        onShowInteractive360={() => setShowInteractive360(true)}
      />
    </div>
  );
}
