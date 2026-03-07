"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const GoogleGMark = ({ className = "" }) => (
  <span
    className={`inline-block text-[30px] font-semibold leading-none bg-[conic-gradient(from_200deg,_#4285F4_0deg,_#4285F4_95deg,_#34A853_95deg,_#34A853_180deg,_#FBBC05_180deg,_#FBBC05_260deg,_#EA4335_260deg,_#EA4335_360deg)] bg-clip-text text-transparent ${className}`}
    aria-hidden="true"
  >
    G
  </span>
);

const renderStars = (rating, keyPrefix, sizeClass = "w-4 h-4") => {
  return Array.from({ length: Number(rating) || 0 }).map((_, i) => (
    <Star
      key={`${keyPrefix}_star_${i + 1}`}
      className={`${sizeClass} text-yellow-400 fill-yellow-400`}
    />
  ));
};

const ReviewsSection = () => {
  const [reviews, setReviews] = useState([]);

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

  const reviewsCount = visibleReviews.length;

  return (
    <section
      id="reviews"
      className="py-24 relative overflow-hidden border-y border-border/40"
    >
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12 fade-in">
          <p className="text-muted-foreground text-xs tracking-[0.25em] uppercase mb-4">
            Google Reviews
          </p>
          <div className="flex items-center justify-center gap-3 mb-5">
            <GoogleGMark />
            <span className="text-4xl font-semibold leading-none">5.0</span>
            <div className="flex items-center gap-1">
              {renderStars(5, "headline", "w-4 h-4")}
            </div>
            {/* <span className="text-muted-foreground text-lg">
              {reviewsCount} review{reviewsCount === 1 ? "" : "s"} on Google
            </span> */}
          </div>
          <h2 className="font-heading text-4xl md:text-6xl font-bold mb-4">
            Trusted by Real Estate Professionals Across Dubai
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg md:text-2xl">
            Consistent quality. Fast delivery. Structured workflow. That&apos;s
            why teams move to Milkywayy.
          </p>
        </div>

        {visibleReviews.length > 0
          ? <div className="mb-12 fade-in">
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
                {visibleReviews.map((review, index) => (
                  <article
                    key={review.id || `review_${index}`}
                    className="snap-start min-w-[320px] md:min-w-[360px] max-w-[380px] bg-card/70 border border-border rounded-2xl p-6"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <GoogleGMark className="mb-3 text-[28px]" />
                    <p className="mb-5 min-h-[7.5rem] text-xl leading-8 text-foreground line-clamp-4 break-words [overflow-wrap:anywhere]">
                      &quot;{review.quote}&quot;
                    </p>
                    <div className="flex items-center gap-1 mb-4">
                      {renderStars(
                        review.rating,
                        `review_${review.id || index}`,
                        "w-5 h-5",
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary border border-border/60 flex items-center justify-center text-xs text-muted-foreground uppercase">
                        {(review.name || "U")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-xl">{review.name}</p>
                        <p className="text-muted-foreground text-lg">
                          {review.role}, {review.company}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          : <div className="text-center text-muted-foreground mb-12">
              No reviews available yet.
            </div>}

        <div className="text-center">
          <Link href="/booking">
            <Button
              variant="outline"
              className="border-border hover:bg-secondary rounded-xl px-8"
            >
              Book your first shoot
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
