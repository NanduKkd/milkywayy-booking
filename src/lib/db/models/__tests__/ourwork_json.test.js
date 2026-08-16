import OurWork from "../ourwork.js";

describe("OurWork Model JSON logic", () => {
  it("should stringify array mediaContent when setting", () => {
    const work = OurWork.build({
      title: "Test",
      type: "IMAGE",
      mediaContent: ["url1", "url2"],
    });
    expect(typeof work.getDataValue("mediaContent")).toBe("string");
    expect(work.getDataValue("mediaContent")).toBe(
      JSON.stringify(["url1", "url2"]),
    );
  });

  it("should parse JSON mediaContent when getting", () => {
    const work = OurWork.build({
      title: "Test",
      type: "IMAGE",
    });
    work.setDataValue("mediaContent", JSON.stringify(["url1", "url2"]));
    expect(Array.isArray(work.mediaContent)).toBe(true);
    expect(work.mediaContent).toEqual(["url1", "url2"]);
  });

  it("should return raw string for legacy non-JSON mediaContent", () => {
    const work = OurWork.build({
      title: "Test",
      type: "IMAGE",
    });
    const legacyUrl = "http://example.com/image.jpg";
    work.setDataValue("mediaContent", legacyUrl);
    expect(work.mediaContent).toBe(legacyUrl);
  });
});
