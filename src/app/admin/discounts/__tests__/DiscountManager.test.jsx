import { saveDiscounts } from "../../../../lib/actions/discounts";
import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import DiscountManager from "../DiscountManager";

// Mock crypto.randomUUID
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = jest.fn(() => "new-uuid");
}

const mockDiscounts = [
  {
    id: "1",
    name: "Summer Sale",
    type: "direct",
    minAmount: 1000,
    percentage: 10,
    maxDiscount: 200,
    isActive: true,
  },
];

describe("DiscountManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveDiscounts.mockResolvedValue({ success: true });
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  it("renders discount list", () => {
    render(<DiscountManager initialDiscounts={mockDiscounts} />);
    expect(screen.getByText("Summer Sale")).toBeInTheDocument();
    expect(screen.getByText("10% (Max AED 200)")).toBeInTheDocument();
  });

  it("handles delete discount", async () => {
    render(<DiscountManager initialDiscounts={mockDiscounts} />);
    const deleteButton = screen.getByTitle("Delete discount");
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(saveDiscounts).toHaveBeenCalledWith([]);
    });
  });

  it("handles toggle status", async () => {
    render(<DiscountManager initialDiscounts={mockDiscounts} />);
    const toggleButton = screen.getByTitle("Toggle status");
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(saveDiscounts).toHaveBeenCalledWith([
        expect.objectContaining({ id: "1", isActive: false }),
      ]);
    });
  });

  it("adds new discount", async () => {
    render(<DiscountManager initialDiscounts={[]} />);

    fireEvent.click(screen.getByText(/Add Discount/i));

    fireEvent.change(screen.getByLabelText(/Discount Name/i), {
      target: { value: "New Year" },
    });
    fireEvent.change(screen.getByLabelText(/Percentage/i), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText(/Max Amount/i), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText(/Min Spend/i), {
      target: { value: "2000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Discount/i }));

    await waitFor(() => {
      expect(saveDiscounts).toHaveBeenCalledWith([
        expect.objectContaining({ name: "New Year", percentage: "20" }),
      ]);
    });
  });
});
