import {
  SERVICES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import { normalizePricingConfig } from "../pricing";

describe("normalizePricingConfig", () => {
  it("maps legacy long-form category keys to UI labels", () => {
    const config = {
      Apartment: {
        sizes: [
          {
            label: "Studio",
            prices: {
              [SERVICES.VIDEOGRAPHY]: {
                [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
                  DAYLIGHT: { price: 700, slots: 2, allowEvening: true },
                  NIGHT_LIGHT: { price: 900, slots: 2, allowEvening: true },
                  DAYLIGHT_NIGHT: { price: 1100, slots: 3, allowEvening: true },
                },
              },
            },
          },
        ],
      },
    };

    const normalized = normalizePricingConfig(config);
    const longForm =
      normalized.Apartment.sizes[0].prices[SERVICES.VIDEOGRAPHY][
        VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
      ];

    expect(longForm).toMatchObject({
      Daylight: { price: 700, slots: 2, allowEvening: true },
      "Night Light": { price: 900, slots: 2, allowEvening: true },
      "Daylight + Night": { price: 1100, slots: 3, allowEvening: true },
    });
    expect(longForm.DAYLIGHT).toBeUndefined();
    expect(longForm.NIGHT_LIGHT).toBeUndefined();
    expect(longForm.DAYLIGHT_NIGHT).toBeUndefined();
  });

  it("keeps commercial long-form direct pricing shape unchanged", () => {
    const config = {
      Commercial: {
        sizes: [
          {
            label: "Essential",
            prices: {
              [SERVICES.VIDEOGRAPHY]: {
                [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
                  price: 2500,
                  slots: 1,
                  allowEvening: true,
                },
              },
            },
          },
        ],
      },
    };

    const normalized = normalizePricingConfig(config);
    const essentialSize = normalized.Commercial.sizes.find(
      (size) => size.label === "Essential",
    );
    expect(
      essentialSize.prices[SERVICES.VIDEOGRAPHY][
        VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
      ],
    ).toEqual({
      price: 2500,
      slots: 1,
      allowEvening: true,
    });
  });
});
