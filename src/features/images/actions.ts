"use server";

import { redirect } from "next/navigation";

import { requireAccessToken } from "@/features/auth/queries";
import { failure, type ActionResult } from "@/lib/action-result";
import { apiClient } from "@/lib/api/client";
import { request } from "@/lib/api/errors";

import { checkImageFile, uploadMessage } from "./rules";

export type UploadedImage = { url: string; width: number; height: number; sizeBytes: number };

/**
 * Forwards an image to `POST /images` as multipart/form-data (`kind` is `covers` or
 * `medals`). The form checks type and size first; this checks them again, then the backend
 * does. Needs `serverActions.bodySizeLimit` above 5 MB (next.config.ts).
 */
export async function uploadImage(formData: FormData): Promise<ActionResult<UploadedImage>> {
  const kind = formData.get("kind");
  const file = formData.get("file");
  if ((kind !== "covers" && kind !== "medals") || !(file instanceof File)) {
    return failure("unsupported_image_type", uploadMessage("unsupported_image_type"));
  }
  const refused = checkImageFile(file);
  if (refused) return failure(refused, uploadMessage(refused));

  const token = await requireAccessToken();
  const result = await request(
    apiClient(token).POST("/api/v1/images", {
      // openapi-fetch sends JSON by default; this body is multipart.
      body: { kind, file: "" },
      bodySerializer: () => {
        const body = new FormData();
        body.append("kind", kind);
        body.append("file", file, file.name);
        return body;
      },
    }),
  );
  if (!result.ok) {
    if (result.error.status === 401) redirect("/login");
    return failure(result.error.code, uploadMessage(result.error.code));
  }
  const { url, width, height, size_bytes } = result.data;
  return { ok: true, data: { url, width, height, sizeBytes: size_bytes } };
}
