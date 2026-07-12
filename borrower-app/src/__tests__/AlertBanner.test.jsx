import { render, screen } from "@testing-library/react";
import AlertBanner from "../components/AlertBanner";
import { STRESS_BANDS, STRESS_BAND_META } from "../constants";

describe("AlertBanner nudge copy across all three bands", () => {
  Object.values(STRESS_BANDS).forEach((band) => {
    it(`shows the correct headline and nudge for ${band}`, () => {
      render(<AlertBanner band={band} reason="Test reason" />);
      expect(screen.getByText(STRESS_BAND_META[band].headline)).toBeInTheDocument();
      expect(screen.getByText(STRESS_BAND_META[band].nudge)).toBeInTheDocument();
      expect(screen.getByText("Test reason")).toBeInTheDocument();
    });
  });

  it("renders nothing for an unknown band", () => {
    const { container } = render(<AlertBanner band="Nonexistent" />);
    expect(container).toBeEmptyDOMElement();
  });
});
