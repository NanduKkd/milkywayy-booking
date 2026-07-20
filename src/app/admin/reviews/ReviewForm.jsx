"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.string().min(2, "Role must be at least 2 characters"),
  company: z.string().min(2, "Company must be at least 2 characters"),
  quote: z.string().min(8, "Review text must be at least 8 characters"),
  rating: z.coerce.number().min(1).max(5),
  source: z.string().min(2).default("Google"),
  featured: z.boolean().default(false),
  order: z.coerce.number().default(0),
  isVisible: z.boolean().default(true),
});

const INPUT_CLASS =
  "admin-input h-9 rounded-lg border-[hsl(var(--admin-border)/0.9)] bg-[hsl(var(--admin-background-deep)/0.66)] px-4 text-[hsl(var(--admin-foreground))]";
const TEXTAREA_CLASS =
  "admin-input min-h-32 rounded-xl border-[hsl(var(--admin-border)/0.9)] bg-[hsl(var(--admin-background-deep)/0.66)] px-4 py-3 text-[hsl(var(--admin-foreground))]";
const TOGGLE_PANEL_CLASS =
  "admin-panel-muted flex items-center justify-between rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-4";
const SUBMIT_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";

export default function ReviewForm({
  onSuccess,
  initialData,
  nextOrderByFeatured,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasManualOrder, setHasManualOrder] = useState(Boolean(initialData));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      role: "",
      company: "",
      quote: "",
      rating: 5,
      source: "Google",
      featured: false,
      order: nextOrderByFeatured?.standard ?? 0,
      isVisible: true,
    },
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);

    try {
      const url = initialData
        ? `/api/admin/reviews/${initialData.id}`
        : "/api/admin/reviews";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save review");

      const savedItem = await res.json();
      toast.success(initialData ? "Review updated" : "Review created");
      onSuccess(savedItem);
    } catch (_error) {
      toast.error("Error saving review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerOrderField = register("order", {
    onChange: () => setHasManualOrder(true),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
          >
            Client name
          </Label>
          <Input
            id="name"
            className={INPUT_CLASS}
            placeholder="Sarah Al-Mansouri"
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-[hsl(var(--admin-danger))]">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="company"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
          >
            Company
          </Label>
          <Input
            id="company"
            className={INPUT_CLASS}
            placeholder="Emaar Properties"
            {...register("company")}
          />
          {errors.company ? (
            <p className="text-sm text-[hsl(var(--admin-danger))]">
              {errors.company.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-2">
          <Label
            htmlFor="role"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
          >
            Role
          </Label>
          <Input
            id="role"
            className={INPUT_CLASS}
            placeholder="Senior Agent"
            {...register("role")}
          />
          {errors.role ? (
            <p className="text-sm text-[hsl(var(--admin-danger))]">
              {errors.role.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="source"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
          >
            Source
          </Label>
          <Input
            id="source"
            className={INPUT_CLASS}
            placeholder="Google"
            {...register("source")}
          />
          {errors.source ? (
            <p className="text-sm text-[hsl(var(--admin-danger))]">
              {errors.source.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="quote"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
        >
          Review quote
        </Label>
        <Textarea
          id="quote"
          rows={5}
          className={TEXTAREA_CLASS}
          placeholder="Share the client review text..."
          {...register("quote")}
        />
        {errors.quote ? (
          <p className="text-sm text-[hsl(var(--admin-danger))]">
            {errors.quote.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="rating"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
          >
            Rating (1-5)
          </Label>
          <Input
            id="rating"
            type="number"
            min="1"
            max="5"
            className={INPUT_CLASS}
            {...register("rating")}
          />
          {errors.rating ? (
            <p className="text-sm text-[hsl(var(--admin-danger))]">
              {errors.rating.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="order"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
          >
            Within-group order
          </Label>
          <Input
            id="order"
            type="number"
            className={INPUT_CLASS}
            {...registerOrderField}
          />
          <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
            Drag ordering on the main list is the fastest way to adjust the live
            sequence for Featured or Standard reviews.
          </p>
          {errors.order ? (
            <p className="text-sm text-[hsl(var(--admin-danger))]">
              {errors.order.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={TOGGLE_PANEL_CLASS}>
          <div className="space-y-1">
            <Label
              htmlFor="featured"
              className="text-sm font-semibold text-[hsl(var(--admin-foreground))]"
            >
              Featured review
            </Label>
            <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              Featured reviews always render before the standard group.
            </p>
          </div>
          <Switch
            id="featured"
            checked={watch("featured")}
            onCheckedChange={(checked) => {
              setValue("featured", checked, { shouldDirty: true });

              if (!initialData && !hasManualOrder && nextOrderByFeatured) {
                setValue(
                  "order",
                  checked
                    ? nextOrderByFeatured.featured
                    : nextOrderByFeatured.standard,
                  { shouldDirty: true },
                );
              }
            }}
          />
        </div>

        <div className={TOGGLE_PANEL_CLASS}>
          <div className="space-y-1">
            <Label
              htmlFor="isVisible"
              className="text-sm font-semibold text-[hsl(var(--admin-foreground))]"
            >
              Visible on site
            </Label>
            <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              Hidden reviews stay editable in admin but disappear from the
              public landing page.
            </p>
          </div>
          <Switch
            id="isVisible"
            checked={watch("isVisible")}
            onCheckedChange={(checked) =>
              setValue("isVisible", checked, { shouldDirty: true })
            }
          />
        </div>
      </div>

      <Button
        type="submit"
        className={`${SUBMIT_BUTTON_CLASS} w-full`}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {initialData ? "Update Review" : "Create Review"}
      </Button>
    </form>
  );
}
