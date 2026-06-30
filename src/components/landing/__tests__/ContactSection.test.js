import { PUBLIC_CONTACT } from "@/lib/config/publicContact";
import { render, screen } from "../../../test-utils";
import ContactSection from "../ContactSection";

describe("ContactSection", () => {
  it("renders the shared public phone and WhatsApp links", () => {
    render(<ContactSection />);

    expect(
      screen.getByRole("link", { name: PUBLIC_CONTACT.phoneDisplay }),
    ).toHaveAttribute("href", PUBLIC_CONTACT.telLink);
    expect(screen.getByRole("link", { name: "Tap to chat" })).toHaveAttribute(
      "href",
      PUBLIC_CONTACT.whatsappLink,
    );
  });
});
