import { fireEvent, render, screen } from "@testing-library/react";
import {
  resolvePublicPropertyShareLanding,
  resolvePublicPropertyShareMetadata,
} from "@/lib/services/propertySharing";
import SharedPropertyPage, { generateMetadata } from "../page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
jest.mock("@/lib/services/propertySharing", () => ({
  resolvePublicPropertyShareLanding: jest.fn(),
  resolvePublicPropertyShareMetadata: jest.fn(),
}));

const token = "A".repeat(43);

function property(id, title) {
  return {
    id,
    title,
    displayPrice: "AED 2,350,000",
    listingType: "FOR_SALE",
    listingTypeLabel: "For Sale",
    bathrooms: 3,
    sizeSqft: 1244,
    furnishing: "Furnished",
    description: "Bright corner home near the marina.",
    highlights: ["Full marina view", "Upgraded kitchen"],
    contact: {
      name: "Synthetic Owner",
      phone: "+971500000000",
      telephoneUrl: "tel:+971500000000",
      whatsappUrl: "https://wa.me/971500000000",
    },
    location: "Synthetic Tower, Test District",
    bedrooms: 2,
    services: ["Photography", "Videography"],
    media: [
      { id: id * 10, kind: "IMAGE", mimeType: "image/jpeg", label: "Photo" },
      { id: id * 10 + 2, kind: "VIDEO", mimeType: "video/mp4", label: "Video" },
      {
        id: id * 10 + 1,
        kind: "TOUR",
        mimeType: "text/uri-list",
        label: "360 Virtual Tour",
        embedUrl: "https://example.com/virtual-tour",
      },
    ],
  };
}

const properties = [
  property(30, "Marina corner home"),
  property(31, "Beach home"),
];

describe("public property showcase page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.test";
  });

  it("builds listing-specific Open Graph metadata from the first image without counting a view", async () => {
    resolvePublicPropertyShareMetadata.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ token }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        title: "Marina corner home | Milkywayy",
        description: "Bright corner home near the marina.",
        openGraph: expect.objectContaining({
          title: "Marina corner home | Milkywayy",
          description: "Bright corner home near the marina.",
          url: new URL(`https://example.test/share/${token}`),
          images: [
            {
              url: `https://example.test/api/public/property-shares/${token}/properties/30/media/300`,
              alt: "Marina corner home",
            },
          ],
        }),
      }),
    );
    expect(resolvePublicPropertyShareMetadata).toHaveBeenCalledWith(
      token,
      null,
    );
    expect(resolvePublicPropertyShareLanding).not.toHaveBeenCalled();
  });

  it("keeps unavailable share metadata generic and non-enumerating", async () => {
    resolvePublicPropertyShareMetadata.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ token }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata).toEqual({
      title: "Property showcase | Milkywayy",
      description: "Explore this property showcase by Milkywayy.",
      robots: { index: false, follow: false, nocache: true },
      referrer: "no-referrer",
    });
    expect(metadata.openGraph).toBeUndefined();
  });

  it("renders a complete single showcase immediately with inline gallery and contact actions", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });

    const { container } = render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Marina corner home · Synthetic Tower, Test District",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("AED 2,350,000")).toBeInTheDocument();
    expect(screen.getByText("Full marina view")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+971500000000" })).toHaveAttribute(
      "href",
      "tel:+971500000000",
    );
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/971500000000",
    );
    expect(
      screen.queryByRole("button", { name: "Video walkthrough" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("360° + Video")).not.toBeInTheDocument();
    expect(container.querySelector(".h-badge")).toBeNull();
    expect(screen.getByRole("button", { name: "View 360° tour" })).toHaveClass(
      "thumb",
    );
    expect(container.querySelector(".sp-actions")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("[download]")).toBeNull();
    expect(screen.queryByText(/Download/u)).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("/api/files/download");
    expect(container.innerHTML).not.toContain("storage");
    expect(container.innerHTML).not.toContain("receipt");
  });

  it("switches supported media inline without exposing a download action", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });
    const { container } = render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "View property media 2" }),
    );

    expect(container.querySelector("video[controls]")).not.toBeNull();
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      `/api/public/property-shares/${token}/properties/30/media/302`,
    );
    expect(container.querySelector("a[download]")).toBeNull();
  });

  it("embeds a 360 link from the media strip without a thumbnail image", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });

    const { container } = render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    const tourTile = screen.getByRole("button", { name: "View 360° tour" });
    expect(tourTile).toHaveClass("thumb");
    expect(tourTile.querySelector("img")).toBeNull();
    fireEvent.click(tourTile);

    expect(screen.getByTitle("Marina corner home — 360° tour")).toHaveAttribute(
      "src",
      "https://example.com/virtual-tour",
    );
    expect(container.querySelector(".sp-actions")).toBeNull();
  });

  it("replaces failed hero and thumbnail images with unavailable states", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    fireEvent.error(
      screen.getByRole("img", {
        name: "Marina corner home — view 1",
      }),
    );

    expect(
      screen.getByText("This media could not be displayed."),
    ).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", {
        name: "Marina corner home — view 1",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders only selected cmini-style master cards and opens them under the same bearer", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "MASTER",
      properties,
    });

    const { container } = render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "2 homes picked for you" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Marina corner home/u)).toBeInTheDocument();
    expect(screen.getByText(/Beach home/u)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Marina corner home/u }),
    ).toHaveAttribute("href", `/share/${token}?property=30`);
    expect(resolvePublicPropertyShareLanding).toHaveBeenCalledWith(
      token,
      undefined,
      null,
    );
    expect(container.querySelector(".contact-card")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "WhatsApp" }),
    ).not.toBeInTheDocument();
  });

  it("requests and renders a selected master showcase with a back path", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "MASTER",
      properties,
    });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({ property: "31" }),
      }),
    );

    expect(resolvePublicPropertyShareLanding).toHaveBeenCalledWith(
      token,
      undefined,
      31,
    );
    expect(
      screen.getByRole("heading", {
        name: "Beach home · Synthetic Tower, Test District",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the collection" }),
    ).toHaveAttribute("href", `/share/${token}`);
  });
});
