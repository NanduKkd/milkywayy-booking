import { Star } from "lucide-react";

const SocialProofStrip = () => {
  const stats = [
    { value: "5.0★", label: "Rated" },
    { value: "500+", label: "Shoots" },
    { value: "24h", label: "Photo Delivery" },
  ];

  return (
    <section className="py-12 border-y border-border/50 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Trust text */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground mb-4">Trusted by Dubai agents & agencies</p>
            {/* Logo placeholders */}
            <div className="flex items-center justify-center md:justify-start gap-6 opacity-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-20 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground"
                >
                  Logo {i}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  {stat.value.includes("★") && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  <span className="text-xl font-heading font-bold">{stat.value.replace("★", "")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofStrip;
