import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";

import { PRICING_CONFIG } from "@/lib/config/pricing";

import { VideographyOptionsSection } from "../property-card/VideographyOptionsSection";

function renderSection(selectedLongForm, propertyOverrides = {}) {
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
          ...propertyOverrides,
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

  it("keeps the evening helper text when twilight arrival shifts only to 16:00", () => {
    renderSection("Long Form.Daylight + Night", {
      propertyType: "Villa/Townhouse",
      propertySize: "6 Bed",
    });

    expect(
      screen.getByText(
        "Evening slots ensure optimal lighting and twilight shots.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the afternoon helper text for extended twilight selections with higher load", () => {
    renderSection("Long Form.Daylight + Night", {
      propertyType: "Villa/Townhouse",
      propertySize: "7 Bed",
    });

    expect(
      screen.getByText(
        "Afternoon slot selected for extended shoot and twilight transition.",
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
