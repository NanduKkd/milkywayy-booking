'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PhoneInput from '@/components/PhoneInput';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MessageCircle, Instagram, Linkedin, Youtube } from "lucide-react";
import { useState } from "react";
const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "+971",
    email: "",
    service: "",
    message: ""
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };
  return <section id="contact" className="py-24 relative">
      <div className="starfield opacity-10" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12 fade-in">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Get in Touch
          </h2>
          <p className="text-muted-foreground">
            Have questions? We're here to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Form */}
          <div className="bg-card border border-border rounded-2xl p-8 fade-in">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Name *" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} className="bg-secondary border-border focus:border-accent" required />
              <Input placeholder="Company (optional)" value={formData.company} onChange={e => setFormData({
              ...formData,
              company: e.target.value
            })} className="bg-secondary border-border focus:border-accent" />
              <PhoneInput value={formData.phone} onChange={phone => setFormData({...formData, phone})} classNames={{
                inputWrapper: 'bg-secondary border-border focus:border-white border relative overflow-visible rounded-sm',
                input: 'border-border focus:border-white pl-10 w-full py-2 text-sm border-border rounded-md outline-white',
                countryIcon: 'absolute -top-0.5 left-2'
              }} />
              <Input placeholder="Email *" type="email" value={formData.email} onChange={e => setFormData({
              ...formData,
              email: e.target.value
            })} className="bg-secondary border-border focus:border-accent" required />
              <Select value={formData.service} onValueChange={value => setFormData({
              ...formData,
              service: value
            })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="360-tour">360° Virtual Tour</SelectItem>
                  <SelectItem value="reels">Short-form Reels</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Message" value={formData.message} onChange={e => setFormData({
              ...formData,
              message: e.target.value
            })} className="bg-secondary border-border focus:border-accent min-h-[100px]" />
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact info */}
          <div className="space-y-6 fade-in" style={{
          animationDelay: "0.1s"
        }}>
            <div className="bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a href="mailto:hello@milkywayy.ae" className="font-medium hover:text-accent transition-colors">
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
                  <a href="tel:+971507263306" className="font-medium hover:text-accent transition-colors">
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
                  <a href="https://wa.me/971507263306" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent transition-colors">
                    Tap to chat
                  </a>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">Prefer WhatsApp? 
Tap to chat - we typically respond within minutes.
          </p>

            {/* Social icons */}
            <div className="flex gap-4 pt-4">
              {[{
              icon: Instagram,
              href: "https://www.instagram.com/milkywayy_com/"
            }, {
              icon: Linkedin,
              href: "https://www.linkedin.com/milkywayy-com/"
            }].map((social, i) => <a key={i} href={social.href} className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors">
                  <social.icon className="w-5 h-5" />
                </a>)}
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default ContactSection;
