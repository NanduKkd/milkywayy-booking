import { z } from "zod";
import { VIDEOGRAPHY_SUB_SERVICES } from "@/lib/config/pricing";

// Property schema for individual property entries
const propertySchema = z
  .object({
    propertyType: z.string().min(1, "Property type is required"),
    propertySize: z.string().min(1, "Property size is required"),
    services: z.array(z.string()).min(1, "At least one service is required"),
    videographySubService: z.string().optional(),
    preferredDate: z.string().min(1, "Preferred date is required"),
    timeSlot: z.string().optional(),
    startTime: z.string().min(1, "Start time is required"),
    duration: z.number().min(1).optional(),
    building: z.string().min(1, "Building/Tower Name is required"),
    community: z.string().min(1, "Community/Area is required"),
    unitNumber: z.string().optional(),
    /*
  contactName: z.string().min(1, "Contact Name is required"),
  contactPhone: z.string().min(1, "Contact Phone is required"),
  contactEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  */
  })
  .refine(
    (data) => {
      if (
        data.services?.includes("Videography") &&
        !data.videographySubService
      ) {
        return false;
      }

      if (!data.videographySubService) return true;

      // Accept (single or multi-select):
      // - Short Form
      // - Long Form.Daylight | Long Form.Night Light | Long Form.Daylight + Night
      // - Short Form|Long Form.Daylight (both selected)
      const tokens = String(data.videographySubService)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      if (tokens.length === 0) return false;
      const mains = tokens.map((token) => token.split(".")[0]);
      const allowedMain = Object.values(VIDEOGRAPHY_SUB_SERVICES);
      return mains.every((main) => allowedMain.includes(main));
    },
    {
      message: "Select at least one videography option",
      path: ["videographySubService"],
    },
  );

// Main booking schema
const bookingSchema = z.object({
  // Array of properties
  properties: z
    .array(propertySchema)
    .min(1, "At least one property is required"),
});

export { bookingSchema, propertySchema };
