const createPropertyLocalId = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

export const createEmptyBookingProperty = () => ({
  localId: createPropertyLocalId(),
  propertyType: "",
  propertySize: "",
  services: [],
  videographySubService: "",
  preferredDate: "",
  timeSlot: "",
  startTime: "",
  duration: 0,
  building: "",
  community: "",
  unitNumber: "",
  contactName: "",
  contactPhone: "+971",
  contactEmail: "",
});

function mapLegacySlot(slot) {
  if (slot === 1) return { timeSlot: "morning", startTime: "09:00" };
  if (slot === 2) return { timeSlot: "afternoon", startTime: "13:00" };
  if (slot === 3) return { timeSlot: "evening", startTime: "17:00" };
  return { timeSlot: "", startTime: "" };
}

export function mapDraftsToBookingProperties(drafts) {
  return (Array.isArray(drafts) ? drafts : []).map((draft) => {
    const legacySlot = mapLegacySlot(draft.slot);

    return {
      ...createEmptyBookingProperty(),
      localId: String(draft.id || createPropertyLocalId()),
      propertyType: draft.propertyDetails?.type || "",
      propertySize: draft.propertyDetails?.size || "",
      services: Array.isArray(draft.shootDetails?.services)
        ? draft.shootDetails.services
        : [],
      videographySubService: draft.shootDetails?.videographySubService || "",
      preferredDate: draft.date || "",
      timeSlot: legacySlot.timeSlot,
      startTime: draft.startTime || legacySlot.startTime,
      duration: Number(draft.duration || 0),
      building: draft.propertyDetails?.building || "",
      community: draft.propertyDetails?.community || "",
      unitNumber: draft.propertyDetails?.unit || "",
      contactName: draft.contactDetails?.name || "",
      contactPhone: draft.contactDetails?.phone || "",
      contactEmail: draft.contactDetails?.email || "",
    };
  });
}

function getCustomerContactName(customer) {
  if (customer?.accountType === "COMPANY") {
    return customer.companyName || customer.fullName || customer.email || "";
  }

  return customer?.fullName || customer?.companyName || customer?.email || "";
}

export function mapHandoffToBookingProperties(
  properties,
  customer,
  handoffIdentity = "handoff",
) {
  const contactName = getCustomerContactName(customer);
  const contactPhone = customer?.phone || "";
  const contactEmail = customer?.email || "";

  return (Array.isArray(properties) ? properties : []).map(
    (property, index) => ({
      ...createEmptyBookingProperty(),
      ...property,
      localId: `${handoffIdentity}-property-${index + 1}`,
      services: Array.isArray(property.services) ? property.services : [],
      duration: Number(property.duration || 0),
      contactName,
      contactPhone,
      contactEmail,
    }),
  );
}
