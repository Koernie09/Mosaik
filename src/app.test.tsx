// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./app";

describe("MOSAIK-Stundenplanablauf", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => cryptoId()) });
    vi.stubGlobal("fetch", vi.fn());
    URL.createObjectURL = vi.fn(() => "blob:mosaik-test");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("führt einen manuellen Entwurf erst nach vollständiger Prüfung zur Übergabe", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Manuell beginnen/ }));
    expect(screen.getByRole("heading", { name: "Stundenplan prüfen" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Stundenplan bestätigen" }));
    expect(screen.getByRole("status").textContent).toContain("korrigiere");

    await user.selectOptions(screen.getByLabelText(/^Wochentag/), "MO");
    fireEvent.change(screen.getByLabelText(/^Beginn/), { target: { value: "08:00" } });
    fireEvent.change(screen.getByLabelText(/^Ende/), { target: { value: "08:45" } });
    await user.type(screen.getByLabelText(/^Fach/), "Deutsch");
    await user.type(screen.getByLabelText(/^Lerngruppe/), "7G2");

    await user.click(screen.getByRole("button", { name: "Stundenplan bestätigen" }));
    expect(screen.getByRole("heading", { name: "Bereit für ATLAS" })).toBeTruthy();
    expect(screen.getByText("Montag, 08:00–08:45")).toBeTruthy();
    expect(screen.getByText("Deutsch")).toBeTruthy();
  });

  it("übernimmt Text lokal, erlaubt Bearbeiten und Löschen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText("Text oder kopierte Tabelle einfügen"),
      "Montag; 08:00; 08:45; Deutsch; 7G2; R12{enter}Dienstag; 09:00; 09:45; Geschichte; 8A; R10",
    );
    await user.click(screen.getByRole("button", { name: "Text lokal auswerten" }));

    const subjects = screen.getAllByLabelText(/^Fach/);
    expect(subjects).toHaveLength(2);
    await user.clear(subjects[0]);
    await user.type(subjects[0], "Latein");
    expect((subjects[0] as HTMLInputElement).value).toBe("Latein");

    await user.click(screen.getAllByRole("button", { name: "Löschen" })[1]);
    expect(screen.getAllByLabelText(/^Fach/)).toHaveLength(1);
  });

  it("zeigt eine Unterrichtsverteilung als unplatzierte Stunden statt als Fehlerliste", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByLabelText("Text oder kopierte Tabelle einfügen"),
      "Wst;Fach;Lehrer;Klasse(n);Von;Bis;Text;Wert{enter}3;De2;Xx;13;3.2.;8.6.;L 9;1.14",
    );
    await user.click(screen.getByRole("button", { name: "Text lokal auswerten" }));

    expect(screen.getByRole("heading", { name: "Noch zuordnen (3)" })).toBeTruthy();
    expect(screen.getByText(/Unterrichtsverteilung erkannt: 1 Zuordnungen mit insgesamt 3 Wochenstunden/)).toBeTruthy();
    expect(screen.queryByText(/Zeile 1 wurde nicht erkannt/)).toBeNull();
  });

  it("hält Fotos lokal und zeigt ehrlich die manuelle Erfassung an", async () => {
    const user = userEvent.setup();
    render(<App />);
    const file = new File(["image"], "plan.jpg", { type: "image/jpeg" });

    await user.upload(screen.getByLabelText(/Foto oder Screenshot/), file);

    expect(await screen.findByText(/nicht als unterstützter WebUntis-Screenshot erkannt/i)).toBeTruthy();
    expect(screen.getByAltText("Originalquelle plan.jpg")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("importiert einen alten UNTIS-HTML-Wochenplan lokal", async () => {
    const user = userEvent.setup();
    render(<App />);
    const file = new File([[
      "<b>gilt ab Montag; 5. November 2007</b>",
      "<table><tr><td></td><td>Montag</td><td>Dienstag</td></tr>",
      "<tr><td>1</td><td rowspan='2'>Deutsch<br>6D<br>B216</td><td></td></tr>",
      "<tr><td>2</td><td>Geschichte<br>7A<br>A101</td></tr></table>",
    ].join("")], "alter-plan.html", { type: "text/html" });

    await user.upload(screen.getByLabelText("Stundenplandatei auswählen"), file);

    expect(await screen.findByRole("heading", { name: "Stundenplan prüfen" })).toBeTruthy();
    expect(screen.getByDisplayValue("Deutsch")).toBeTruthy();
    expect(screen.getByDisplayValue("1–2")).toBeTruthy();
    expect(screen.getByDisplayValue("6D")).toBeTruthy();
    expect(screen.getByDisplayValue("B216")).toBeTruthy();
    expect(screen.getByText(/Das Dokument enthält keine Uhrzeiten/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("bietet nach der Bestätigung die Übergabedatei als Fallback an", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Manuell beginnen/ }));
    await user.selectOptions(screen.getByLabelText(/^Wochentag/), "FR");
    fireEvent.change(screen.getByLabelText(/^Beginn/), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText(/^Ende/), { target: { value: "10:45" } });
    await user.type(screen.getByLabelText(/^Fach/), "Geschichte");
    await user.click(screen.getByRole("button", { name: "Stundenplan bestätigen" }));
    await user.click(screen.getByRole("button", { name: "Übergabedatei herunterladen" }));

    expect(click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
});

let id = 0;
function cryptoId() {
  id += 1;
  return `00000000-0000-4000-8000-${id.toString().padStart(12, "0")}`;
}
