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
        "cursor-pointer rounded-xl border py-6 px-4 text-center transition-all",
        isSelected
          ? selectedClassName || "border-border bg-accent/10 text-foreground"
          : unselectedClassName ||
              "border-border/10 text-muted-foreground hover:border-border/50",
      )}
      {...props}
    >
      {children}
    </div>
  );
}
