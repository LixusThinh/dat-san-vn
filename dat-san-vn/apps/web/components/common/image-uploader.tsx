"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getSafeImageUrl, VENUE_PLACEHOLDER_IMAGE } from "@/lib/utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000/api";

/**
 * Derive upload endpoint from API base URL.
 * API_BASE_URL = "http://localhost:3000/api" → upload = "http://localhost:3000/api/upload"
 */
const UPLOAD_URL = `${API_BASE_URL}/upload`;

interface ImageUploaderProps {
  /** Current list of image URLs */
  value: string[];
  /** Callback when image list changes */
  onChange: (urls: string[]) => void;
  /** Clerk auth token getter */
  getToken: () => Promise<string | null>;
  /** Maximum number of images allowed (default 10) */
  maxImages?: number;
  /** Whether the uploader is disabled */
  disabled?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  getToken,
  maxImages = 10,
  disabled = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const token = await getToken();
      if (!token) {
        setError("Vui lòng đăng nhập lại để upload ảnh.");
        return;
      }

      const remaining = maxImages - value.length;
      if (remaining <= 0) {
        setError(`Tối đa ${maxImages} ảnh.`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remaining);

      setUploading(true);
      setError(null);

      const uploadedUrls: string[] = [];
      const errors: string[] = [];

      for (const file of filesToUpload) {
        console.log("Verifying file:", file.name, file.type);
        // Validate client-side
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          errors.push(`${file.name}: Chỉ chấp nhận JPEG, PNG, WebP.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`${file.name}: Vượt quá 5MB.`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(UPLOAD_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            const msg =
              typeof errBody.message === "string"
                ? errBody.message
                : `Lỗi upload (${response.status})`;
            errors.push(`${file.name}: ${msg}`);
            continue;
          }

          const result = (await response.json()) as { url?: string; data?: { url?: string } };
          const url = result.url ?? result.data?.url;

          if (url) {
            uploadedUrls.push(url);
          } else {
            errors.push(`${file.name}: Không nhận được URL từ server.`);
          }
        } catch (err) {
          errors.push(
            `${file.name}: ${err instanceof Error ? err.message : "Upload thất bại."}`,
          );
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls]);
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      setUploading(false);

      // Reset file input so user can re-select the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [getToken, maxImages, onChange, value],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [onChange, value],
  );

  return (
    <div className="grid gap-3">
      {/* Upload area */}
      <div
        className={cn(
          "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40",
          disabled && "pointer-events-none opacity-50",
          uploading && "pointer-events-none",
        )}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Đang tải ảnh lên...</span>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              Nhấn để chọn ảnh hoặc kéo thả
            </span>
            <span className="text-xs text-slate-400">
              JPEG, PNG, WebP — tối đa 5MB mỗi ảnh — tối đa {maxImages} ảnh
            </span>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
      </div>

      {/* Error message */}
      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans">{error}</pre>
        </div>
      ) : null}

      {/* Preview grid */}
      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => {
            const safeUrl = getSafeImageUrl(url);
            const isPlaceholder = safeUrl === VENUE_PLACEHOLDER_IMAGE;

            return (
              <div
                key={`${url}-${index}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <Image
                  src={safeUrl}
                  alt={`Ảnh sân ${index + 1}`}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  unoptimized={safeUrl.startsWith("http://localhost")}
                />

                {isPlaceholder ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-lg bg-red-500/80 px-2 py-1 text-xs font-medium text-white">
                      URL không hợp lệ
                    </span>
                  </div>
                ) : null}

                {/* Remove button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Index badge */}
                <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
