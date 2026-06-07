"use client";

import {
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const INITIAL_FORM_DATA = {
  name: "",
  company: "",
  phone: "",
  email: "",
  message: "",
};

const SOCIAL_LINKS = [
  { icon: Instagram, href: "https://www.instagram.com/milkywayy_com/", label: "instagram" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/milkywayy-com/", label: "linkedin" },
  // { icon: Youtube, href: "#", label: "youtube" },
];

const ContactSection = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to send your message.");
      }

      setFormData(INITIAL_FORM_DATA);
      toast.success("Message sent successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send your message.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 relative">
      <div className="starfield opacity-10" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12 fade-in">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">
            Get in Touch
          </h2>
          <p className="text-muted-foreground">
            Have questions? We're here to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 fade-in">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Name *"
                value={formData.name}
                onChange={(e) => updateFormField("name", e.target.value)}
                className="bg-secondary border-border focus:border-accent"
                required
              />
              <Input
                placeholder="Company (optional)"
                value={formData.company}
                onChange={(e) => updateFormField("company", e.target.value)}
                className="bg-secondary border-border focus:border-accent"
              />
              <Input
                placeholder="Phone *"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormField("phone", e.target.value)}
                className="bg-secondary border-border focus:border-accent"
                required
              />
              <Input
                placeholder="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormField("email", e.target.value)}
                className="bg-secondary border-border focus:border-accent"
                required
              />
              <Textarea
                placeholder="Message"
                value={formData.message}
                onChange={(e) => updateFormField("message", e.target.value)}
                className="bg-secondary border-border focus:border-accent min-h-[100px]"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>

          <div
            className="space-y-6 fade-in"
            style={{
              animationDelay: "0.1s",
            }}
          >
            <div className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href="mailto:hello@milkywayy.ae"
                    className="font-medium hover:text-accent transition-colors"
                  >
                    hello@milkywayy.ae
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Phone className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href="tel:+971507263306"
                    className="font-medium hover:text-accent transition-colors"
                  >
                    +971 50 726 3306
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <a
                    href="https://wa.me/971507263306"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-accent transition-colors"
                  >
                    Tap to chat
                  </a>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Prefer WhatsApp? Tap to chat - we typically respond within
              minutes.
            </p>

            <div className="flex gap-4 pt-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
