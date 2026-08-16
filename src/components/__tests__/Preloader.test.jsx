import { render, screen } from "@testing-library/react";
import Preloader from "../Preloader";

describe("Preloader", () => {
  it("renders the preloader text", () => {
    render(<Preloader />);
    const textElement = screen.getByText(/THE LAUNCHPAD FOR YOUR LISTING./i);
    expect(textElement).toBeInTheDocument();
  });
});
