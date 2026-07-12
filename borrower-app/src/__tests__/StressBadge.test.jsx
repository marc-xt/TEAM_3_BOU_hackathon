import { render, screen } from "@testing-library/react";
import StressBadge from "../components/StressBadge";
import { STRESS_BANDS, STRESS_BAND_META } from "../constants";

describe("StressBadge across all three bands", () => {
  Object.values(STRESS_BANDS).forEach((band) => {
    it(`renders the ${band} band with its tone class`, () => {
      render(<StressBadge band={band} />);
      const badge = screen.getByText(band);
      expect(badge).toHaveClass(`stress-badge--${STRESS_BAND_META[band].tone}`);
    });
  });

  it("renders nothing for an unknown band", () => {
    const { container } = render(<StressBadge band="Nonexistent" />);
    expect(container).toBeEmptyDOMElement();
  });
});
