import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
    {
      question: "What's the starting price?",
      answer: "Studio apartment photography starts from AED 350. Exact pricing is shown in the portal before payment.",
    },
    {
      question: "How fast is delivery?",
      answer: "Photo turnaround time for any listing is under 24 hours.",
    },
    {
      question: "Areas covered?",
      answer: "We cover Dubai. Choose your location during booking.",
    },
    {
      question: "How do I receive files?",
      answer: "Files are delivered and downloadable inside your dashboard.",
    },
    {
      question: "Do you provide invoices?",
      answer: "Yes, invoices are available to download from your dashboard anytime.",
    },
    {
      question: "Can I reschedule?",
      answer: "Yes—rescheduling options are available. If needed, contact us via WhatsApp.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 fade-in">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              FAQ
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4 fade-in">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-accent/50"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
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
