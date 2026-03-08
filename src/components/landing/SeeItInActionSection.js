import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const SeeItInActionSection = ({ onWatchVideo }) => {
  return (
    <section className="py-20 bg-secondary/20 border-y border-border/40">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center fade-in">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight text-foreground">
            See it in action.
          </h2>
          <p className="text-muted-foreground mb-8">
            A quick walkthrough showing booking + dashboard flow.
          </p>
          <Button
            size="lg"
            variant="outline"
            className="border-border text-foreground hover:bg-secondary px-9"
            onClick={onWatchVideo}
          >
            <Play className="w-4 h-4 mr-2" />
            Watch How It Works
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SeeItInActionSection;
