import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
    {
      question: "How fast is delivery?",
      answer:
        "All listing photos are delivered within 24 hours. Video walkthroughs and 360° tours are delivered within the timeframe shown during booking.",
    },
    {
      question: "How do I receive my files?",
      answer:
        "All media is delivered directly inside your dashboard. You can download photos, videos, and invoices anytime from your account.",
    },
    {
      question: "What areas do you cover?",
      answer:
        "We currently cover all areas within Dubai. Simply select your location during booking to confirm availability.",
    },
    {
      question: "Is pricing transparent?",
      answer:
        "Yes. All pricing is shown clearly inside the portal before checkout — no hidden costs, no custom quoting delays.",
    },
    {
      question: "Can I reschedule, cancel, or request a refund?",
      answer:
        "Yes. Manage your booking directly from your dashboard. Cancellations or reschedules up to 4 hours before the shoot time receive a full refund. Changes within 4 hours incur a 100 AED operational fee.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 fade-in">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-foreground">
              FAQ
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4 fade-in">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-accent/50"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-4 text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
