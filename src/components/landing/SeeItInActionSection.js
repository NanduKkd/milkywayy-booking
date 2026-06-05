import { Play } from "lucide-react";

const SeeItInActionSection = ({ onWatchVideo }) => {
  return (
    <section className="border-y border-border/40 bg-background py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="fade-in mb-5 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-accent/60" />
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
          <button
            type="button"
            aria-label="Play walkthrough video"
            className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 active:scale-[0.998]"
            onClick={onWatchVideo}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, hsl(var(--accent) / 0.18) 0%, transparent 55%)",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_0_60px_hsl(var(--accent)/0.45)] transition-transform duration-300 group-hover:scale-105 group-active:scale-95 md:h-24 md:w-24">
                <Play className="ml-1 h-8 w-8 fill-current md:h-10 md:w-10" />
              </span>
              <p className="text-xs tracking-wide text-muted-foreground md:text-sm">
                Booking → Dashboard · 90 seconds
              </p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default SeeItInActionSection;
