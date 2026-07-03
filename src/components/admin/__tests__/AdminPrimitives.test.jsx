import { screen } from "@testing-library/react";
import { Dialog } from "@/components/ui/dialog";
import { render } from "../../../test-utils";
import {
  AdminBadge,
  AdminConfirmDialog,
  AdminDialogContent,
  AdminEmptyState,
  AdminFilterChip,
  AdminInlineMessage,
  AdminPageHeader,
  AdminSearchField,
  AdminTablePanel,
} from "../AdminPrimitives";

describe("AdminPrimitives", () => {
  it("renders the shared page header, filters, and search field", () => {
    render(
      <div>
        <AdminPageHeader
          eyebrow="Operations"
          title="Admin Dashboard"
          description="Shared styling contract"
          actions={<AdminBadge tone="info">Shared Foundation</AdminBadge>}
        />
        <div>
          <AdminFilterChip active>All</AdminFilterChip>
          <AdminSearchField placeholder="Search invoices" />
        </div>
      </div>,
    );

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Shared Foundation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByPlaceholderText("Search invoices")).toBeInTheDocument();
  });

  it("renders reusable empty and table states", () => {
    render(
      <AdminTablePanel
        title="Invoices"
        description="Live invoice records"
        actions={<AdminBadge tone="neutral">0 Results</AdminBadge>}
      >
        <AdminEmptyState
          title="No invoices found"
          description="Try a different search or clear active filters."
        />
      </AdminTablePanel>,
    );

    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("No invoices found")).toBeInTheDocument();
    expect(screen.getByText("0 Results")).toBeInTheDocument();
  });

  it("renders the shared admin dialog wrapper", () => {
    render(
      <Dialog open>
        <AdminDialogContent
          title="Confirm removal"
          description="This keeps destructive confirmation styles centralized."
        >
          <p>Dialog body</p>
        </AdminDialogContent>
      </Dialog>,
    );

    expect(screen.getByText("Confirm removal")).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();
  });

  it("renders the shared confirmation dialog actions", () => {
    render(
      <AdminConfirmDialog
        open
        title="Delete entry"
        description="Use the shared confirmation pattern for destructive admin actions."
        confirmLabel="Delete entry"
        cancelLabel="Keep entry"
      >
        <p>Confirmation body</p>
      </AdminConfirmDialog>,
    );

    expect(
      screen.getByRole("heading", { name: "Delete entry" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Confirmation body")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep entry" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete entry" }),
    ).toBeInTheDocument();
  });

  it("renders the shared inline message, including loading spinner", () => {
    const { rerender } = render(
      <AdminInlineMessage
        title="Operation Successful"
        description="The data was successfully synchronized."
        tone="info"
      />,
    );

    expect(screen.getByText("Operation Successful")).toBeInTheDocument();
    expect(
      screen.getByText("The data was successfully synchronized."),
    ).toBeInTheDocument();

    rerender(
      <AdminInlineMessage
        title="Loading content"
        loading={true}
        tone="neutral"
      />,
    );

    expect(screen.getByText("Loading content")).toBeInTheDocument();
  });
});
