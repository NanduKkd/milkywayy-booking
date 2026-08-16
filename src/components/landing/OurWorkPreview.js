"use client";

import { useEffect, useMemo, useState } from "react";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import { isTouchDevice } from "@/lib/helpers/ui";
import WorkPreviewCard from "../portfolio/WorkPreviewCard";
import WorkPreviewDialog from "../portfolio/WorkPreviewDialog";

const loadingPlaceholderIds = Array.from(
  { length: 6 },
  (_, index) => `landing-loading-${index + 1}`,
);
const emptyPlaceholderIds = Array.from(
  { length: 6 },
  (_, index) => `landing-empty-${index + 1}`,
);

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

  const getGridClass = () => {
    switch (activeCategory) {
      case OUR_WORK_TYPES.SHORT_VIDEO:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
      case OUR_WORK_TYPES.VIDEO:
        return "grid-cols-1 lg:grid-cols-2";
      case OUR_WORK_TYPES.THREE_SIXTY:
        return "grid-cols-1 lg:grid-cols-2";
      default:
        return "grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  const getAspectClass = () => {
    switch (activeCategory) {
      case OUR_WORK_TYPES.SHORT_VIDEO:
        return "aspect-[9/16]";
      case OUR_WORK_TYPES.VIDEO:
        return "aspect-[3/2]";
      default:
        return "aspect-[3/2]";
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

        {loading
          ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              {loadingPlaceholderIds.map((placeholderId) => (
                <div
                  key={placeholderId}
                  className="aspect-[3/2] bg-muted/60 animate-pulse rounded-xl"
                />
              ))}
            </div>
          : filteredItems.length > 0
            ? <div className={`grid ${getGridClass()} gap-5 mb-12`}>
                {filteredItems.map((item, index) => (
                  <WorkPreviewCard
                    key={item.id}
                    item={item}
                    index={index}
                    onOpen={openPreview}
                    aspectClass={getAspectClass()}
                    isTouch={isTouch}
                    animationDelayStep={0.08}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ))}
              </div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                {emptyPlaceholderIds.map((placeholderId) => (
                  <div
                    key={placeholderId}
                    className="aspect-[3/2] rounded-xl border border-border/60 bg-gradient-to-br from-card to-secondary/30"
                  />
                ))}
              </div>}

        {/*
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
        */}
      </div>

      <WorkPreviewDialog
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={closePreview}
        showInteractive360={showInteractive360}
        onShowInteractive360={() => setShowInteractive360(true)}
      />
    </section>
  );
};

export default OurWorkPreview;
