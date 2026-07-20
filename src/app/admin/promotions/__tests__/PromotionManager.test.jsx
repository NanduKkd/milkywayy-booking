import {
  activateAdminPromotion,
  assignAdminPromotionCustomer,
  createAdminPromotion,
  deactivateAdminPromotion,
  pauseAdminPromotion,
  searchPromotionAssignableCustomers,
  unassignAdminPromotionCustomer,
  updateAdminPromotion,
} from "@/lib/actions/promotions";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "../../../../test-utils";
import PromotionManager from "../PromotionManager";

jest.mock("@/lib/actions/promotions", () => ({
  activateAdminPromotion: jest.fn(),
  assignAdminPromotionCustomer: jest.fn(),
  createAdminPromotion: jest.fn(),
  deactivateAdminPromotion: jest.fn(),
  pauseAdminPromotion: jest.fn(),
  searchPromotionAssignableCustomers: jest.fn(),
  unassignAdminPromotionCustomer: jest.fn(),
  updateAdminPromotion: jest.fn(),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onSelect }) => (
    <button type="button" role="menuitem" onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }) => children,
}));

const mockPromotions = [
  {
    id: 101,
    kind: "GENERIC",
    code: "SAVE20",
    name: "Save 20",
    adminDescription: "Public checkout code",
    customerMessage: "Use at checkout",
    benefitType: "PERCENTAGE",
    benefitValue: 20,
    benefitCap: 200,
    minimumSpend: 500,
    startsAt: null,
    endsAt: null,
    status: "DRAFT",
    priority: 2,
    perUserLimit: 1,
    totalLimit: 50,
    triggerType: "NONE",
    triggerConfig: {},
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: 151,
    kind: "PERSONAL",
    code: null,
    name: "VIP repeat customer",
    adminDescription: "Private client offer",
    customerMessage: "Applied automatically for your account",
    benefitType: "PERCENTAGE",
    benefitValue: 18,
    benefitCap: 180,
    minimumSpend: 600,
    startsAt: null,
    endsAt: null,
    status: "ACTIVE",
    priority: 3,
    perUserLimit: 1,
    totalLimit: null,
    triggerType: "NONE",
    triggerConfig: {},
    assignments: [],
    createdAt: "2026-07-01T09:00:00.000Z",
  },
  {
    id: 202,
    kind: "AUTOMATIC",
    code: null,
    name: "First booking bonus",
    adminDescription: "Applies on first paid booking",
    customerMessage: null,
    benefitType: "FIXED",
    benefitValue: 150,
    benefitCap: null,
    minimumSpend: 700,
    startsAt: null,
    endsAt: null,
    status: "ACTIVE",
    priority: 1,
    perUserLimit: 1,
    totalLimit: null,
    triggerType: "FIRST_PAID_BOOKING",
    triggerConfig: {},
    createdAt: "2026-07-01T10:00:00.000Z",
  },
];

