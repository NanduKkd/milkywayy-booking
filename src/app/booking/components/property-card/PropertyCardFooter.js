import { Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PropertyCardFooter({
  index,
  isOnlyProperty,
  onDuplicate,
  onRemove,
  price,
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/50">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={() => onDuplicate(index)}
        >
          <Copy size={14} className="mr-1.5" />
          Duplicate
        </Button>
        {!isOnlyProperty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive text-xs"
            onClick={() => onRemove(index)}
          >
            <Trash2 size={14} className="mr-1.5" />
            Remove
          </Button>
        )}
      </div>
      {price > 0 && (
        <p className="text-sm font-semibold text-foreground">
          Subtotal: AED {price.toLocaleString()}
        </p>
      )}
    </div>
  );
}
