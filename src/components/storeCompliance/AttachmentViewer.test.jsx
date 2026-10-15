import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AttachmentViewer, { resolveDocument } from "./AttachmentViewer";
import api from "../../services/apiClient";
jest.mock("../../services/apiClient", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("../../config", () => ({ API_BASE_URL: "https://api.example.test/api" }));
beforeEach(() => { jest.clearAllMocks(); URL.createObjectURL = jest.fn(() => "blob:protected"); URL.revokeObjectURL = jest.fn(); });
test("external public file previews directly and never reaches authenticated client", async () => {
  render(<AttachmentViewer file={{ file_url: "https://res.cloudinary.com/test/proof.webp", file_name: "proof.webp" }} onClose={jest.fn()} />);
  await screen.findByAltText("proof.webp"); expect(api.get).not.toHaveBeenCalled(); expect(screen.getByRole("link")).toHaveAttribute("href", "https://res.cloudinary.com/test/proof.webp");
});
test("API-relative protected PDF uses authenticated blob and revokes it on close", async () => {
  api.get.mockResolvedValue({ data: new Blob(["pdf"], { type: "application/pdf" }) });
  const { unmount } = render(<AttachmentViewer file={{ file_url: "/files/invoice.pdf", file_name: "invoice.pdf" }} onClose={jest.fn()} />);
  await waitFor(() => expect(screen.getByRole("link")).toHaveAttribute("href", "blob:protected"));
  expect(api.get).toHaveBeenCalledWith("https://api.example.test/files/invoice.pdf", { responseType: "blob" }); unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:protected");
});
test("unsafe document schemes are rejected", () => { expect(() => resolveDocument("javascript:alert(1)")).toThrow("Unsupported"); });
