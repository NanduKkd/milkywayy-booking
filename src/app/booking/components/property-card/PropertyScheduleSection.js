import DateSlotPicker from "@/components/DateSlotPicker";

export function PropertyScheduleSection({
  errorMessage,
  getOccupiedSlots,
  index,
  isNightService,
  property,
  updatePropertyField,
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        DATE & TIME
      </label>
      {!property.community?.trim() ? (
        <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a location above to unlock date & time selection.
          </p>
        </div>
      ) : (
        <DateSlotPicker
          date={property.preferredDate}
          slot={property.startTime}
          duration={property.duration || 1}
          isNightService={isNightService}
          blockedSlotsMap={getOccupiedSlots(index)}
          propertyType={property.propertyType}
          propertySize={property.propertySize}
          services={property.services || []}
          videographySubService={property.videographySubService || ""}
          onDateChange={(value) => updatePropertyField(index, "preferredDate", value)}
          onSlotChange={(value) => updatePropertyField(index, "startTime", value)}
          error={errorMessage}
        />
      )}
    </div>
  );
}
