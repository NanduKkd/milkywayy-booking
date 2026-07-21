import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactGate from "../ContactGate";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("public property contact gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });
  });

  it("renders and submits exactly name and phone", async () => {
    render(
      <ContactGate
        token={"A".repeat(43)}
        propertyId={30}
        propertyTitle="Synthetic Tower"
      />,
    );

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByLabelText(/email|company|agent|message/iu)).toBeNull();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Synthetic Visitor" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "+971500000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "View shared files" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const options = global.fetch.mock.calls[0][1];
    expect(JSON.parse(options.body)).toEqual({
      name: "Synthetic Visitor",
      phone: "+971500000000",
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});
