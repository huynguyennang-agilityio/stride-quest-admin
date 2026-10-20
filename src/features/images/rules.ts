// The image rules of contract/challenges.md: a JPEG, PNG or WebP of at most 5 MB. The form
// checks them before it sends the file, so a refusal costs no upload; the backend checks
// again (it reads the type from the file's first bytes) and its codes have the same messages.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

export const UPLOAD_MESSAGES = {
  image_too_large: "That image is over 5 MB. Export it smaller and upload again.",
  unsupported_image_type: "That file isn’t a JPEG, PNG or WebP image.",
  upload_failed: "The image storage didn’t answer. Upload again in a moment.",
  storage_not_configured:
    "Image upload isn’t set up on this server. Add the Cloudinary settings to the backend .env.",
} as const;

/** The message for people for a failed upload, by `error.code`; anything else gets a generic one. */
export function uploadMessage(code: string): string {
  if (code === "network_error") {
    return "Couldn’t reach the server. Check your connection and upload again.";
  }
  if (code === "forbidden") return "This account can’t upload images.";
  return code in UPLOAD_MESSAGES
    ? UPLOAD_MESSAGES[code as keyof typeof UPLOAD_MESSAGES]
    : "The image couldn’t be uploaded. Try again.";
}

/** The code the backend would answer for a file that breaks the rules, or null when it is fine. */
export function checkImageFile(file: { type: string; size: number }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "unsupported_image_type";
  if (file.size > MAX_IMAGE_BYTES) return "image_too_large";
  return null;
}
