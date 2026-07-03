"use client";

import { cva } from "class-variance-authority";
import { AlertCircle, CircleOff, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const adminCardVariants = cva("admin-panel rounded-[1.75rem]", {
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
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em]",
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
  "admin-panel-subtle rounded-[1.4rem] border px-4 py-4",
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
  return <div className={cn("space-y-8", className)} {...props} />;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}) {
  return (
    <section
      className={cn(
        "admin-toolbar gap-5 rounded-[1.8rem] border border-white/8 bg-white/[0.02] px-5 py-5 sm:px-6",
        className,
      )}
    >
      <div className="space-y-3">
        {eyebrow ? <p className="admin-kicker">{eyebrow}</p> : null}
        {title ? <h1 className="admin-title">{title}</h1> : null}
        {description ? (
          <p className="admin-copy max-w-3xl">{description}</p>
        ) : null}
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
  return <CardHeader className={cn("gap-3 p-6", className)} {...props} />;
}

export function AdminCardTitle({ className, ...props }) {
  return (
    <CardTitle
      className={cn("text-xl font-semibold tracking-[-0.025em]", className)}
      {...props}
    />
  );
}

export function AdminCardDescription({ className, ...props }) {
  return (
    <CardDescription
      className={cn(
        "text-sm leading-6 text-[hsl(var(--admin-muted))]",
        className,
      )}
      {...props}
    />
  );
}

export function AdminCardContent({ className, ...props }) {
  return <CardContent className={cn("p-6 pt-0", className)} {...props} />;
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
    <div className={cn("relative min-w-[220px] flex-1", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--admin-muted))]",
          iconClassName,
        )}
      />
      <Input
        className={cn("admin-input h-11 rounded-2xl pl-10", inputClassName)}
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
        <div className="admin-toolbar gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <div className="space-y-1.5">
            {title ? (
              <h2 className="text-base font-semibold tracking-[-0.02em] text-[hsl(var(--admin-foreground))]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm text-[hsl(var(--admin-muted))]">
                {description}
              </p>
            ) : null}
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
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-6 text-[hsl(var(--admin-muted))]">
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
            <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
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
        <DialogHeader className="space-y-3">
          {title ? (
            <DialogTitle className="text-xl tracking-[-0.03em] text-[hsl(var(--admin-foreground))]">
              {title}
            </DialogTitle>
          ) : null}
          {description ? (
            <DialogDescription className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
      ) : null}
      {children}
    </DialogContent>
  );
}
