"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X, GripVertical } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
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

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  subtitle: z.string().optional(),
  type: z.enum(Object.values(OUR_WORK_TYPES)),
  thumbnail: z.string().optional(),
  mediaContent: z.union([z.string(), z.array(z.string())]).refine((val) => {
    if (Array.isArray(val)) return val.length > 0;
    return val.length > 0;
  }, "Media content is required"),
  order: z.coerce.number().default(0),
  isVisible: z.boolean().default(true),
});

export default function PortfolioForm({ onSuccess, initialData }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dragSourceIndexRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: "",
      subtitle: "",
      type: OUR_WORK_TYPES.IMAGE,
      thumbnail: "",
      mediaContent: "",
      order: 0,
      isVisible: true,
    },
  });

  const watchType = watch("type");
  const watchMediaContent = watch("mediaContent");
  const watchThumbnail = watch("thumbnail");

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "portfolio");

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
        setValue("mediaContent", [...currentContent, ...uploadedUrls]);
      } else {
        setValue("mediaContent", uploadedUrls[0]);
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
      // Reset input
      e.target.value = "";
    }
  };

  const removeImage = (index) => {
    if (!Array.isArray(watchMediaContent)) return;
    const newContent = [...watchMediaContent];
    newContent.splice(index, 1);
    setValue("mediaContent", newContent.length === 0 ? "" : newContent);
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
    setValue("mediaContent", items);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <Input type="hidden" {...register("thumbnail")} />
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Project Title" {...register("title")} />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          placeholder="Location or Category"
          {...register("subtitle")}
        />
        {errors.subtitle && (
          <p className="text-sm text-destructive">{errors.subtitle.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Media Type</Label>
        <Select
          onValueChange={(val) => {
            setValue("type", val);
            // If switching to image, ensure mediaContent is an array if it was a string
            if (val === OUR_WORK_TYPES.IMAGE && typeof watchMediaContent === "string" && watchMediaContent) {
              setValue("mediaContent", [watchMediaContent]);
            }
          }}
          defaultValue={watchType}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OUR_WORK_TYPES).map(([key, value]) => (
              <SelectItem key={value} value={value}>
                {key.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          {watchType === OUR_WORK_TYPES.IMAGE ? "Images" : "Media URL"}
        </Label>
        
        {watchType === OUR_WORK_TYPES.IMAGE ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 p-2 border rounded-md min-h-[100px] bg-muted/20">
              {Array.isArray(watchMediaContent) && watchMediaContent.map((url, index) => (
                <div
                  key={`${url}_${index}`}
                  className="relative group w-24 h-24 border rounded-md overflow-hidden bg-background"
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropOnImage(index)}
                >
                  <img
                    src={url}
                    alt={`Work ${index}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 p-0.5 bg-black/50 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical className="h-3 w-3" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-0.5 bg-destructive rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="w-24 h-24 border-2 border-dashed rounded-md flex items-center justify-center">
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
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              id="mediaContent"
              placeholder="YouTube / Instagram / Panoee Link"
              {...register("mediaContent")}
            />
          </div>
        )}
        {errors.mediaContent && (
          <p className="text-sm text-destructive">
            {errors.mediaContent.message}
          </p>
        )}
      </div>

      {watchType === OUR_WORK_TYPES.THREE_SIXTY && (
        <div className="space-y-2">
          <Label>360 Thumbnail (for cards/modal preview)</Label>
          <div className="flex gap-2">
            <Input
              id="thumbnail"
              placeholder="https://... thumbnail image URL"
              value={watchThumbnail || ""}
              onChange={(e) => setValue("thumbnail", e.target.value)}
            />
            <Input
              type="file"
              className="hidden"
              id="portfolio-thumbnail-upload"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("folder", "portfolio");
                  const res = await fetch("/api/admin/upload", {
                    method: "POST",
                    body: formData,
                  });
                  if (!res.ok) throw new Error("Thumbnail upload failed");
                  const { url } = await res.json();
                  setValue("thumbnail", url);
                  toast.success("Thumbnail uploaded");
                } catch (error) {
                  toast.error(error.message || "Failed to upload thumbnail");
                } finally {
                  setIsUploading(false);
                  e.target.value = "";
                }
              }}
            />
            <label
              htmlFor="portfolio-thumbnail-upload"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              Upload
            </label>
          </div>
          {watchThumbnail && (
            <div className="relative w-44 h-24 rounded-md overflow-hidden border border-border">
              <img
                src={watchThumbnail}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="order">Display Order</Label>
        <Input id="order" type="number" {...register("order")} />
        {errors.order && (
          <p className="text-sm text-destructive">{errors.order.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? "Update Entry" : "Create Entry"}
      </Button>
    </form>
  );
}
