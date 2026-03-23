import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";

import { PRICING_CONFIG } from "@/lib/config/pricing";

import { VideographyOptionsSection } from "../property-card/VideographyOptionsSection";

function renderSection(selectedLongForm) {
  const updatePropertyField = jest.fn();

  function TestWrapper() {
    const { control } = useForm({
      defaultValues: {
        properties: [
          {
            videographySubService: selectedLongForm,
          },
        ],
      },
    });

    return (
      <VideographyOptionsSection
        control={control}
        errorMessage=""
        hasShortFormSelection={false}
        index={0}
        pricingConfig={PRICING_CONFIG}
        property={{
          propertyType: "Apartment",
          propertySize: "1 Bed",
        }}
        selectedLongForm={selectedLongForm}
        updatePropertyField={updatePropertyField}
      />
    );
  }

  render(<TestWrapper />);
}

describe("VideographyOptionsSection", () => {
  it("shows the evening helper text for Night Light", () => {
    renderSection("Long Form.Night Light");

    expect(
      screen.getByText(
        "Evening slots ensure optimal lighting and twilight shots.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the evening helper text for Daylight + Night", () => {
    renderSection("Long Form.Daylight + Night");

    expect(
      screen.getByText(
        "Evening slots ensure optimal lighting and twilight shots.",
      ),
    ).toBeInTheDocument();
  });

  it("does not show the evening helper text for Daylight", () => {
    renderSection("Long Form.Daylight");

    expect(
      screen.queryByText(
        "Evening slots ensure optimal lighting and twilight shots.",
      ),
    ).not.toBeInTheDocument();
  });
});
