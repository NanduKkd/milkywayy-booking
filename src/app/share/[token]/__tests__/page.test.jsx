import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import {
  getPublicPropertyManifest,
  resolvePublicPropertyShareLanding,
} from "@/lib/services/propertySharing";
import SharedPropertyPage from "../page";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
jest.mock("@/lib/services/propertySharing", () => ({
  getPublicPropertyManifest: jest.fn(),
  resolvePublicPropertyShareLanding: jest.fn(),
}));
jest.mock("../ContactGate", () => ({
  __esModule: true,
  default: ({ propertyTitle }) => <div>Contact gate for {propertyTitle}</div>,
}));

const token = "A".repeat(43);
const properties = [
  {
    id: 30,
    title: "Synthetic Tower",
    services: ["Photography"],
    completedAt: "2026-07-20T10:00:00.000Z",
  },
  {
    id: 31,
    title: "Sample Villa",
    services: ["Videography"],
    completedAt: "2026-07-21T10:00:00.000Z",
  },
];

describe("public shared property page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cookies.mockResolvedValue({ get: jest.fn(() => undefined) });
  });

  it("shows only selected master property cards before the per-property gate", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "MASTER",
      properties,
    });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("Completed properties")).toBeInTheDocument();
    expect(screen.getByText("Synthetic Tower")).toBeInTheDocument();
    expect(screen.getByText("Sample Villa")).toBeInTheDocument();
    expect(screen.queryByText(/Shared files/u)).not.toBeInTheDocument();
    expect(getPublicPropertyManifest).not.toHaveBeenCalled();
    expect(resolvePublicPropertyShareLanding).toHaveBeenCalledWith(
      token,
      undefined,
      null,
    );
  });

  it("validates a requested master property before counting the landing", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "MASTER",
      properties,
    });

    render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({ property: "30" }),
      }),
    );

    expect(resolvePublicPropertyShareLanding).toHaveBeenCalledWith(
      token,
      undefined,
      30,
    );
    expect(
      screen.getByText("Contact gate for Synthetic Tower"),
    ).toBeInTheDocument();
  });

  it("uses the contact gate until a receipt exists", async () => {
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

    expect(
      screen.getByText("Contact gate for Synthetic Tower"),
    ).toBeInTheDocument();
    expect(resolvePublicPropertyShareLanding).toHaveBeenCalledTimes(1);
  });

  it("renders only token-scoped file actions after a valid receipt", async () => {
    resolvePublicPropertyShareLanding.mockResolvedValue({
      id: 4,
      kind: "SINGLE_PROPERTY",
      properties: [properties[0]],
    });
    cookies.mockResolvedValue({
      get: jest.fn(() => ({ value: "signed-receipt" })),
    });
    getPublicPropertyManifest.mockResolvedValue({
      property: properties[0],
      files: [
        {
          id: 500,
          label: "Final photography",
          filename: "synthetic.zip",
        },
      ],
    });

    const { container } = render(
      await SharedPropertyPage({
        params: Promise.resolve({ token }),
        searchParams: Promise.resolve({}),
      }),
    );

    const action = screen.getByRole("link", { name: "Download" });
    expect(action).toHaveAttribute(
      "href",
      `/api/public/property-shares/${token}/properties/30/files/500`,
    );
    expect(container.innerHTML).not.toContain("storage");
    expect(container.innerHTML).not.toContain("currentVersion");
  });
});
