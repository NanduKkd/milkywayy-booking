"use client";

import { cva } from "class-variance-authority";
import { AlertCircle, CircleOff, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const adminCardVariants = cva("admin-panel min-w-0 rounded-xl", {
  variants: {
    tone: {
      default: "",
      subtle: "admin-panel-subtle",
      muted: "admin-panel-muted",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const adminBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold",
  {
    variants: {
      tone: {
        neutral:
          "border-[hsl(var(--admin-border)/0.92)] bg-[hsl(var(--admin-surface-soft)/0.42)] text-[hsl(var(--admin-muted))]",
        success:
          "border-[hsl(var(--admin-success)/0.28)] bg-[hsl(var(--admin-success)/0.14)] text-[hsl(var(--admin-success))]",
        warning:
          "border-[hsl(var(--admin-warning)/0.28)] bg-[hsl(var(--admin-warning)/0.14)] text-[hsl(var(--admin-warning))]",
        danger:
          "border-[hsl(var(--admin-danger)/0.26)] bg-[hsl(var(--admin-danger)/0.14)] text-[hsl(var(--admin-danger))]",
        info: "border-[hsl(var(--admin-info)/0.26)] bg-[hsl(var(--admin-info)/0.14)] text-[hsl(var(--admin-info))]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

const adminMessageVariants = cva(
  "admin-panel-subtle rounded-xl border px-3 py-3",
  {
    variants: {
      tone: {
        neutral: "border-[hsl(var(--admin-border)/0.82)]",
        info: "border-[hsl(var(--admin-info)/0.32)]",
        warning: "border-[hsl(var(--admin-warning)/0.32)]",
        danger: "border-[hsl(var(--admin-danger)/0.32)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export function AdminPage({ className, ...props }) {
  return <div className={cn("space-y-5", className)} {...props} />;
}

export function AdminPageHeader({
  eyebrow,
  title,
  actions,
  className,
  children,
}) {
  return (
    <section className={cn("admin-toolbar min-h-10 gap-4", className)}>
      <div>
        {eyebrow ? <p className="admin-kicker">{eyebrow}</p> : null}
        {title ? <h1 className="admin-title mt-0.5">{title}</h1> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}

export function AdminCard({ className, tone, ...props }) {
  return (
    <Card
      className={cn(
        adminCardVariants({ tone }),
        "text-[hsl(var(--admin-foreground))]",
        className,
      )}
      {...props}
    />
  );
}

export function AdminCardHeader({ className, ...props }) {
  return <CardHeader className={cn("gap-2 p-4", className)} {...props} />;
}

export function AdminCardTitle({ className, ...props }) {
  return (
    <CardTitle
      className={cn("text-sm font-semibold tracking-[-0.015em]", className)}
      {...props}
    />
  );
}

export function AdminCardDescription({ className, ...props }) {
  return (
    <CardDescription
      className={cn(
        "text-xs leading-4 text-[hsl(var(--admin-muted))]",
        className,
      )}
      {...props}
    />
  );
}

export function AdminCardContent({ className, ...props }) {
  return <CardContent className={cn("p-4 pt-0", className)} {...props} />;
}

export function AdminBadge({ className, tone, ...props }) {
  return (
    <Badge className={cn(adminBadgeVariants({ tone }), className)} {...props} />
  );
}

export function AdminToolbar({ className, ...props }) {
  return <div className={cn("admin-toolbar", className)} {...props} />;
}

export function AdminFilterRow({ className, ...props }) {
  return <div className={cn("admin-filter-row", className)} {...props} />;
}

export function AdminFilterChip({
  className,
  active = false,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      data-active={active ? "true" : "false"}
      className={cn("admin-filter-chip", className)}
      {...props}
    />
  );
}

export function AdminSearchField({
  className,
  inputClassName,
  iconClassName,
  ...props
}) {
  return (
    <div className={cn("relative min-w-[200px] flex-1", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--admin-muted))]",
          iconClassName,
        )}
      />
      <Input
        className={cn(
          "admin-input h-9 rounded-lg pl-10 text-sm",
          inputClassName,
        )}
        {...props}
      />
    </div>
  );
}

export function AdminTablePanel({
  title,
  description,
  actions,
  className,
  children,
}) {
  return (
    <section className={cn("admin-table-shell", className)}>
      {title || description || actions ? (
        <div className="admin-toolbar gap-3 border-b border-white/8 px-4 py-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold tracking-[-0.015em] text-[hsl(var(--admin-foreground))]">
                {title}
              </h2>
            ) : null}
            {description ? <p className="sr-only">{description}</p> : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className="admin-table-scroll">{children}</div>
    </section>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon = CircleOff,
  className,
}) {
  return (
    <div className={cn("admin-empty-state", className)}>
      <div className="admin-empty-state-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-md text-xs leading-5 text-[hsl(var(--admin-muted))]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AdminInlineMessage({
  title,
  description,
  tone,
  loading = false,
  className,
}) {
  const Icon = loading ? Loader2 : AlertCircle;

  return (
    <div className={cn(adminMessageVariants({ tone }), className)}>
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--admin-muted))]",
            loading && "animate-spin",
          )}
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
            {title}
          </p>
          {description ? (
            <p className="text-xs leading-5 text-[hsl(var(--admin-muted))]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminDialogContent({
  title,
  description,
  className,
  children,
  ...props
}) {
  return (
    <DialogContent className={cn("admin-dialog", className)} {...props}>
      {title || description ? (
        <DialogHeader className="space-y-2">
          {title ? (
            <DialogTitle className="text-base tracking-[-0.02em] text-[hsl(var(--admin-foreground))]">
              {title}
            </DialogTitle>
          ) : null}
          {description ? (
            <DialogDescription className="sr-only">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
      ) : null}
      {children}
    </DialogContent>
  );
}

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  confirmPendingLabel = "Working...",
  cancelLabel = "Cancel",
  confirmTone = "danger",
  confirmDisabled = false,
  confirmPending = false,
  onConfirm,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AdminDialogContent
        title={title}
        description={description}
        className="sm:max-w-lg"
      >
        {children ? <div className="space-y-4">{children}</div> : null}
        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={confirmPending}
            className="rounded-full border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || confirmPending}
            className={cn(
              "rounded-full px-5 text-[hsl(var(--admin-foreground))]",
              confirmTone === "danger"
                ? "border border-[hsl(var(--admin-danger)/0.4)] bg-[hsl(var(--admin-danger)/0.18)] hover:bg-[hsl(var(--admin-danger)/0.26)] hover:text-[hsl(var(--admin-foreground))]"
                : "border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]",
            )}
          >
            {confirmPending ? confirmPendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
