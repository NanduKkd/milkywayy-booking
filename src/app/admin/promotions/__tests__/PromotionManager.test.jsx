import {
  activateAdminPromotion,
  createAdminPromotion,
  deactivateAdminPromotion,
  pauseAdminPromotion,
  updateAdminPromotion,
} from "@/lib/actions/promotions";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "../../../../test-utils";
import PromotionManager from "../PromotionManager";

jest.mock("@/lib/actions/promotions", () => ({
  activateAdminPromotion: jest.fn(),
  createAdminPromotion: jest.fn(),
  deactivateAdminPromotion: jest.fn(),
  pauseAdminPromotion: jest.fn(),
  updateAdminPromotion: jest.fn(),
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
    window.confirm = jest.fn(() => true);
  });

  it("renders promotions across the three tabs", async () => {
    render(<PromotionManager initialPromotions={mockPromotions} />);

    expect(screen.getByText("Promotion Management")).toBeInTheDocument();
    expect(screen.getByText("SAVE20")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));

    expect(await screen.findByText("First booking bonus")).toBeInTheDocument();
    expect(screen.getByText("First paid booking")).toBeInTheDocument();
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

    fireEvent.click(
      screen.getAllByRole("button", { name: /Create Generic/i })[0],
    );
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

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
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

    fireEvent.click(screen.getByTitle("Activate promotion"));

    await waitFor(() => {
      expect(activateAdminPromotion).toHaveBeenCalledWith(101);
    });

    fireEvent.click(screen.getByRole("tab", { name: /Automatic Discounts/i }));
    expect(await screen.findByText("First booking bonus")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("tabpanel")).getByTitle("Pause promotion"),
    );

    await waitFor(() => {
      expect(pauseAdminPromotion).toHaveBeenCalledWith(202);
    });

    fireEvent.click(screen.getByRole("tab", { name: /Generic Codes/i }));
    expect(await screen.findByText("SAVE20")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("tabpanel")).getByTitle("Deactivate promotion"),
    );

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(deactivateAdminPromotion).toHaveBeenCalledWith(101);
    });
  });
});
