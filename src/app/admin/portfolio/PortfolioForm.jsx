"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { AdminInlineMessage } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";

const INPUT_CLASS =
  "admin-input h-9 rounded-lg border-[hsl(var(--admin-border)/0.9)] bg-[hsl(var(--admin-background-deep)/0.66)] text-[hsl(var(--admin-foreground))]";
const SELECT_TRIGGER_CLASS =
  "admin-input h-9 rounded-lg border-[hsl(var(--admin-border)/0.9)] bg-[hsl(var(--admin-background-deep)/0.66)] text-[hsl(var(--admin-foreground))]";
const SELECT_CONTENT_CLASS =
  "border-[hsl(var(--admin-border)/0.9)] bg-[hsl(var(--admin-surface-strong)/0.98)] text-[hsl(var(--admin-foreground))]";
const FIELD_LABEL_CLASS =
  "text-sm font-medium tracking-[0.01em] text-[hsl(var(--admin-foreground))]";
const PRIMARY_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";

const PORTFOLIO_TYPE_LABELS = {
  [OUR_WORK_TYPES.IMAGE]: "Photography",
  [OUR_WORK_TYPES.SHORT_VIDEO]: "Short Form Video",
  [OUR_WORK_TYPES.VIDEO]: "Long Form Video",
  [OUR_WORK_TYPES.THREE_SIXTY]: "360 Virtual Tour",
};

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  subtitle: z.string().optional(),
  type: z.enum(Object.values(OUR_WORK_TYPES)),
  thumbnail: z.string().optional(),
  mediaContent: z.union([z.string(), z.array(z.string())]).refine((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value.length > 0;
  }, "Media content is required"),
  order: z.coerce.number().default(0),
  isVisible: z.boolean().default(true),
});

const getDefaultValues = (initialData) => {
  if (!initialData) {
    return {
      title: "",
      subtitle: "",
      type: OUR_WORK_TYPES.IMAGE,
      thumbnail: "",
      mediaContent: [],
      order: 0,
      isVisible: true,
    };
  }

  const type = initialData.type || OUR_WORK_TYPES.IMAGE;
  const mediaContent = Array.isArray(initialData.mediaContent)
    ? initialData.mediaContent
    : initialData.mediaContent
      ? [initialData.mediaContent]
      : [];

  return {
    title: initialData.title || "",
    subtitle: initialData.subtitle || "",
    type,
    thumbnail: initialData.thumbnail || "",
    mediaContent:
      type === OUR_WORK_TYPES.IMAGE
        ? mediaContent
        : mediaContent[0] || initialData.mediaContent || "",
    order: initialData.order ?? 0,
    isVisible: initialData.isVisible ?? true,
  };
};

