import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fireEvent, render, screen } from "../test-utils";

const NavigationComponent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div>
      <div data-testid="pathname">{pathname}</div>
      <div data-testid="search-param">{searchParams.get("q")}</div>
      <button type="button" onClick={() => router.push("/new-page")}>
        Navigate
      </button>
    </div>
  );
};

describe("Next.js Navigation Mock", () => {
  it("should provide default values", () => {
    render(<NavigationComponent />);
    expect(screen.getByTestId("pathname")).toHaveTextContent("");
  });

  it("should allow navigation", () => {
    const { getByText } = render(<NavigationComponent />);
    fireEvent.click(getByText("Navigate"));
    // If mock works, this shouldn't throw
  });
});
