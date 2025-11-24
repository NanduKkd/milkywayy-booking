import { z } from "zod";

// Property schema for individual property entries
const propertySchema = z.object({
  propertyType: z.string().min(1, "Property type is required"),
  propertySize: z.string().min(1, "Property size is required"),
  services: z.array(z.string()).min(1, "At least one service is required"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  building: z.string().min(1, "Building/Tower Name is required"),
  community: z.string().min(1, "Community/Area is required"),
  unitNumber: z.string().optional(),
  contactName: z.string().min(1, "Contact Name is required"),
  contactPhone: z.string().min(1, "Contact Phone is required"),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
});

// Main booking schema
const bookingSchema = z.object({
  // Array of properties
  properties: z.array(propertySchema).min(1, "At least one property is required"),
});

export { bookingSchema, propertySchema };
