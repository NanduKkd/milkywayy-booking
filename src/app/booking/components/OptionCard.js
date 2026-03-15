import { cn } from "@/lib/utils";

export function OptionCard({
  className,
  isSelected,
  selectedClassName,
  unselectedClassName,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        className || "",
        "cursor-pointer rounded-lg md:rounded-xl border py-4 md:py-6 px-3 md:px-4 text-center transition-all",
        isSelected
          ? selectedClassName ||
              "border-white/12 bg-white/[0.065] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : unselectedClassName ||
              "border-border/10 text-muted-foreground hover:border-border/50",
      )}
      {...props}
    >
      {children}
    </div>
  );
}
