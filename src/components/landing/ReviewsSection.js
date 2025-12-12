import { Button } from "@/components/ui/button";
import { Star, Quote } from "lucide-react";
import Link from "next/link";

const ReviewsSection = () => {
  const reviews = [
    {
      name: "Sarah Al-Mansouri",
      role: "Senior Agent",
      company: "Emaar Properties",
      quote: "Switched from our old photographer and never looked back. The portal saves me hours every week.",
      rating: 5,
      featured: true,
    },
    {
      name: "Ahmed Hassan",
      role: "Broker",
      company: "DAMAC Realty",
      quote: "24-hour photo delivery is a game changer. My listings go live faster.",
      rating: 5,
    },
    {
      name: "Lisa Chen",
      role: "Property Consultant",
      company: "Betterhomes",
      quote: "Finally, a system where I can track all my shoots and download invoices instantly.",
      rating: 5,
    },
    {
      name: "Omar Khalil",
      role: "Team Lead",
      company: "Allsopp & Allsopp",
      quote: "The quality is consistent across all shoots. That's hard to find.",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "Agent",
      company: "Driven Properties",
      quote: "Love the wallet cashback feature. It adds up quickly!",
      rating: 5,
    },
    {
      name: "James Wilson",
      role: "Director",
      company: "Luxhabitat",
      quote: "Our entire team uses Milkywayy now. Simplified our whole workflow.",
      rating: 5,
    },
    {
      name: "Fatima Al-Rashid",
      role: "Sales Manager",
      company: "Knight Frank",
      quote: "The 360° tours have increased our international buyer inquiries significantly.",
      rating: 5,
    },
  ];

  const featuredReview = reviews.find(r => r.featured);
  const otherReviews = reviews.filter(r => !r.featured);

  return (
    <section id="reviews" className="py-24 relative">
      <div className="starfield opacity-10" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Client Voices
          </h2>
        </div>

        {/* Featured review */}
        {featuredReview && (
          <div className="max-w-3xl mx-auto mb-12 fade-in">
            <div className="bg-card border border-accent/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-accent/20">
                <Quote className="w-16 h-16" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(featuredReview.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-xl mb-6">"{featuredReview.quote}"</p>
                <div>
                  <p className="font-medium">{featuredReview.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {featuredReview.role} at {featuredReview.company}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other reviews grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {otherReviews.map((review, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:border-border/80 transition-colors fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-4">"{review.quote}"</p>
              <div>
                <p className="font-medium text-sm">{review.name}</p>
                <p className="text-xs text-muted-foreground">
                  {review.role}, {review.company}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/booking">
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Book your first shoot
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