export default function PortfolioForm({ onSuccess, initialData }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dragSourceIndexRef = useRef(null);
  const hasMountedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(initialData),
  });

  const watchType = watch("type");
  const watchMediaContent = watch("mediaContent");
  const watchThumbnail = watch("thumbnail");

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    reset(getDefaultValues(initialData));
  }, [initialData, reset]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "portfolio");
        formData.append("deliverableType", watchType);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);

        const { url } = await res.json();
        uploadedUrls.push(url);
      }

      if (watchType === OUR_WORK_TYPES.IMAGE) {
        const currentContent = Array.isArray(watchMediaContent)
          ? watchMediaContent
          : watchMediaContent
            ? [watchMediaContent]
            : [];
        setValue("mediaContent", [...currentContent, ...uploadedUrls], {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        setValue("mediaContent", uploadedUrls[0], {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      toast.success(
        uploadedUrls.length > 1
          ? `${uploadedUrls.length} images uploaded`
          : "Image uploaded successfully",
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Error uploading image");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = (index) => {
    if (!Array.isArray(watchMediaContent)) return;
    const newContent = [...watchMediaContent];
    newContent.splice(index, 1);
    setValue("mediaContent", newContent, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleDragStart = (index) => {
    dragSourceIndexRef.current = index;
  };

  const handleDropOnImage = (targetIndex) => {
    if (!Array.isArray(watchMediaContent)) return;
    const sourceIndex = dragSourceIndexRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const items = Array.from(watchMediaContent);
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, moved);
    setValue("mediaContent", items, {
      shouldDirty: true,
      shouldValidate: true,
    });
    dragSourceIndexRef.current = null;
  };

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const url = initialData
        ? `/api/admin/our-works/${initialData.id}`
        : "/api/admin/our-works";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save");

      const savedItem = await res.json();
      toast.success(initialData ? "Entry updated" : "Entry created");
      onSuccess(savedItem);
    } catch (_error) {
      toast.error("Error saving entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
      <AdminInlineMessage
        tone="neutral"
        title="Live content editor"
        description="Uploads, visibility, and ordering still use the current production workflow. Media links and image stacks are saved exactly as before."
      />

      <div className="space-y-2">
        <Label htmlFor="title" className={FIELD_LABEL_CLASS}>
          Title
        </Label>
        <Input
          id="title"
          className={INPUT_CLASS}
          placeholder="Project title"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle" className={FIELD_LABEL_CLASS}>
          Subtitle
        </Label>
        <Input
          id="subtitle"
          className={INPUT_CLASS}
          placeholder="Location, service, or category"
          {...register("subtitle")}
        />
        {errors.subtitle && (
          <p className="text-sm text-destructive">{errors.subtitle.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL_CLASS}>Media Type</Label>
        <Select
          value={watchType}
          onValueChange={(value) => {
            setValue("type", value, {
              shouldDirty: true,
              shouldValidate: true,
            });

            if (value === OUR_WORK_TYPES.IMAGE) {
              const imageContent = Array.isArray(watchMediaContent)
                ? watchMediaContent
                : watchMediaContent
                  ? [watchMediaContent]
                  : [];
              setValue("mediaContent", imageContent, {
                shouldDirty: true,
                shouldValidate: true,
              });
              return;
            }

            const mediaUrl = Array.isArray(watchMediaContent)
              ? watchMediaContent[0] || ""
              : watchMediaContent || "";
            setValue("mediaContent", mediaUrl, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        >
          <SelectTrigger className={SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            {Object.values(OUR_WORK_TYPES).map((value) => (
              <SelectItem key={value} value={value}>
                {PORTFOLIO_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL_CLASS}>
          {watchType === OUR_WORK_TYPES.IMAGE ? "Images" : "Media URL"}
        </Label>

        {watchType === OUR_WORK_TYPES.IMAGE ? (
          <div className="rounded-xl border border-[hsl(var(--admin-border)/0.82)] bg-[hsl(var(--admin-surface-soft)/0.3)] p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                Image gallery
              </p>
              <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
                Upload one or more images, then drag thumbnails to set the
                per-entry gallery order.
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.isArray(watchMediaContent) &&
                watchMediaContent.map((url, index) => (
                  <li
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-[hsl(var(--admin-border)/0.82)] bg-[hsl(var(--admin-background-deep)/0.72)]"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDropOnImage(index)}
                  >
                    <Image
                      src={url}
                      alt={`Work ${index}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.14em]">
                        <GripVertical className="h-3 w-3" />
                        Drag
                      </span>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--admin-danger)/0.88)] text-white"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}

              <li className="aspect-square rounded-lg border border-dashed border-[hsl(var(--admin-border-strong)/0.92)] bg-[hsl(var(--admin-background-deep)/0.48)]">
                <div className="flex h-full items-center justify-center p-3">
                  <div className="w-full">
                    <Input
                      type="file"
                      className="hidden"
                      id="portfolio-upload"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="portfolio-upload"
                      className="flex h-full min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[1rem] text-center transition-colors hover:bg-white/[0.04]"
                    >
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--admin-muted))]" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-[hsl(var(--admin-muted))]" />
                          <span className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
                            Upload images
                          </span>
                          <span className="text-xs leading-5 text-[hsl(var(--admin-muted))]">
                            JPG, PNG, or WebP
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        ) : (
          <Input
            id="mediaContent"
            className={INPUT_CLASS}
            placeholder="YouTube, Instagram, or Panoee link"
            {...register("mediaContent")}
          />
        )}
        {errors.mediaContent && (
          <p className="text-sm text-destructive">
            {errors.mediaContent.message}
          </p>
        )}
      </div>

      {watchType === OUR_WORK_TYPES.THREE_SIXTY ? (
        <div className="space-y-3">
          <Label className={FIELD_LABEL_CLASS}>
            360 Thumbnail (for cards and modal preview)
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="thumbnail"
              className={INPUT_CLASS}
              placeholder="https://... thumbnail image URL"
              value={watchThumbnail || ""}
              onChange={(event) =>
                setValue("thumbnail", event.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <Input
              type="file"
              className="hidden"
              id="portfolio-thumbnail-upload"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("folder", "portfolio");
                  formData.append("deliverableType", watchType);
                  const res = await fetch("/api/admin/upload", {
                    method: "POST",
                    body: formData,
                  });
                  if (!res.ok) throw new Error("Thumbnail upload failed");
                  const { url } = await res.json();
                  setValue("thumbnail", url, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  toast.success("Thumbnail uploaded");
                } catch (error) {
                  toast.error(error.message || "Failed to upload thumbnail");
                } finally {
                  setIsUploading(false);
                  event.target.value = "";
                }
              }}
            />
            <label
              htmlFor="portfolio-thumbnail-upload"
              className="inline-flex h-9 min-w-[132px] cursor-pointer items-center justify-center rounded-full border border-[hsl(var(--admin-border)/0.88)] px-4 text-sm font-medium text-[hsl(var(--admin-foreground))] transition-colors hover:bg-white/[0.05]"
            >
              Upload thumbnail
            </label>
          </div>
          {watchThumbnail ? (
            <div className="overflow-hidden rounded-lg border border-[hsl(var(--admin-border)/0.82)] bg-[hsl(var(--admin-background-deep)/0.72)]">
              <Image
                src={watchThumbnail}
                alt="Thumbnail preview"
                width={224}
                height={128}
                unoptimized
                className="h-32 w-full object-cover sm:w-56"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="order" className={FIELD_LABEL_CLASS}>
          Display Order
        </Label>
        <Input
          id="order"
          type="number"
          className={INPUT_CLASS}
          {...register("order")}
        />
        <p className="text-xs leading-5 text-[hsl(var(--admin-muted))]">
          Dragging rows in the portfolio list will keep this field in sync with
          the live global order.
        </p>
        {errors.order && (
          <p className="text-sm text-destructive">{errors.order.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className={PRIMARY_BUTTON_CLASS}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Entry" : "Create Entry"}
        </Button>
      </div>
    </form>
  );
}
