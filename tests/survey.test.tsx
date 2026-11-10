// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/lib/api";
import SurveyApp from "../src/survey/SurveyApp";

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const next = () => userEvent.click(screen.getByRole("button", { name: /^next$/i }));
const start = async () => {
  render(<SurveyApp />);
  await userEvent.click(screen.getByRole("button", { name: /start planning/i }));
};
const toPreferences = async () => {
  await start();
  await userEvent.click(screen.getByRole("radio", { name: /all four days/i }));
  for (let i = 0; i < 7; i++) await next();
  expect(screen.getByRole("heading", { name: /how should the trip feel/i })).toBeInTheDocument();
};

describe("public survey", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("opens on the welcome screen with the trip facts", () => {
    render(<SurveyApp />);
    expect(screen.getByRole("heading", { name: /punjab family getaway 2026/i })).toBeInTheDocument();
    expect(screen.getByText("3–6 December 2026")).toBeInTheDocument();
    expect(screen.getByText("11 Adults + 1 Little Traveller")).toBeInTheDocument();
  });

  it("requires the date question before moving on", async () => {
    await start();
    await next();
    expect(screen.getByRole("alert")).toHaveTextContent(/whether you can join/i);
    await userEvent.click(screen.getByRole("radio", { name: /prefer 4–6/i }));
    await next();
    expect(screen.getByRole("heading", { name: /where should we stay/i })).toBeInTheDocument();
  });

  it("selects and deselects activities, and keeps them when navigating back and forth", async () => {
    await start();
    await userEvent.click(screen.getByRole("radio", { name: /all four days/i }));
    await next();
    await next();
    const wagah = () => screen.getByRole("button", { name: /wagah border/i });
    await userEvent.click(wagah());
    await userEvent.click(screen.getByRole("button", { name: /partition museum/i }));
    expect(wagah()).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /partition museum/i }));
    expect(screen.getByRole("button", { name: /partition museum/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("1 of 7 selected")).toBeInTheDocument();
    await next();
    await userEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(wagah()).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /previous/i }));
    await userEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(screen.getByRole("radio", { name: /all four days/i })).toHaveAttribute("aria-checked", "true");
  });

  it("enforces exactly three priorities", async () => {
    await toPreferences();
    const chip = (name: RegExp) => screen.getByRole("button", { name });
    await userEvent.click(chip(/^golden temple – evening visit/i));
    await userEvent.click(chip(/^tractor ride/i));
    await next();
    expect(screen.getByRole("alert")).toHaveTextContent(/exactly three priorities – you have chosen 2/i);
    await userEvent.click(chip(/^rock garden/i));
    expect(chip(/^hall bazaar/i)).toBeDisabled();
    await userEvent.click(chip(/^hall bazaar/i));
    expect(chip(/^hall bazaar/i)).toHaveAttribute("aria-pressed", "false");
    await next();
    expect(screen.getByRole("heading", { name: /seen a place you love/i })).toBeInTheDocument();
  });

  it("requires a name, then submits once and shows the thank-you screen", async () => {
    const submit = vi.spyOn(api, "submitSurvey").mockResolvedValue({ success: true, message: "ok", responseId: "x" });
    await toPreferences();
    for (const name of [/^golden temple – evening visit/i, /^tractor ride/i, /^rock garden/i]) await userEvent.click(screen.getByRole("button", { name }));
    await next();
    await next();
    expect(screen.getByRole("heading", { name: /one last look/i })).toBeInTheDocument();
    const dates = screen.getByRole("heading", { name: "Travel dates" }).closest("section")!;
    expect(within(dates).getByText(/yes – all four days/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /submit my preferences/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter your name/i);
    expect(submit).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/your name/i), "Asha Mehra");
    await userEvent.click(screen.getByRole("button", { name: /submit my preferences/i }));
    expect(await screen.findByRole("heading", { name: /thank you, asha/i })).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0]).toMatchObject({ respondent_name: "Asha Mehra", date_confirmation: "all-four-days", top_three_priorities: ["golden-temple-evening", "tractor-ride", "rock-garden"] });
    expect(submit.mock.calls[0][0].submission_id).toMatch(/.{10,}/);
  });

  it("does not show success when the request fails, and keeps the answers", async () => {
    vi.spyOn(api, "submitSurvey").mockResolvedValue({ success: false, message: "We could not save your response. Please try again." });
    await toPreferences();
    for (const name of [/^golden temple – evening visit/i, /^tractor ride/i, /^rock garden/i]) await userEvent.click(screen.getByRole("button", { name }));
    await next();
    await next();
    await userEvent.type(screen.getByLabelText(/your name/i), "Rohit");
    await userEvent.click(screen.getByRole("button", { name: /submit my preferences/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save/i);
    expect(screen.queryByText(/thank you/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toHaveValue("Rohit");
  });
});
