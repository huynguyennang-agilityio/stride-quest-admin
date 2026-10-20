"use client";

import { CircleAlert, ImageIcon, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { uploadImage } from "../actions";
import { checkImageFile, IMAGE_ACCEPT, uploadMessage } from "../rules";

export type UploadedImageValue = { url: string; name: string };

type Props = {
  /** The folder the backend stores it in: a challenge's cover or a medal's image. */
  kind: "covers" | "medals";
  /** What the image is, for the buttons' names: "cover image", "bronze medal image". */
  label: string;
  value: UploadedImageValue | null;
  onChange: (value: UploadedImageValue | null) => void;
  /** The form's own message for this image (for example "Add an image for this medal."). */
  error?: string;
  /** `cover` is a wide preview, `medal` a square one. */
  shape?: "cover" | "medal";
  describedBy?: string;
};

function describeFile(name: string, width: number, height: number, bytes: number) {
  const size =
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${name} · ${width} × ${height} · ${size}`;
}

/**
 * Picks an image, checks its type and size, uploads it through the `uploadImage` Server
 * Action and hands back the delivery URL. Every refusal has its own message.
 */
export function ImageUpload({
  kind,
  label,
  value,
  onChange,
  error,
  shape = "cover",
  describedBy,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const message = uploadError ?? error ?? null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    const refused = checkImageFile(file);
    if (refused) return setUploadError(uploadMessage(refused));

    setUploading(true);
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    try {
      const result = await uploadImage(body);
      if (!result.ok) return setUploadError(result.error.message);
      const { url, width, height, sizeBytes } = result.data;
      onChange({ url, name: describeFile(file.name, width, height, sizeBytes) });
    } catch {
      setUploadError(uploadMessage("network_error"));
    } finally {
      setUploading(false);
    }
  }

  const preview = shape === "cover" ? "h-[90px] w-40" : "size-16";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "bg-muted text-muted-foreground flex flex-none items-center justify-center overflow-hidden rounded-[10px] border",
            preview,
          )}
        >
          {value ? (
            <Image
              src={value.url}
              alt={`Preview of the ${label}`}
              width={shape === "cover" ? 160 : 64}
              height={shape === "cover" ? 90 : 64}
              className={cn("size-full", shape === "cover" ? "object-cover" : "object-contain p-1")}
            />
          ) : (
            <ImageIcon className="size-6" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {value ? (
            <span className="text-muted-foreground text-[13px] break-all">{value.name}</span>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              aria-describedby={describedBy}
              onClick={() => input.current?.click()}
            >
              {uploading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {uploading ? "Uploading…" : value ? `Replace ${label}` : `Choose ${label}`}
            </Button>
            {value && !uploading ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                Remove {label}
              </Button>
            ) : null}
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid={`${kind}-file-input`}
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {message ? (
        <div
          role="alert"
          id={errorId}
          className="border-alert-error-border bg-alert-error text-alert-error-foreground flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm"
        >
          <CircleAlert className="mt-px size-[18px] flex-none" aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
