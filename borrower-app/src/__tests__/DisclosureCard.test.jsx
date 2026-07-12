import { render, screen } from "@testing-library/react";
import DisclosureCard from "../components/DisclosureCard";
import mock from "../../mock/borrower-mock.json";

// Every fixture SMS sample should render in plain language (framework §7).
describe("DisclosureCard renders every fixture sample", () => {
  mock.smsSamples.forEach((sample) => {
    it(`renders "${sample.label}"`, () => {
      render(<DisclosureCard disclosure={sample.parsed} />);
      expect(screen.getByText(sample.parsed.lender)).toBeInTheDocument();
      // Total repayable is the headline number a borrower must understand.
      expect(
        screen.getByText(
          new RegExp(sample.parsed.total_repayable.toLocaleString("en-UG"))
        )
      ).toBeInTheDocument();
    });
  });

  it("flags the predatory-fee lender case", () => {
    const predatory = mock.smsSamples.find((s) => s.parsed.is_predatory);
    render(<DisclosureCard disclosure={predatory.parsed} />);
    expect(screen.getByText(/high-cost loan/i)).toBeInTheDocument();
    expect(screen.getByText(/not a licensed lender/i)).toBeInTheDocument();
  });

  it("does not flag a licensed, fair-cost loan", () => {
    const fair = mock.smsSamples.find(
      (s) => !s.parsed.is_predatory && s.parsed.is_licensed
    );
    render(<DisclosureCard disclosure={fair.parsed} />);
    expect(screen.queryByText(/high-cost loan/i)).not.toBeInTheDocument();
  });
});
