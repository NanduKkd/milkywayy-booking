import { Building, Hash, MapPin } from "lucide-react";
import { Controller } from "react-hook-form";

import { Input } from "@/components/ui/input";

const LOCATION_FIELDS = [
  {
    name: "community",
    label: "Community / Area",
    placeholder: "e.g., Dubai Marina",
    Icon: MapPin,
  },
  {
    name: "building",
    label: "Building / Tower",
    placeholder: "e.g., Marina Heights",
    Icon: Building,
  },
  {
    name: "unitNumber",
    label: "Unit Number",
    placeholder: "e.g., 1205",
    Icon: Hash,
  },
];

export function PropertyLocationSection({ control, index }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        LOCATION
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {LOCATION_FIELDS.map(({ Icon, label, name, placeholder }) => (
          <Controller
            key={name}
            name={`properties.${index}.${name}`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Icon className="w-3 h-3" />
                  {label}
                </label>
                <Input
                  {...field}
                  placeholder={placeholder}
                  className="bg-secondary/50 border-border hover:border-muted-foreground/20 input-glow h-10 rounded-xl text-xs"
                />
                {fieldState.error && (
                  <p className="text-red-500 text-xs">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        ))}
      </div>
    </div>
  );
}
