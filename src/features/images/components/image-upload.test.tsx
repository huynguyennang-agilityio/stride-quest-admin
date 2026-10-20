import { axe } from "@tests/axe";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action-result";

import { uploadImage, type UploadedImage } from "../actions";
import { MAX_IMAGE_BYTES } from "../rules";
import { ImageUpload } from "./image-upload";

vi.mock("../actions", () => ({ uploadImage: vi.fn() }));
const uploadMock = vi.mocked(uploadImage);

const png = () => new File(["x"], "hoan-kiem.png", { type: "image/png" });
const uploaded: UploadedImage = {
  url: "https://res.cloudinary.com/demo/image/upload/stridequest/covers/hoan-kiem.jpg",
  width: 1600,
  height: 900,
  sizeBytes: 184320,
};

function setup(props: Partial<React.ComponentProps<typeof ImageUpload>> = {}) {
  const onChange = vi.fn();
  // A person can pick "All files" in the file dialog, so the accept filter isn't applied.
  const user = userEvent.setup({ applyAccept: false });
  const view = render(
    <ImageUpload kind="covers" label="cover image" value={null} onChange={onChange} {...props} />,
  );
  return { user, onChange, input: () => screen.getByTestId("covers-file-input"), ...view };
}

// mockClear, not mockReset: after a reset, vitest 4 lets an error thrown by the mock reach the test.
beforeEach(() => {
  uploadMock.mockClear();
  uploadMock.mockImplementation(async () => ({
    ok: false,
    error: { code: "unset", message: "No upload was set up for this test.", fields: {} },
  }));
});

describe("ImageUpload", () => {
  it("shows a Choose button and no preview without an image", async () => {
    const { container } = setup();

    expect(screen.getByRole("button", { name: "Choose cover image" })).toBeEnabled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("uploads the file as the right kind and hands back the URL and a description", async () => {
    uploadMock.mockResolvedValue({ ok: true, data: uploaded });
    const { user, onChange, input } = setup();

    await user.upload(input(), png());

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        url: uploaded.url,
        name: "hoan-kiem.png · 1600 × 900 · 180 KB",
      }),
    );
    const body = uploadMock.mock.calls[0][0];
    expect(body.get("kind")).toBe("covers");
    expect((body.get("file") as File).name).toBe("hoan-kiem.png");
  });

  it("shows the image, its description and Replace and Remove when it has one", async () => {
    const { user, onChange, container } = setup({
      value: { url: uploaded.url, name: "hoan-kiem.jpg · 1600 × 900 · 180 KB" },
    });

    expect(screen.getByRole("img", { name: "Preview of the cover image" })).toBeInTheDocument();
    expect(screen.getByText("hoan-kiem.jpg · 1600 × 900 · 180 KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace cover image" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove cover image" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says it is uploading, and disables the button meanwhile", async () => {
    let finish: (result: ActionResult<UploadedImage>) => void = () => {};
    uploadMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { user, input } = setup();

    await user.upload(input(), png());

    expect(await screen.findByRole("button", { name: "Uploading…" })).toBeDisabled();
    await act(async () => finish({ ok: true, data: uploaded }));
  });

  it("refuses a file that isn't a JPEG, PNG or WebP without uploading it", async () => {
    const { user, input, container } = setup();

    await user.upload(input(), new File(["x"], "a.gif", { type: "image/gif" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That file isn’t a JPEG, PNG or WebP image.",
    );
    expect(uploadMock).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("refuses a file over 5 MB without uploading it", async () => {
    const { user, input } = setup();
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", { type: "image/png" });

    await user.upload(input(), big);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That image is over 5 MB. Export it smaller and upload again.",
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it.each([
    ["image_too_large", "That image is over 5 MB. Export it smaller and upload again."],
    ["unsupported_image_type", "That file isn’t a JPEG, PNG or WebP image."],
    ["upload_failed", "The image storage didn’t answer. Upload again in a moment."],
    [
      "storage_not_configured",
      "Image upload isn’t set up on this server. Add the Cloudinary settings to the backend .env.",
    ],
  ])("shows the message of the backend's %s", async (code, message) => {
    uploadMock.mockResolvedValue({ ok: false, error: { code, message, fields: {} } });
    const { user, onChange, input } = setup();

    await user.upload(input(), png());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a message when the action itself fails", async () => {
    uploadMock.mockImplementation(() => {
      throw new Error("Failed to fetch");
    });
    const { input } = setup();

    fireEvent.change(input(), { target: { files: [png()] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t reach the server");
  });

  it("clears an error when the next upload works", async () => {
    uploadMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "upload_failed", message: "x", fields: {} },
    });
    uploadMock.mockResolvedValueOnce({ ok: true, data: uploaded });
    const { user, input } = setup();

    await user.upload(input(), png());
    await screen.findByRole("alert");
    await user.upload(input(), png());

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("shows the form's own message for the image", () => {
    setup({ error: "Add an image for this medal." });

    expect(screen.getByRole("alert")).toHaveTextContent("Add an image for this medal.");
  });
});
