import { describe, expect, it } from "vitest";

import { checkImageFile, MAX_IMAGE_BYTES, uploadMessage, UPLOAD_MESSAGES } from "./rules";

describe("checkImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts a %s", (type) => {
    expect(checkImageFile({ type, size: 1000 })).toBeNull();
  });

  it("accepts a file of exactly 5 MB", () => {
    expect(checkImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it("refuses a file over 5 MB with image_too_large", () => {
    expect(checkImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toBe(
      "image_too_large",
    );
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])(
    "refuses the type %j with unsupported_image_type",
    (type) => {
      expect(checkImageFile({ type, size: 1000 })).toBe("unsupported_image_type");
    },
  );

  it("names the type first when both are wrong", () => {
    expect(checkImageFile({ type: "image/gif", size: MAX_IMAGE_BYTES + 1 })).toBe(
      "unsupported_image_type",
    );
  });
});

describe("uploadMessage", () => {
  it.each([
    ["image_too_large", "That image is over 5 MB. Export it smaller and upload again."],
    ["unsupported_image_type", "That file isn’t a JPEG, PNG or WebP image."],
    ["upload_failed", "The image storage didn’t answer. Upload again in a moment."],
    [
      "storage_not_configured",
      "Image upload isn’t set up on this server. Add the Cloudinary settings to the backend .env.",
    ],
  ])("has its own message for %s", (code, message) => {
    expect(uploadMessage(code)).toBe(message);
  });

  it("covers every code the contract documents for an upload", () => {
    expect(Object.keys(UPLOAD_MESSAGES).sort()).toEqual(
      [
        "image_too_large",
        "storage_not_configured",
        "unsupported_image_type",
        "upload_failed",
      ].sort(),
    );
  });

  it("has a message for network_error and forbidden, and a generic one for the rest", () => {
    expect(uploadMessage("network_error")).toMatch(/Couldn’t reach the server/);
    expect(uploadMessage("forbidden")).toBe("This account can’t upload images.");
    expect(uploadMessage("internal_error")).toBe("The image couldn’t be uploaded. Try again.");
  });
});
