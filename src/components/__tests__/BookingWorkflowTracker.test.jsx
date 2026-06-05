import BookingWorkflowTracker from "@/components/BookingWorkflowTracker";
import { render } from "@/test-utils";

describe("BookingWorkflowTracker", () => {
  it("shows a checkmark for completed and active stages", () => {
    const { container } = render(
      <BookingWorkflowTracker
        booking={{ workflowStatus: "EDITING", revisionCount: 0 }}
      />,
    );

    expect(container.querySelectorAll(".lucide-check")).toHaveLength(3);
  });
});