describe("PromotionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders promotions across the three tabs", async () => {
    render(<PromotionManager initialPromotions={mockPromotions} />);

    expect(screen.getByText("Promotion Management")).toBeInTheDocument();
    expect(screen.getByText("SAVE20")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));

    expect(await screen.findByText("First booking bonus")).toBeInTheDocument();
    expect(screen.getByText("First paid booking")).toBeInTheDocument();
  });

  it("shows one create action and tab-specific promotion columns", async () => {
    render(<PromotionManager initialPromotions={mockPromotions} />);

    expect(
      screen.getAllByRole("button", { name: "Create Generic" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("columnheader", { name: "Min spend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Limits" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Validity" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Trigger" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    expect(
      await screen.findByRole("columnheader", { name: "Customer(s)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Trigger" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));
    expect(
      await screen.findByRole("columnheader", { name: "Trigger" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Requirements" }),
    ).toBeInTheDocument();
  });

  it("creates a generic promotion from the active tab", async () => {
    createAdminPromotion.mockResolvedValue({
      success: true,
      data: {
        id: 303,
        kind: "GENERIC",
        code: "WELCOME15",
        name: "Welcome 15",
        adminDescription: null,
        customerMessage: null,
        benefitType: "PERCENTAGE",
        benefitValue: 15,
        benefitCap: null,
        minimumSpend: 300,
        startsAt: null,
        endsAt: null,
        status: "DRAFT",
        priority: 0,
        perUserLimit: null,
        totalLimit: null,
        triggerType: "NONE",
        triggerConfig: {},
        createdAt: "2026-07-01T11:00:00.000Z",
      },
    });

    render(<PromotionManager initialPromotions={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /Create Generic/i }));
    fireEvent.change(screen.getByLabelText(/Promotion name/i), {
      target: { value: "Welcome 15" },
    });
    fireEvent.change(screen.getByLabelText(/Promotion code/i), {
      target: { value: "welcome15" },
    });
    fireEvent.change(screen.getByLabelText(/Discount percentage/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/Minimum spend/i), {
      target: { value: "300" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create promotion/i }));

    await waitFor(() => {
      expect(createAdminPromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "GENERIC",
          code: "WELCOME15",
          name: "Welcome 15",
          benefitType: "PERCENTAGE",
          benefitValue: "15",
          minimumSpend: "300",
          status: "DRAFT",
        }),
      );
    });

    expect(screen.getByText("WELCOME15")).toBeInTheDocument();
  });

  it("submits automatic date-range business dates", async () => {
    createAdminPromotion.mockResolvedValue({
      success: true,
      data: {
        id: 304,
        kind: "AUTOMATIC",
        code: null,
        name: "July date range",
        adminDescription: null,
        customerMessage: null,
        benefitType: "FIXED",
        benefitValue: 75,
        benefitCap: null,
        minimumSpend: 200,
        startsAt: null,
        endsAt: null,
        status: "DRAFT",
        priority: 0,
        perUserLimit: null,
        totalLimit: null,
        triggerType: "DATE_RANGE",
        triggerConfig: {
          startDate: "2026-07-11",
          endDate: "2026-07-31",
        },
        createdAt: "2026-07-11T10:00:00.000Z",
      },
    });

    render(<PromotionManager initialPromotions={mockPromotions} />);

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));
    fireEvent.click(screen.getByRole("button", { name: "Create Automatic" }));
    fireEvent.change(screen.getByLabelText(/Promotion name/i), {
      target: { value: "July date range" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /Benefit type/i }));
    fireEvent.click(screen.getByRole("option", { name: "Fixed amount off" }));
    fireEvent.change(screen.getByLabelText(/Discount amount/i), {
      target: { value: "75" },
    });
    fireEvent.change(screen.getByLabelText(/Minimum spend/i), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: /Trigger type/i }));
    fireEvent.click(screen.getByRole("option", { name: "Date range" }));
    fireEvent.input(screen.getByLabelText(/Start business date/i), {
      target: { value: "2026-07-11" },
    });
    fireEvent.input(screen.getByLabelText(/End business date/i), {
      target: { value: "2026-07-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create promotion/i }));

    await waitFor(() => {
      expect(createAdminPromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerType: "DATE_RANGE",
          triggerConfig: {
            startDate: "2026-07-11",
            endDate: "2026-07-31",
          },
        }),
      );
    });
  });

  it("edits an existing promotion", async () => {
    updateAdminPromotion.mockResolvedValue({
      success: true,
      data: {
        ...mockPromotions[0],
        name: "Save 25",
        benefitValue: 25,
      },
    });

    render(<PromotionManager initialPromotions={mockPromotions} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Save 20" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/Promotion name/i), {
      target: { value: "Save 25" },
    });
    fireEvent.change(screen.getByLabelText(/Discount percentage/i), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(updateAdminPromotion).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          name: "Save 25",
          benefitValue: "25",
        }),
      );
    });

    expect(screen.getByText("Save 25")).toBeInTheDocument();
  });

  it("runs activate, pause, and deactivate flows", async () => {
    activateAdminPromotion.mockResolvedValue({
      success: true,
      data: {
        ...mockPromotions[0],
        status: "ACTIVE",
      },
    });
    pauseAdminPromotion.mockResolvedValue({
      success: true,
      data: {
        ...mockPromotions[1],
        status: "PAUSED",
      },
    });
    deactivateAdminPromotion.mockResolvedValue({
      success: true,
      data: {
        ...mockPromotions[0],
        status: "DEACTIVATED",
      },
    });

    render(<PromotionManager initialPromotions={mockPromotions} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Save 20" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Activate" }));

    await waitFor(() => {
      expect(activateAdminPromotion).toHaveBeenCalledWith(101);
    });

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));
    expect(await screen.findByText("First booking bonus")).toBeInTheDocument();
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for First booking bonus" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Pause" }));

    await waitFor(() => {
      expect(pauseAdminPromotion).toHaveBeenCalledWith(202);
    });

    fireEvent.click(screen.getByRole("tab", { name: /Generic Codes/i }));
    expect(await screen.findByText("SAVE20")).toBeInTheDocument();
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Save 20" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Deactivate" }),
    );
    expect(
      screen.getByRole("heading", { name: "Deactivate promotion" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Deactivated promotions cannot be reactivated/i),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /^Deactivate promotion$/i }),
    );

    await waitFor(() => {
      expect(deactivateAdminPromotion).toHaveBeenCalledWith(101);
    });
  });

  it("searches and assigns a customer to a personal promotion", async () => {
    jest.useFakeTimers();

    searchPromotionAssignableCustomers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 801,
          displayName: "Noura Buyer",
          fullName: "Noura Buyer",
          companyName: null,
          email: "noura@example.com",
          phone: "+971500111222",
          accountType: "INDIVIDUAL",
        },
      ],
    });
    assignAdminPromotionCustomer.mockResolvedValue({
      success: true,
      data: {
        ...mockPromotions[1],
        assignments: [
          {
            id: 901,
            promotionId: 151,
            userId: 801,
            assignedAt: "2026-07-01T12:30:00.000Z",
            unassignedAt: null,
            assignedByUserId: 11,
            unassignedByUserId: null,
            createdAt: "2026-07-01T12:30:00.000Z",
            updatedAt: "2026-07-01T12:30:00.000Z",
            notes: null,
            user: {
              id: 801,
              displayName: "Noura Buyer",
              fullName: "Noura Buyer",
              companyName: null,
              email: "noura@example.com",
              phone: "+971500111222",
              accountType: "INDIVIDUAL",
            },
          },
        ],
      },
    });

    render(<PromotionManager initialPromotions={mockPromotions} />);

    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    expect(await screen.findByText("VIP repeat customer")).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for VIP repeat customer" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Assign customer" }),
    );
    fireEvent.change(screen.getByLabelText(/Search customers/i), {
      target: { value: "Noura" },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(searchPromotionAssignableCustomers).toHaveBeenCalledWith("Noura");
    });

    expect(await screen.findByText(/noura@example.com/i)).toBeInTheDocument();

    const resultCard = screen
      .getByText(/noura@example.com/i)
      .closest("div.rounded-xl");

    expect(resultCard).not.toBeNull();
    fireEvent.click(within(resultCard).getByRole("button", { name: "Assign" }));

    await waitFor(() => {
      expect(assignAdminPromotionCustomer).toHaveBeenCalledWith(151, 801);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("No customers assigned yet."),
      ).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("Noura Buyer").length).toBeGreaterThan(0);
  });

  it("unassigns a customer from a personal promotion", async () => {
    const assignedPromotion = {
      ...mockPromotions[1],
      assignments: [
        {
          id: 901,
          promotionId: 151,
          userId: 801,
          assignedAt: "2026-07-01T12:30:00.000Z",
          unassignedAt: null,
          assignedByUserId: 11,
          unassignedByUserId: null,
          user: {
            id: 801,
            displayName: "Noura Buyer",
            fullName: "Noura Buyer",
            email: "noura@example.com",
            phone: "+971500111222",
          },
        },
      ],
    };

    unassignAdminPromotionCustomer.mockResolvedValue({
      success: true,
      data: {
        ...assignedPromotion,
        assignments: [],
      },
    });

    render(
      <PromotionManager
        initialPromotions={[
          mockPromotions[0],
          assignedPromotion,
          mockPromotions[2],
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for VIP repeat customer" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Assign customer" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(unassignAdminPromotionCustomer).toHaveBeenCalledWith(151, 801);
    });
    expect(
      await screen.findByText("Noura Buyer removed successfully."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("No customers assigned yet.").length,
    ).toBeGreaterThan(0);
  });

  it("shows a safe initial-load error without rendering a successful empty catalog", () => {
    render(
      <PromotionManager
        initialPromotions={[]}
        loadError="Promotions are temporarily unavailable."
      />,
    );

    expect(
      screen.getByRole("alert", { name: /Unable to load promotions/i }),
    ).toHaveTextContent("Promotions are temporarily unavailable.");
    expect(
      screen.getByRole("button", { name: "Retry loading promotions" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No generic codes yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("renders the genuine empty state when the catalog loads successfully", () => {
    render(<PromotionManager initialPromotions={[]} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("No generic codes yet")).toBeInTheDocument();
  });

  it("preserves a failed create form and updates the correct row after retry", async () => {
    const createdPromotion = {
      id: 303,
      kind: "GENERIC",
      code: "WELCOME15",
      name: "Welcome 15",
      benefitType: "PERCENTAGE",
      benefitValue: 15,
      benefitCap: null,
      minimumSpend: 300,
      startsAt: null,
      endsAt: null,
      status: "DRAFT",
      priority: 0,
      perUserLimit: null,
      totalLimit: null,
      triggerType: "NONE",
      triggerConfig: {},
      createdAt: "2026-07-01T11:00:00.000Z",
    };
    createAdminPromotion
      .mockResolvedValueOnce({
        success: false,
        message: "Promotion code is already in use.",
      })
      .mockResolvedValueOnce({ success: true, data: createdPromotion });

    render(<PromotionManager initialPromotions={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Generic" }));
    expect(
      screen.getByRole("dialog", { name: "Create promotion" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Promotion name"), {
      target: { value: "Welcome 15" },
    });
    fireEvent.change(screen.getByLabelText("Promotion code"), {
      target: { value: "welcome15" },
    });
    fireEvent.change(screen.getByLabelText("Discount percentage"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create promotion" }));

    expect(
      await screen.findByRole("alert", {
        name: /Unable to update promotions/i,
      }),
    ).toHaveTextContent("Promotion code is already in use.");
    expect(screen.getByLabelText("Promotion name")).toHaveValue("Welcome 15");
    expect(screen.getByLabelText("Promotion code")).toHaveValue("WELCOME15");
    expect(screen.queryByText("WELCOME15")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create promotion" }));

    await waitFor(() => {
      expect(createAdminPromotion).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("WELCOME15")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("prevents a rapid duplicate create submission while the first request is pending", async () => {
    let resolveCreate;
    const pendingCreate = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    createAdminPromotion.mockReturnValue(pendingCreate);

    render(<PromotionManager initialPromotions={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Generic" }));
    fireEvent.change(screen.getByLabelText("Promotion name"), {
      target: { value: "One request only" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create promotion" }));
    fireEvent.click(screen.getByRole("button", { name: "Create promotion" }));

    expect(createAdminPromotion).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Create promotion" }),
    ).toBeDisabled();

    await act(async () => {
      resolveCreate({
        success: true,
        data: {
          ...mockPromotions[0],
          id: 303,
          name: "One request only",
          code: "ONE",
        },
      });
    });

    expect(await screen.findByText("ONE")).toBeInTheDocument();
  });

  it("preserves lifecycle status after failure and clears the failure after a retry", async () => {
    pauseAdminPromotion
      .mockResolvedValueOnce({
        success: false,
        message: "Promotion cannot be paused right now.",
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ...mockPromotions[1], status: "PAUSED" },
      });

    render(<PromotionManager initialPromotions={mockPromotions} />);
    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for VIP repeat customer",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Pause" }));

    expect(
      await screen.findByRole("alert", {
        name: /Unable to update promotions/i,
      }),
    ).toHaveTextContent("Promotion cannot be paused right now.");
    expect(screen.getByText("Active")).toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for VIP repeat customer" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Pause" }));

    expect(await screen.findByText("Paused")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps assignments intact when assignment changes fail and exposes retryable feedback", async () => {
    const assignedPromotion = {
      ...mockPromotions[1],
      assignments: [
        {
          id: 901,
          promotionId: 151,
          userId: 801,
          user: {
            id: 801,
            displayName: "Noura Buyer",
            email: "noura@example.com",
          },
        },
      ],
    };
    unassignAdminPromotionCustomer
      .mockResolvedValueOnce({
        success: false,
        message: "Customer assignment could not be removed.",
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ...assignedPromotion, assignments: [] },
      });

    render(
      <PromotionManager
        initialPromotions={[
          mockPromotions[0],
          assignedPromotion,
          mockPromotions[2],
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for VIP repeat customer" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Assign customer" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByRole("alert", { name: "Assignment update" }),
    ).toHaveTextContent("Customer assignment could not be removed.");
    expect(screen.getAllByText("Noura Buyer").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      await screen.findByRole("status", { name: "Assignment update" }),
    ).toHaveTextContent("Noura Buyer removed successfully.");
    expect(screen.getByText("No customers assigned yet.")).toBeInTheDocument();
  });

  it("keeps edit values after a rejected action and uses a safe fallback message", async () => {
    updateAdminPromotion.mockRejectedValue(new Error("database details"));

    render(<PromotionManager initialPromotions={mockPromotions} />);
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Save 20" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Promotion name"), {
      target: { value: "Still saved locally" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByRole("alert", { name: "Unable to update promotions" }),
    ).toHaveTextContent("Unable to save this promotion.");
    expect(screen.getByLabelText("Promotion name")).toHaveValue(
      "Still saved locally",
    );
    expect(screen.queryByText("Still saved locally")).not.toBeInTheDocument();
  });

  it("keeps the current status when a lifecycle request rejects", async () => {
    pauseAdminPromotion.mockRejectedValue(new Error("database details"));

    render(<PromotionManager initialPromotions={mockPromotions} />);
    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for VIP repeat customer",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Pause" }));

    expect(
      await screen.findByRole("alert", { name: "Unable to update promotions" }),
    ).toHaveTextContent("Unable to update this promotion.");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("reports failed customer searches without changing assignments", async () => {
    jest.useFakeTimers();
    searchPromotionAssignableCustomers.mockResolvedValue({
      success: false,
      message: "Customer search is temporarily unavailable.",
    });

    render(<PromotionManager initialPromotions={mockPromotions} />);
    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for VIP repeat customer",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Assign customer" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search customers" }),
      {
        target: { value: "No" },
      },
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(
      await screen.findByRole("alert", { name: "Assignment update" }),
    ).toHaveTextContent("Customer search is temporarily unavailable.");
    expect(screen.getByText("No customers assigned yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Assign" }),
    ).not.toBeInTheDocument();
  });

  it("recovers from a rejected customer search with a safe retryable message", async () => {
    jest.useFakeTimers();
    searchPromotionAssignableCustomers.mockRejectedValue(
      new Error("database details"),
    );

    render(<PromotionManager initialPromotions={mockPromotions} />);
    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for VIP repeat customer",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Assign customer" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search customers" }),
      { target: { value: "No" } },
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(
      await screen.findByRole("alert", { name: "Assignment update" }),
    ).toHaveTextContent("Unable to search for customers.");
    expect(screen.getByText("No customers assigned yet.")).toBeInTheDocument();
  });

  it("renders status, trigger, customer, and catalog fallbacks without treating them as errors", async () => {
    const edgePromotions = [
      {
        id: 401,
        kind: "GENERIC",
        name: "Code fallback",
        benefitType: "PERCENTAGE",
        benefitValue: 0,
        benefitCap: null,
        minimumSpend: 0,
        startsAt: "not-a-date",
        endsAt: null,
        perUserLimit: null,
        totalLimit: null,
        createdAt: "not-a-date",
      },
      {
        id: 402,
        kind: "PERSONAL",
        name: "Multiple customer fallback",
        benefitType: "PERCENTAGE",
        benefitValue: 10,
        benefitCap: null,
        assignments: [
          { id: 1, userId: 1, user: { fullName: "Full name only" } },
          { id: 2, userId: 2, user: { email: "second@example.com" } },
        ],
      },
      {
        id: 403,
        kind: "AUTOMATIC",
        name: "Second booking",
        benefitType: "FIXED",
        benefitValue: 75,
        minimumSpend: 0,
        triggerType: "SECOND_PAID_BOOKING",
        triggerConfig: {},
      },
      {
        id: 404,
        kind: "AUTOMATIC",
        name: "Date range fallback",
        benefitType: "PERCENTAGE",
        benefitValue: 5,
        triggerType: "DATE_RANGE",
        triggerConfig: {},
      },
      {
        id: 405,
        kind: "AUTOMATIC",
        name: "Unknown trigger",
        benefitType: "PERCENTAGE",
        benefitValue: 5,
        triggerType: "UNKNOWN",
        triggerConfig: {},
      },
    ];

    render(<PromotionManager initialPromotions={edgePromotions} />);

    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Invalid date – Always on")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Personal Auto-Apply/i }));
    expect(await screen.findByText("Full name only")).toBeInTheDocument();
    expect(screen.getByText("+1 more assigned")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));
    expect(await screen.findByText("Second paid booking")).toBeInTheDocument();
    expect(screen.getByText("? to ?")).toBeInTheDocument();
    expect(screen.getByText("No trigger")).toBeInTheDocument();
  });

  it("normalizes incomplete edit data into an accessible editable form", async () => {
    const incompletePromotion = {
      id: 406,
      kind: "AUTOMATIC",
      name: "Incomplete automatic",
      startsAt: "not-a-date",
      endsAt: "not-a-date",
      triggerConfig: {},
    };

    render(<PromotionManager initialPromotions={[incompletePromotion]} />);
    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));
    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for Incomplete automatic",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));

    expect(
      screen.getByRole("dialog", { name: "Edit promotion" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Discount percentage")).toHaveValue(null);
    expect(screen.getByLabelText("Minimum spend")).toHaveValue(0);
    expect(screen.getByLabelText("Starts at (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Ends at (optional)")).toHaveValue("");
  });
});
