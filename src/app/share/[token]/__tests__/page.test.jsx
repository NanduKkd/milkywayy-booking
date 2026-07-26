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
              url: `https://example.test/api/public/property-shares/${token}/properties/30/media/300/preview`,
              type: "image/jpeg",
              width: 1200,
              height: 630,
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

  it("keeps metadata generic when no authorized image can produce a preview", async () => {
    resolvePublicPropertyShareMetadata.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [
        {
          ...properties[0],
          media: [
            {
              id: 302,
              kind: "VIDEO",
              mimeType: "video/mp4",
              label: "Video",
            },
          ],
        },
      ],
    });

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
        name: "Marina corner home",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Synthetic Tower, Test District"),
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
    expect(
      screen.getByRole("link", { name: /360° virtual tour/u }),
    ).toHaveAttribute("target", "_blank");
    expect(container.querySelector(".sp-actions")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("[download]")).toBeNull();
    expect(screen.queryByText(/Download/u)).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("/api/files/download");
    expect(container.innerHTML).not.toContain("storage");
    expect(container.innerHTML).not.toContain("receipt");
  });

  it("opens the photo lightbox and copies only the public page URL", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open all property photos" }),
    );
    expect(
      screen.getByRole("dialog", { name: "All property photos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("opens the video walkthrough in a modal and keeps the 360 tour in a new tab", async () => {
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

    const videoTrigger = screen.getByRole("button", {
      name: /Video walkthrough/u,
    });
    videoTrigger.focus();
    fireEvent.click(videoTrigger);

    const videoDialog = screen.getByRole("dialog", {
      name: "Video walkthrough",
    });
    expect(videoDialog).toBeInTheDocument();
    expect(videoDialog.querySelector("button")).toHaveFocus();
    expect(
      [...videoDialog.parentElement.children]
        .filter((element) => element !== videoDialog)
        .every((element) => element.hasAttribute("inert")),
    ).toBe(true);
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      `/api/public/property-shares/${token}/properties/30/media/302`,
    );
    expect(screen.getByRole("link", { name: /360° virtual tour/u })).toEqual(
      expect.objectContaining({
        href: "https://example.com/virtual-tour",
        target: "_blank",
      }),
    );
    expect(container.querySelector("a[download]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(videoTrigger).toHaveFocus();
  });

  it("keeps video and 360 actions out of the photo thumbnail strip", async () => {
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
      screen.getByRole("button", { name: "View property photo 1" }),
    ).toHaveClass("thumb");
    expect(screen.queryByRole("button", { name: "View 360° tour" })).toBeNull();
    expect(container.querySelector(".sp-thumbs")).not.toHaveTextContent("360°");
    expect(container.querySelector(".sp-thumbs")).not.toHaveTextContent(
      "Video",
    );
    expect(container.querySelector(".sp-actions")).toBeNull();
  });

  it("renders the reference four-tile photo strip with a final more-photos tile", async () => {
    const listing = property(30, "Marina corner home");
    listing.media = [
      ...Array.from({ length: 6 }, (_, index) => ({
        id: 310 + index,
        kind: "IMAGE",
        mimeType: "image/jpeg",
        label: `Photo ${index + 1}`,
      })),
      ...listing.media.filter((media) => !media.mimeType.startsWith("image/")),
    ];
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [listing],
    });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("button", { name: "View property photo 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View property photo 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View property photo 3" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /3 More Photos/u }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View property photo 4" }),
    ).toBeNull();
  });

  it("renders exactly four photos as direct thumbnail choices", async () => {
    const listing = property(30, "Marina corner home");
    listing.media = Array.from({ length: 4 }, (_, index) => ({
      id: 310 + index,
      kind: "IMAGE",
      mimeType: "image/jpeg",
      label: `Photo ${index + 1}`,
    }));
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [listing],
    });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("button", { name: "View property photo 4" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /More Photos/u })).toBeNull();
  });

  it("uses one walkthrough action and picks a protected video before opening its modal", async () => {
    const listing = property(30, "Marina corner home");
    listing.media = [
      ...listing.media,
      {
        id: 303,
        kind: "VIDEO",
        mimeType: "video/mp4",
        label: "Drone tour",
      },
    ];
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [listing],
    });

    const { container } = render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getAllByRole("button", { name: /Video walkthrough/u }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Video walkthrough/u }));

    expect(
      screen.getByRole("dialog", { name: "Choose a video walkthrough" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Drone tour/u }));

    expect(
      screen.queryByRole("dialog", { name: "Choose a video walkthrough" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Video walkthrough" }),
    ).toBeInTheDocument();
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      `/api/public/property-shares/${token}/properties/30/media/303`,
    );
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
    expect(screen.queryByText("Synthetic Owner")).not.toBeInTheDocument();
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
        name: "Beach home",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the collection" }),
    ).toHaveAttribute("href", `/share/${token}`);
  });
});
