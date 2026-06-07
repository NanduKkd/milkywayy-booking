import BookingWorkflowTracker from "@/components/BookingWorkflowTracker";
import { render, screen } from "@/test-utils";

describe("BookingWorkflowTracker", () => {
  it("shows a checkmark for completed and active stages", () => {
    const { container } = render(
      <BookingWorkflowTracker
        booking={{ workflowStatus: "EDITING", revisionCount: 0 }}
      />,
    );

    expect(container.querySelectorAll(".lucide-check")).toHaveLength(3);
  });

  it("displays Editing with an Under Review label for a requested revision", () => {
    const { container } = render(
      <BookingWorkflowTracker
        showRevisionState
        booking={{
          workflowStatus: "FILES_UPLOADED",
          deliveryFiles: [
            { id: 10, status: "CHANGES_REQUESTED" },
            { id: 11, status: "ACCEPTED" },
          ],
        }}
      />,
    );

    expect(container.querySelectorAll(".lucide-check")).toHaveLength(3);
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    expect(screen.queryByText("2 files in review")).not.toBeInTheDocument();
  });

  it("keeps Files In Review active for ordinary file review", () => {
    const { container } = render(
      <BookingWorkflowTracker
        showRevisionState
        booking={{
          workflowStatus: "FILES_UPLOADED",
          deliveryFiles: [{ id: 10, status: "UNDER_REVIEW" }],
        }}
      />,
    );

    expect(container.querySelectorAll(".lucide-check")).toHaveLength(4);
    expect(screen.getByText("1 file in review")).toBeInTheDocument();
    expect(screen.queryByText("Under Review")).not.toBeInTheDocument();
  });

  it("does not alter shared tracker displays unless revision state is enabled", () => {
    const { container } = render(
      <BookingWorkflowTracker
        booking={{
          workflowStatus: "FILES_UPLOADED",
          deliveryFiles: [{ id: 10, status: "CHANGES_REQUESTED" }],
        }}
      />,
    );

    expect(container.querySelectorAll(".lucide-check")).toHaveLength(4);
    expect(screen.queryByText("Under Review")).not.toBeInTheDocument();
  });
});
