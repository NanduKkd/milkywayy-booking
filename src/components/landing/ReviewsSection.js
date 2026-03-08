"use client";

import { Star, ExternalLink } from "lucide-react";
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
      <div className="starfield opacity-10" aria-hidden />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12 fade-in">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Google Reviews
          </p>
          <div className="flex items-center justify-center gap-3 mb-5">
            <GoogleGMark />
            <span className="text-4xl font-semibold leading-none text-foreground">5.0</span>
            <div className="flex  items-center gap-1">
              {renderStars(5, "headline", "w-4 h-4")}
            </div>
            {/* <span className="text-muted-foreground text-sm">
              {reviewsCount > 0 ? `${reviewsCount} review${reviewsCount === 1 ? "" : "s"} on Google` : "251 reviews on Google"}
            </span> */}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold mb-3 tracking-tight text-foreground">
            Trusted by Real Estate Professionals Across Dubai
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Consistent quality. Fast delivery. Structured workflow. That&apos;s
            why teams move to Milkywayy.
          </p>
        </div>

        {visibleReviews.length > 0
          ? <div className="mb-12 fade-in">
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
                {visibleReviews.map((review, index) => (
                  <article
                    key={review.id || `review_${index}`}
                    className="snap-start min-w-[320px] md:min-w-[360px] max-w-[380px] bg-card border border-border rounded-2xl p-6 hover:border-muted-foreground/20 transition-all duration-200"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <GoogleGMark className="mb-3 text-[28px]" />
                    <p className="mb-5 min-h-[7.5rem] text-sm leading-relaxed text-foreground line-clamp-4 break-words [overflow-wrap:anywhere]">
                      &quot;{review.quote}&quot;
                    </p>
                    <div className="flex items-center gap-1 mb-4">
                      {renderStars(
                        review.rating,
                        `review_${review.id || index}`,
                        "w-3.5 h-3.5",
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs text-muted-foreground uppercase font-semibold">
                        {(review.name || "U")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{review.name}</p>
                        <p className="text-muted-foreground text-xs">
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

        <div className="text-center mt-8">
          <a
            href="https://www.google.com/maps/search/milkywayy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            View all on Google <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="text-center mt-6">
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
