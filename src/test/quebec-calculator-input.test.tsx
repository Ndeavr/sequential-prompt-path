import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { formatQuebecNumber, parseQuebecNumber } from "@/lib/formatting";
import { NumberInput, simulateGoal, objectiveToPayload } from "@/pages/contractor-funnel/PageContractorPricingIntake";

afterEach(cleanup);

describe("Quebec calculator numbers", () => {
  it.each([
    [0, "0 $"], [1, "1 $"], [1234, "1 234 $"], [25000, "25 000 $"],
    [1000000, "1 000 000 $"], [1234.5, "1 234,50 $"], [-1234.5, "-1 234,50 $"],
  ])("formats and round-trips %s pure CAD dollars", (value, display) => {
    const formatted = formatQuebecNumber(value, "$");
    expect(formatted.replace(/\u00A0/g, " ")).toBe(display);
    expect(parseQuebecNumber(formatted)).toBe(value);
  });
  it.each(["1 234,50 $", "1\u00A0234,50 $", "1\u202F234,50 $", "1234.50"])("parses pasted %s", raw => {
    expect(parseQuebecNumber(raw)).toBe(1234.5);
  });
  it.each([40, 30])("keeps %s percentage points, not a ratio or dollars", value => {
    expect(formatQuebecNumber(value, "%")).toBe(`${value}\u00A0%`);
    expect(parseQuebecNumber(`${value} %`)).toBe(value);
  });
  it.each(["", "-", ",", "1,2,3", "abc", "Infinity"])("does not turn incomplete/invalid %s into zero", raw => {
    expect(parseQuebecNumber(raw)).toBeNull();
  });
  it("preserves decimals, raw draft and selection; formats on blur; clears without restoring a default", () => {
    function Harness() {
      const [value, setValue] = useState<number | null>(25000);
      return <><NumberInput label="Sale" unit="$" value={value ?? 25000} onChange={setValue} min={100} max={1000000} /><output data-testid="value">{value === null ? "empty" : value}</output></>;
    }
    const ui = render(<Harness />);
    const input = ui.getByRole("textbox") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1 234,50 $" } });
    expect(input.value).toBe("1 234,50 $");
    expect(ui.getByTestId("value").textContent).toBe("1234.5");
    input.setSelectionRange(2, 5);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5]);
    fireEvent.blur(input);
    expect(input.value).toBe("1\u00A0234,50\u00A0$");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("");
    expect(ui.getByTestId("value").textContent).toBe("empty");
  });
  it("keeps existing min/max on blur without stripping a negative sign", () => {
    let result: number | null = null;
    const ui = render(<NumberInput label="Goal" unit="$" value={null} onChange={v => { result = v; }} min={500} max={10000000} />);
    const input = ui.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "-1234,50" } });
    expect(result).toBe(-1234.5);
    fireEvent.blur(input);
    expect(result).toBe(500);
  });
  it("recalculates and preserves dollar and percentage payload units", () => {
    const d = { goal_amount: parseQuebecNumber("1 000 000 $"), avg_sale: parseQuebecNumber("25 000 $"), conversion_pct: parseQuebecNumber("40 %"), margin_pct: parseQuebecNumber("30 %"), next_month_appointments: 5 };
    const sim = simulateGoal(d as never);
    expect(sim.ok && [sim.contracts, sim.appointmentsTotal, sim.cadence, sim.estimatedProfit]).toEqual([40, 100, 9, 300000]);
    const payload = objectiveToPayload(d as never)?.payload;
    expect(payload?.average_project_value).toBe(25000);
    expect(payload?.close_rate_estimate).toBe(0.4);
    const decimal = simulateGoal({ ...d, goal_amount: 2500, avg_sale: parseQuebecNumber("1 234,50 $") } as never);
    expect(decimal.ok && [decimal.avgSale, decimal.contracts, decimal.estimatedRevenue]).toEqual([1234.5, 3, 3703.5]);
  });
});