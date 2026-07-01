import "../../relations.js";
import CalendarEvent from "../calendarevent.js";
import User from "../user.js";

describe("CalendarEvent Sequelize model", () => {
  it("maps scheduling, capacity, and audit fields", () => {
    expect(CalendarEvent.rawAttributes.businessDate.field).toBe(
      "business_date",
    );
    expect(CalendarEvent.rawAttributes.startTime.field).toBe("start_time");
    expect(CalendarEvent.rawAttributes.endTime.field).toBe("end_time");
    expect(CalendarEvent.rawAttributes.propertySummary.field).toBe(
      "property_summary",
    );
    expect(CalendarEvent.rawAttributes.contactSummary.field).toBe(
      "contact_summary",
    );
    expect(CalendarEvent.rawAttributes.consumesCapacity.field).toBe(
      "consumes_capacity",
    );
    expect(CalendarEvent.rawAttributes.reservedCapacityUnits.field).toBe(
      "reserved_capacity_units",
    );
    expect(CalendarEvent.rawAttributes.status.values).toEqual([
      "ACTIVE",
      "CANCELLED",
    ]);
    expect(CalendarEvent.rawAttributes.cancelledByUserId.field).toBe(
      "cancelled_by_user_id",
    );
    expect(CalendarEvent.rawAttributes.cancellationReason.field).toBe(
      "cancellation_reason",
    );
    expect(CalendarEvent.options.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "calendar_events_business_date_status_idx",
          fields: ["business_date", "status"],
        }),
        expect.objectContaining({
          name: "calendar_events_created_by_user_id_business_date_idx",
          fields: ["created_by_user_id", "business_date"],
        }),
      ]),
    );
  });

  it("defines creator, updater, and canceller associations", () => {
    expect(CalendarEvent.associations.createdByUser.target).toBe(User);
    expect(CalendarEvent.associations.updatedByUser.target).toBe(User);
    expect(CalendarEvent.associations.cancelledByUser.target).toBe(User);
    expect(User.associations.createdCalendarEvents.target).toBe(CalendarEvent);
    expect(User.associations.updatedCalendarEvents.target).toBe(CalendarEvent);
    expect(User.associations.cancelledCalendarEvents.target).toBe(
      CalendarEvent,
    );
  });
});
