"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const GoogleMark = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const renderStars = (rating, keyPrefix, sizeClass = "w-4 h-4") => {
  return Array.from({ length: Number(rating) || 0 }).map((_, i) => (
    <Star
      key={`${keyPrefix}_star_${i + 1}`}
      className={`${sizeClass} fill-yellow-400 text-yellow-400`}
    />
  ));
};

const buildRoleLine = (review) => {
  return [review.role, review.company].filter(Boolean).join(", ");
};

const ReviewsSection = () => {
  const scrollRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (Array.isArray(data)) {
          setReviews(data);
        }
      } catch (_error) {
        setReviews([]);
      }
    };

    loadReviews();
  }, []);

  const visibleReviews = useMemo(
    () => reviews.filter((review) => review.isVisible !== false),
    [reviews],
  );

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });

    window.setTimeout(updateScrollState, 350);
  };

  return (
    <section id="reviews" className="relative overflow-hidden py-24">
      <div className="container relative z-10 mx-auto px-6">
        <div className="mb-12 text-center fade-in">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Google Reviews
          </p>

          <div className="mb-6 flex items-center justify-center gap-3">
            <GoogleMark className="h-7 w-7" />
            <span className="text-2xl font-semibold text-foreground">5.0</span>
            <div className="flex items-center gap-0.5">
              {renderStars(5, "headline", "h-4 w-4")}
            </div>
          </div>

          <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground md:text-4xl">
            Trusted by Real Estate Professionals Across Dubai
          </h2>
          <p className="mx-auto max-w-2xl text-xs text-muted-foreground md:text-base">
            Consistent quality. Fast delivery. Structured workflow.
            <br className="hidden md:block" />
            That&apos;s why teams move to Milkywayy.
          </p>
        </div>

        {visibleReviews.length > 0
          ? <div className="relative mb-12 fade-in">
              {canScrollLeft && (
                <button
                  type="button"
                  aria-label="Scroll reviews left"
                  onClick={() => scroll("left")}
                  className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all duration-200 hover:scale-105 hover:bg-secondary active:scale-95 md:flex"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
              )}

              {canScrollRight && (
                <button
                  type="button"
                  aria-label="Scroll reviews right"
                  onClick={() => scroll("right")}
                  className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all duration-200 hover:scale-105 hover:bg-secondary active:scale-95 md:flex"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              )}

              <div
                ref={scrollRef}
                onScroll={updateScrollState}
                className="scrollbar-hide -mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-4"
              >
                {visibleReviews.map((review, index) => (
                  <article
                    key={review.id || `review_${index}`}
                    className="fade-in min-w-[300px] max-w-[320px] flex-shrink-0 snap-start rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/20"
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    <div className="mb-4">
                      <GoogleMark className="h-5 w-5 opacity-60" />
                    </div>

                    <p className="mb-4 min-h-[5.75rem] text-sm leading-relaxed text-foreground/90 line-clamp-4 break-words [overflow-wrap:anywhere]">
                      &quot;{review.quote}&quot;
                    </p>

                    <div className="mb-4 flex items-center gap-0.5">
                      {renderStars(
                        review.rating,
                        `review_${review.id || index}`,
                        "h-3.5 w-3.5",
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold uppercase text-muted-foreground">
                        {(review.name || "U")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {review.name}
                        </p>
                        <p className="break-all text-xs text-muted-foreground">
                          {buildRoleLine(review)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          : <div className="mb-12 text-center text-muted-foreground">
              No reviews available yet.
            </div>}

        <div className="mt-8 text-center">
          <a
            href="https://maps.app.goo.gl/UEiQFp3nshPgkaPE8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            View all on Google <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-6 text-center">
          <Link href="/booking">
            <Button variant="outline" className="rounded-xl border-border px-8">
              Book your first shoot
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
