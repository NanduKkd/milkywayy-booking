import { ChevronDown, ChevronUp } from "lucide-react";

export function PropertyCardHeader({
  index,
  isOpen,
  onToggle,
  price,
  titleParts,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      className="w-full flex flex-row justify-between items-center p-4 md:p-6 text-left hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-muted/40 flex items-center justify-center text-xs md:text-xs font-semibold text-muted-foreground shrink-0">
          {index + 1}
        </div>
        <div className="min-w-0">
          <p className="text-sm md:text-sm font-semibold text-foreground">
            Property {index + 1}
          </p>
          {!isOpen && titleParts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {titleParts.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {price > 0 && (
          <span className="text-xs md:text-sm font-semibold text-foreground mr-1">
            AED {price.toLocaleString()}
          </span>
        )}
        {isOpen ? (
          <ChevronUp size={20} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={20} className="text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
