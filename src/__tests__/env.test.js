describe("Standard Mocks", () => {
  it("should have ResizeObserver defined", () => {
    expect(window.ResizeObserver).toBeDefined();
  });

  it("should have matchMedia defined", () => {
    expect(window.matchMedia).toBeDefined();
    expect(window.matchMedia("(min-width: 600px)").matches).toBeDefined();
  });

  it("should have IntersectionObserver defined", () => {
    expect(window.IntersectionObserver).toBeDefined();
  });
});
