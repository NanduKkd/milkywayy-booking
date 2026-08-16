import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PRICING_CONFIG, VIDEOGRAPHY_SUB_SERVICES } from "@/lib/config/pricing";

import { PropertyCard } from "../PropertyCard";

function createProperty(overrides = {}) {
  return {
    localId: "property-1",
    propertyType: "",
    propertySize: "",
    services: [],
    videographySubService: "",
    preferredDate: "",
    timeSlot: "",
    startTime: "",
    duration: 0,
    building: "",
    community: "",
    unitNumber: "",
    contactName: "",
    contactPhone: "+971",
    contactEmail: "",
    ...overrides,
  };
}

function PropertyCardHarness() {
  const { control, setValue } = useForm({
    defaultValues: {
      properties: [createProperty()],
    },
  });
  const [property, setProperty] = useState(createProperty());

  const updatePropertyField = (_index, field, value) => {
    setValue(`properties.0.${field}`, value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setProperty((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleService = async (_index, serviceName, currentServices) => {
    const nextServices = currentServices.includes(serviceName)
      ? currentServices.filter((service) => service !== serviceName)
      : [...currentServices, serviceName];

    setValue("properties.0.services", nextServices, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setProperty((current) => {
      const nextVideographySubService = nextServices.includes("Videography")
        ? current.videographySubService || VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
        : "";

      setValue(
        "properties.0.videographySubService",
        nextVideographySubService,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );

      return {
        ...current,
        services: nextServices,
        videographySubService: nextVideographySubService,
      };
    });
  };

  return (
    <PropertyCard
      control={control}
      errors={{}}
      getOccupiedSlots={() => ({})}
      getPropertyPrice={() => 0}
      index={0}
      isOnlyProperty
      isOpen
      onDuplicate={jest.fn()}
      onRemove={jest.fn()}
      onToggle={jest.fn()}
      pricingConfig={PRICING_CONFIG}
      property={property}
      setValue={setValue}
      toggleService={toggleService}
      updatePropertyField={updatePropertyField}
    />
  );
}

describe("PropertyCard mobile autoscroll boundaries", () => {
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const scrolledSections = [];

  beforeEach(() => {
    scrolledSections.length = 0;
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });
    window.requestAnimationFrame = jest.fn((callback) => {
      return window.setTimeout(callback, 0);
    });
    HTMLElement.prototype.scrollIntoView = jest.fn(function scrollIntoView() {
      scrolledSections.push(this);
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("keeps type and size autoscroll while leaving service autoscroll disabled", async () => {
    render(<PropertyCardHarness />);

    fireEvent.click(screen.getAllByText("Apartment")[0]);

    await waitFor(() => {
      expect(scrolledSections).toHaveLength(1);
    });
    expect(scrolledSections[0]?.textContent).toContain("PROPERTY SIZE");

    fireEvent.click(screen.getByText("Studio"));

    await waitFor(() => {
      expect(scrolledSections).toHaveLength(2);
    });
    expect(scrolledSections[1]?.textContent).toContain("SERVICES");

    fireEvent.click(screen.getByText("Photography"));

    expect(scrolledSections).toHaveLength(2);
  });

  it("does not autoscroll for videography service or format selections", async () => {
    render(<PropertyCardHarness />);

    fireEvent.click(screen.getAllByText("Apartment")[0]);
    fireEvent.click(await screen.findByText("Studio"));

    await waitFor(() => {
      expect(scrolledSections).toHaveLength(2);
    });

    fireEvent.click(await screen.findByText("Videography"));

    expect(scrolledSections).toHaveLength(2);

    fireEvent.click(screen.getAllByText("Long Form")[0]);

    expect(scrolledSections).toHaveLength(2);
  });

  it("does not autoscroll on desktop viewports", async () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });

    render(<PropertyCardHarness />);

    fireEvent.click(screen.getAllByText("Apartment")[0]);

    await waitFor(() => {
      expect(screen.getByText("Studio")).toBeInTheDocument();
    });
    expect(scrolledSections).toHaveLength(0);
  });
});
