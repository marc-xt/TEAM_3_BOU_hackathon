import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import mock from "../../mock/borrower-mock.json";

// With the backend unreachable, the app must fall back to the bundled mock rather than
// showing a blank screen (framework §7 fallback path).
describe("App fallback path when the backend is down", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (String(url).includes("borrower-mock.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mock) });
      }
      // Every live API call fails, simulating a stopped backend.
      return Promise.reject(new Error("backend down"));
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders the stress alert from mock data and shows an offline notice", async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(mock.stress["1"].band)).toBeInTheDocument()
    );
    expect(screen.getByText(/offline demo data/i)).toBeInTheDocument();
    expect(screen.getByText(mock.stress["1"].reason)).toBeInTheDocument();
  });

  it("analyses a sample SMS from mock data and renders its disclosure", async () => {
    render(<App />);
    const predatory = mock.smsSamples.find((s) => s.parsed.is_predatory);

    const chip = await screen.findByRole("button", { name: predatory.label });
    await userEvent.click(chip);
    await userEvent.click(
      screen.getByRole("button", { name: /analyse this loan/i })
    );

    await waitFor(() =>
      expect(screen.getByText(predatory.parsed.lender)).toBeInTheDocument()
    );
    expect(screen.getByText(/high-cost loan/i)).toBeInTheDocument();
  });
});
