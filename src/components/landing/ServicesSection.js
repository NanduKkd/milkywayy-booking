import { Button } from "@/components/ui/button";
import { Camera, Video, Globe } from "lucide-react";
import Link from "next/link";

const ServicesSection = () => {
  const services = [
    {
      icon: Camera,
      title: "Photography",
      description: "Professional HDR photos that make listings shine and sell faster",
      price: "From AED 350",
      delivery: "Photos delivered within 24h",
    },
    {
      icon: Video,
      title: "Videography",
      description: "Cinematic property walkthroughs that captivate buyers",
      price: "From AED 400",
      delivery: "Short-Form: 24h, Long-Form: 24-48H",
    },
    {
      icon: Globe,
      title: "360° Virtual Tour",
      description: "Perfect for overseas buyers — explore properties remotely",
      price: "From AED 450",
      delivery: "Delivered in 24-48h",
    },
  ];

  return (
    <section id="services" className="py-24 relative">
      <div className="starfield opacity-10" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16 fade-in">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Choose what your listing needs.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for agents who need speed, consistency, and premium visuals.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="group bg-card border border-border rounded-2xl p-6 hover:border-accent/50 transition-all duration-300 hover-lift fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <service.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-heading text-lg font-bold mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
              <div className="space-y-1 mb-4">
                <p className="text-sm font-medium text-accent">{service.price}</p>
                <p className="text-xs text-muted-foreground">{service.delivery}</p>
              </div>
              <Link href="/booking">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-border hover:border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  Book This
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
