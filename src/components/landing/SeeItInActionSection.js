const SeeItInActionSection = () => {
  return (
    <section className="border-y border-border/40 bg-background py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="fade-in mb-5 flex items-center justify-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent md:text-xs">
            Walkthrough
          </span>
        </div>

        <div className="max-w-2xl mx-auto text-center fade-in">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            See it in action.
          </h2>
          <p className="mb-12 text-sm text-muted-foreground md:text-base">
            A quick walkthrough showing the booking and dashboard flow end to
            end.
          </p>
        </div>

        <div
          className="fade-in mx-auto max-w-5xl"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
            <iframe
              className="h-full w-full"
              src="https://www.youtube-nocookie.com/embed/5Ic32MjDsRw?rel=0"
              title="How Milkywayy Portal Works"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeeItInActionSection;
