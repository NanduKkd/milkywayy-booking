import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
const SeeItInActionSection = ({
  onWatchVideo
}) => {
  return <section className="py-16 bg-secondary/30 border-y border-border/50">
    <div className="container mx-auto px-6">
      <div className="max-w-2xl mx-auto text-center fade-in">
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
          See it in action.
        </h2>
        <p className="text-muted-foreground mb-6">A quick walkthrough showing booking + dashboard flow.</p>
        <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={onWatchVideo}>
          <Play className="w-4 h-4 mr-2" />
          Watch How It Works
        </Button>
      </div>
    </div>
  </section>;
};
export default SeeItInActionSection;
