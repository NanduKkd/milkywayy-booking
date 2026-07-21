import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";

import { PRICING_CONFIG } from "@/lib/config/pricing";

import { PropertyServicesSection } from "../property-card/PropertyServicesSection";

function renderServicesSection() {
  const toggleService = jest.fn();

  function TestWrapper() {
    const { control } = useForm({
      defaultValues: {
        properties: [
          {
            services: ["Videography"],
          },
        ],
      },
    });

    return (
      <PropertyServicesSection
        control={control}
        errorMessage=""
        index={0}
        mobileVideographyOptions={
          <div data-testid="tablet-video-options">Video Format</div>
        }
        packageInfo={null}
        pricingConfig={PRICING_CONFIG}
        property={{
          propertyType: "Apartment",
          propertySize: "1 Bed",
          services: ["Videography"],
          videographySubService: "Short Form",
        }}
        toggleService={toggleService}
        videographySelections={["Short Form"]}
      />
    );
  }

  render(<TestWrapper />);

  return { toggleService };
}

describe("PropertyServicesSection responsive video options", () => {
  it("gives the mobile/tablet chooser the full services-grid row until the desktop layout takes over", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 789,
    });
    const { toggleService } = renderServicesSection();
    const chooserGridItem = screen.getByTestId(
      "tablet-video-options",
    ).parentElement;
    const servicesGrid = chooserGridItem.parentElement;

    expect(window.innerWidth).toBe(789);
    expect(servicesGrid).toHaveClass("md:grid-cols-3");
    expect(chooserGridItem).toHaveClass("md:col-span-3", "lg:hidden");
    expect(chooserGridItem.className).not.toMatch(/(?:^|\s)(?:min-w-|w-\[)/);

    fireEvent.click(screen.getByText("Videography"));
    expect(toggleService).toHaveBeenCalledWith(0, "Videography", [
      "Videography",
    ]);
  });
});
