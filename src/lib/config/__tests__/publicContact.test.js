import { PUBLIC_CONTACT } from "../publicContact";

describe("PUBLIC_CONTACT", () => {
  it("defines the shared public contact number and links", () => {
    expect(PUBLIC_CONTACT).toEqual({
      phoneE164: "+971507263306",
      phoneDisplay: "+971 50 726 3306",
      telLink: "tel:+971507263306",
      whatsappLink: "https://wa.me/971507263306",
    });
  });
});
