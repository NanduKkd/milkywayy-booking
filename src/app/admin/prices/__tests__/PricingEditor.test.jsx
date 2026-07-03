import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import { savePricingConfig } from "../actions";
import PricingEditor from "../PricingEditor";

jest.mock("../actions", () => ({
  savePricingConfig: jest.fn(),
}));

const initialConfig = {
  Apartment: {
    sizes: [
      {
        label: "Studio",
        prices: {
          "360° Tour": 450,
          Photography: { allowEvening: false, price: 350, slots: 1 },
          Videography: {
            "Long Form": {
              Daylight: { allowEvening: true, price: 600, slots: 2 },
              "Daylight + Night": {
                allowEvening: true,
                price: 1000,
                slots: 3,
              },
              "Night Light": { allowEvening: true, price: 800, slots: 2 },
            },
            "Short Form": {
              allowEvening: false,
              price: 400,
              slots: 1,
            },
          },
        },
      },
    ],
  },
};

describe("PricingEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    savePricingConfig.mockResolvedValue({ success: true });
  });

  it("renders the refreshed pricing shell and summary cards", () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    expect(
      screen.getByRole("heading", { name: "Pricing" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Property groups")).toBeInTheDocument();
    expect(screen.getByText("Lowest starting rate")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
  });

  it("saves the updated pricing configuration through the existing action", async () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    fireEvent.change(
      screen.getByLabelText(/Apartment Studio Photography price/i),
      {
        target: { value: "375" },
      },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: /save changes/i })[0],
    );

    await waitFor(() => {
      expect(savePricingConfig).toHaveBeenCalledTimes(1);
    });

    const savedConfig = savePricingConfig.mock.calls[0][0];
    expect(savedConfig.Apartment.sizes[0].prices.Photography.price).toBe(375);
  });

  it("shows the load error without hiding the empty-state guidance", () => {
    render(
      <PricingEditor initialConfig={{}} loadError="Config fetch failed" />,
    );

    expect(
      screen.getByText(/unable to load saved pricing/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Config fetch failed")).toBeInTheDocument();
    expect(
      screen.getByText(/no pricing configuration found/i),
    ).toBeInTheDocument();
  });
});
