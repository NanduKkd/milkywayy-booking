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
  Commercial: {
    sizes: [
      {
        label: "Basic",
        prices: {
          "360° Tour": 1800,
          Photography: { allowEvening: false, price: 1800, slots: 1 },
          Videography: {
            "Long Form": {
              allowEvening: true,
              price: 2000,
              slots: 1,
            },
            "Short Form": {
              allowEvening: false,
              price: 1100,
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

  it("renders the prototype pricing matrix without the removed controls", () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    expect(
      screen.getByRole("heading", { name: "Pricing Configuration" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "apartments" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "commercial" })).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
    expect(screen.getByText("LF Day+Night")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /save changes/i }),
    ).toHaveLength(1);
    expect(screen.queryByText("Property groups")).not.toBeInTheDocument();
    expect(screen.queryByText(/allow evening/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/slots/i)).not.toBeInTheDocument();
  });

  it("switches to the live matrix for the selected property type", () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    fireEvent.click(screen.getByRole("tab", { name: "commercial" }));

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Long Form")).toBeInTheDocument();
    expect(screen.queryByText("LF Day+Night")).not.toBeInTheDocument();
  });

  it("highlights unsaved cells and marks each dirty property tab", async () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    const priceInput = screen.getByLabelText(
      /Apartment Studio Photography price/i,
    );
    fireEvent.change(priceInput, { target: { value: "375" } });

    expect(priceInput.closest("label")).toHaveClass("border-amber-500/70");
    expect(
      screen.getByRole("tab", { name: /apartments unsaved edits/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /^commercial$/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("tab", { name: /apartments unsaved edits/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("saves the updated pricing configuration through the existing action", async () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    fireEvent.change(
      screen.getByLabelText(/Apartment Studio Photography price/i),
      {
        target: { value: "375" },
      },
    );
    fireEvent.change(
      screen.getByLabelText(/Apartment Studio LF Night price/i),
      {
        target: { value: "825" },
      },
    );
    fireEvent.change(
      screen.getByLabelText(/Apartment Studio 360 Tour price/i),
      {
        target: { value: "475" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savePricingConfig).toHaveBeenCalledTimes(1);
    });

    const savedConfig = savePricingConfig.mock.calls[0][0];
    expect(savedConfig.Apartment.sizes[0].prices.Photography.price).toBe(375);
    expect(savedConfig.Apartment.sizes[0].prices.Photography.slots).toBe(1);
    expect(savedConfig.Apartment.sizes[0].prices.Photography.allowEvening).toBe(
      false,
    );
    expect(
      savedConfig.Apartment.sizes[0].prices.Videography["Long Form"][
        "Night Light"
      ],
    ).toEqual({ allowEvening: true, price: 825, slots: 2 });
    expect(savedConfig.Apartment.sizes[0].prices["360° Tour"]).toBe(475);
  });

  it("updates direct commercial long-form prices without dropping metadata", async () => {
    render(<PricingEditor initialConfig={initialConfig} />);

    fireEvent.click(screen.getByRole("tab", { name: "commercial" }));
    fireEvent.change(
      screen.getByLabelText(/Commercial Basic Long Form price/i),
      {
        target: { value: "2100" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(savePricingConfig).toHaveBeenCalledTimes(1);
    });

    expect(
      savePricingConfig.mock.calls[0][0].Commercial.sizes[0].prices.Videography[
        "Long Form"
      ],
    ).toEqual({ allowEvening: true, price: 2100, slots: 1 });
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
