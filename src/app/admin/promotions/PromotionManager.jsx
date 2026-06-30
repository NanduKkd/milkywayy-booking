"use client";

import {
  BadgePercent,
  CirclePause,
  CirclePlay,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  activateAdminPromotion,
  createAdminPromotion,
  deactivateAdminPromotion,
  pauseAdminPromotion,
  updateAdminPromotion,
} from "@/lib/actions/promotions";
import { cn } from "@/lib/utils";

const TAB_CONFIG = [
  {
    value: "GENERIC",
    label: "Generic Codes",
    shortLabel: "Generic",
    description:
      "Entered at checkout when the code beats any auto-applied offer.",
    icon: Tag,
    emptyTitle: "No generic codes yet",
    emptyCopy: "Create the first checkout code for public or partner use.",
  },
  {
    value: "PERSONAL",
    label: "Personal Auto-Apply",
    shortLabel: "Personal",
    description:
      "Customer-specific offers that will be assigned in the next task.",
    icon: UserRound,
    emptyTitle: "No personal promotions yet",
    emptyCopy:
      "Create the offer definitions now; customer assignment search lands in PRM-202.",
  },
  {
    value: "AUTOMATIC",
    label: "Automatic Discounts",
    shortLabel: "Automatic",
    description:
      "Rule-based benefits for first booking, second booking, date ranges, and any paid booking.",
    icon: Sparkles,
    emptyTitle: "No automatic promotions yet",
    emptyCopy:
      "Create deterministic rules that the booking flow can evaluate without a code.",
  },
];

const KIND_SORT_ORDER = {
  GENERIC: 0,
  PERSONAL: 1,
  AUTOMATIC: 2,
};

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  DRAFT: "bg-slate-500/15 text-slate-200 border-slate-500/20",
  PAUSED: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  DEACTIVATED: "bg-rose-500/15 text-rose-300 border-rose-500/20",
};

const BENEFIT_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage off" },
  { value: "FIXED", label: "Fixed amount off" },
];

const CREATE_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
];

const AUTOMATIC_TRIGGER_OPTIONS = [
  { value: "FIRST_PAID_BOOKING", label: "First paid booking" },
  { value: "SECOND_PAID_BOOKING", label: "Second paid booking" },
  { value: "ANY_PAID_BOOKING", label: "Any paid booking" },
  { value: "DATE_RANGE", label: "Date range" },
];

function createEmptyForm(kind) {
  return {
    id: null,
    kind,
    code: "",
    name: "",
    adminDescription: "",
    customerMessage: "",
    benefitType: "PERCENTAGE",
    benefitValue: "",
    benefitCap: "",
    minimumSpend: "0",
    startsAt: "",
    endsAt: "",
    status: "DRAFT",
    priority: "0",
    perUserLimit: "",
    totalLimit: "",
    triggerType: kind === "AUTOMATIC" ? "ANY_PAID_BOOKING" : "NONE",
    triggerStartDate: "",
    triggerEndDate: "",
  };
}

function sortPromotions(promotions) {
  return [...promotions].sort((left, right) => {
    const leftKind = KIND_SORT_ORDER[left.kind] ?? Number.MAX_SAFE_INTEGER;
    const rightKind = KIND_SORT_ORDER[right.kind] ?? Number.MAX_SAFE_INTEGER;

    if (leftKind !== rightKind) {
      return leftKind - rightKind;
    }

    const priorityDelta =
      Number(right.priority || 0) - Number(left.priority || 0);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const createdAtDelta =
      new Date(right.createdAt || 0).getTime() -
      new Date(left.createdAt || 0).getTime();
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return Number(right.id || 0) - Number(left.id || 0);
  });
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function toFormState(promotion) {
  return {
    id: promotion.id,
    kind: promotion.kind,
    code: promotion.code || "",
    name: promotion.name || "",
    adminDescription: promotion.adminDescription || "",
    customerMessage: promotion.customerMessage || "",
    benefitType: promotion.benefitType || "PERCENTAGE",
    benefitValue:
      promotion.benefitValue == null ? "" : String(promotion.benefitValue),
    benefitCap:
      promotion.benefitCap == null ? "" : String(promotion.benefitCap),
    minimumSpend:
      promotion.minimumSpend == null ? "0" : String(promotion.minimumSpend),
    startsAt: toDateTimeLocalValue(promotion.startsAt),
    endsAt: toDateTimeLocalValue(promotion.endsAt),
    status: promotion.status || "DRAFT",
    priority: String(promotion.priority || 0),
    perUserLimit:
      promotion.perUserLimit == null ? "" : String(promotion.perUserLimit),
    totalLimit:
      promotion.totalLimit == null ? "" : String(promotion.totalLimit),
    triggerType: promotion.triggerType || "NONE",
    triggerStartDate: promotion.triggerConfig?.startDate || "",
    triggerEndDate: promotion.triggerConfig?.endDate || "",
  };
}

function buildPayload(formData, { includeStatus }) {
  const payload = {
    kind: formData.kind,
    code: formData.kind === "GENERIC" ? formData.code : null,
    name: formData.name,
    adminDescription: formData.adminDescription,
    customerMessage: formData.customerMessage,
    benefitType: formData.benefitType,
    benefitValue: formData.benefitValue,
    benefitCap:
      formData.benefitType === "PERCENTAGE" ? formData.benefitCap : null,
    minimumSpend: formData.minimumSpend,
    startsAt: formData.startsAt || null,
    endsAt: formData.endsAt || null,
    priority: formData.priority,
    perUserLimit: formData.perUserLimit || null,
    totalLimit: formData.totalLimit || null,
    triggerType: formData.kind === "AUTOMATIC" ? formData.triggerType : "NONE",
    triggerConfig:
      formData.kind === "AUTOMATIC" && formData.triggerType === "DATE_RANGE"
        ? {
            startDate: formData.triggerStartDate,
            endDate: formData.triggerEndDate,
          }
        : {},
  };

  if (includeStatus) {
    payload.status = formData.status;
  }

  return payload;
}

function formatCurrency(amount) {
  return `AED ${Number(amount || 0).toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Always on";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-AE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBenefit(promotion) {
  if (promotion.benefitType === "FIXED") {
    return `${formatCurrency(promotion.benefitValue)} off`;
  }

  const cap =
    promotion.benefitCap == null
      ? ""
      : ` up to ${formatCurrency(promotion.benefitCap)}`;

  return `${promotion.benefitValue}% off${cap}`;
}

function formatTrigger(promotion) {
  if (promotion.kind === "GENERIC") {
    return "Entered code";
  }

  if (promotion.kind === "PERSONAL") {
    return "Assigned customer";
  }

  switch (promotion.triggerType) {
    case "FIRST_PAID_BOOKING":
      return "First paid booking";
    case "SECOND_PAID_BOOKING":
      return "Second paid booking";
    case "ANY_PAID_BOOKING":
      return "Any paid booking";
    case "DATE_RANGE":
      return `${promotion.triggerConfig?.startDate || "?"} to ${promotion.triggerConfig?.endDate || "?"}`;
    default:
      return "No trigger";
  }
}

function formatStatusLabel(status) {
  return String(status || "")
    .toLowerCase()
    .replace(/^\w/, (value) => value.toUpperCase());
}

function PromotionTable({
  promotions,
  onCreate,
  onEdit,
  onActivate,
  onPause,
  onDeactivate,
  pendingKey,
  tab,
}) {
  const EmptyIcon = tab.icon;

  if (promotions.length === 0) {
    return (
      <Card className="border-dashed border-white/15 bg-card/50">
        <CardContent className="flex flex-col gap-3 px-6 py-10 text-center">
          <div className="mx-auto rounded-full border border-white/10 bg-white/[0.03] p-3">
            <EmptyIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium">{tab.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{tab.emptyCopy}</p>
          </div>
          <div>
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create {tab.shortLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-card/70">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Promotion</TableHead>
                <TableHead>Benefit</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => {
                const isBusy = pendingKey === `promotion:${promotion.id}`;

                return (
                  <TableRow key={promotion.id} className="border-white/10">
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {promotion.code ? (
                            <Badge
                              variant="secondary"
                              className="tracking-[0.16em]"
                            >
                              {promotion.code}
                            </Badge>
                          ) : null}
                          <span className="font-medium text-foreground">
                            {promotion.name}
                          </span>
                        </div>
                        {promotion.adminDescription ? (
                          <p className="max-w-md text-sm text-muted-foreground">
                            {promotion.adminDescription}
                          </p>
                        ) : null}
                        {promotion.customerMessage ? (
                          <p className="text-xs text-sky-300/80">
                            Customer: {promotion.customerMessage}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-foreground">
                          {formatBenefit(promotion)}
                        </p>
                        <p className="text-muted-foreground">
                          Minimum spend:{" "}
                          {formatCurrency(promotion.minimumSpend)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{formatTrigger(promotion)}</p>
                        <p>
                          Usage:{" "}
                          {promotion.perUserLimit == null
                            ? "No per-user limit"
                            : `${promotion.perUserLimit} per user`}
                          {" / "}
                          {promotion.totalLimit == null
                            ? "No total limit"
                            : `${promotion.totalLimit} total`}
                        </p>
                        <p>
                          Window: {formatDateTime(promotion.startsAt)} to{" "}
                          {formatDateTime(promotion.endsAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            STATUS_STYLES[promotion.status],
                          )}
                        >
                          {formatStatusLabel(promotion.status)}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Priority {promotion.priority || 0}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(promotion)}
                          disabled={isBusy}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        {promotion.status === "ACTIVE" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            title="Pause promotion"
                            onClick={() => onPause(promotion)}
                            disabled={isBusy}
                          >
                            <CirclePause className="mr-2 h-4 w-4" />
                            Pause
                          </Button>
                        ) : promotion.status !== "DEACTIVATED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            title="Activate promotion"
                            onClick={() => onActivate(promotion)}
                            disabled={isBusy}
                          >
                            <CirclePlay className="mr-2 h-4 w-4" />
                            Activate
                          </Button>
                        ) : null}
                        {promotion.status !== "DEACTIVATED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                            title="Deactivate promotion"
                            onClick={() => onDeactivate(promotion)}
                            disabled={isBusy}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PromotionManager({
  initialPromotions,
  loadError = null,
}) {
  const [promotions, setPromotions] = useState(
    sortPromotions(initialPromotions || []),
  );
  const [activeTab, setActiveTab] = useState("GENERIC");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formData, setFormData] = useState(createEmptyForm("GENERIC"));
  const [errorMessage, setErrorMessage] = useState(loadError);
  const [pendingKey, setPendingKey] = useState(null);

  useEffect(() => {
    setPromotions(sortPromotions(initialPromotions || []));
  }, [initialPromotions]);

  useEffect(() => {
    setErrorMessage(loadError);
  }, [loadError]);

  const countsByKind = TAB_CONFIG.reduce((accumulator, tab) => {
    accumulator[tab.value] = promotions.filter(
      (promotion) => promotion.kind === tab.value,
    ).length;
    return accumulator;
  }, {});

  const upsertPromotion = (nextPromotion) => {
    setPromotions((currentPromotions) =>
      sortPromotions([
        ...currentPromotions.filter(
          (promotion) => promotion.id !== nextPromotion.id,
        ),
        nextPromotion,
      ]),
    );
  };

  const openCreateDialog = (kind) => {
    setErrorMessage(null);
    setFormMode("create");
    setFormData(createEmptyForm(kind));
    setActiveTab(kind);
    setDialogOpen(true);
  };

  const openEditDialog = (promotion) => {
    setErrorMessage(null);
    setFormMode("edit");
    setFormData(toFormState(promotion));
    setActiveTab(promotion.kind);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setPendingKey("dialog");
    setErrorMessage(null);

    const payload = buildPayload(formData, {
      includeStatus: formMode === "create",
    });

    const result =
      formMode === "create"
        ? await createAdminPromotion(payload)
        : await updateAdminPromotion(formData.id, payload);

    setPendingKey(null);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    upsertPromotion(result.data);
    setDialogOpen(false);
  };

  const handleStatusChange = async (promotion, action) => {
    setPendingKey(`promotion:${promotion.id}`);
    setErrorMessage(null);

    const result = await action(promotion.id);

    setPendingKey(null);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    upsertPromotion(result.data);
  };

  const handleDeactivate = async (promotion) => {
    if (!window.confirm(`Deactivate "${promotion.name}"?`)) {
      return;
    }

    await handleStatusChange(promotion, deactivateAdminPromotion);
  };

  const activeTabConfig =
    TAB_CONFIG.find((tab) => tab.value === activeTab) ?? TAB_CONFIG[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Promotions
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Promotion Management
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Manage generic codes, personal offers, and automatic rules in one
              deterministic admin surface while legacy Discounts and Coupons
              stay available during parity work.
            </p>
          </div>
        </div>
        <Button onClick={() => openCreateDialog(activeTab)}>
          <Plus className="mr-2 h-4 w-4" />
          Create {activeTabConfig.shortLabel}
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-rose-500/20 bg-rose-500/10">
          <CardContent className="px-5 py-4 text-sm text-rose-100">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-card/70">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Unified promotions</CardTitle>
              <CardDescription>
                One best promotion applies; wallet credit remains separate.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAB_CONFIG.map((tab) => (
                <Badge
                  key={tab.value}
                  variant="outline"
                  className="border-white/10"
                >
                  {tab.shortLabel}: {countsByKind[tab.value] || 0}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div
              role="tablist"
              aria-label="Promotion kinds"
              className="flex flex-wrap gap-2"
            >
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.value === activeTab;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    id={`promotion-tab-${tab.value}`}
                    aria-selected={isActive}
                    aria-controls={`promotion-panel-${tab.value}`}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-white/20 bg-white/10 text-foreground"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
                    )}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`promotion-panel-${activeTabConfig.value}`}
              aria-labelledby={`promotion-tab-${activeTabConfig.value}`}
              className="space-y-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">
                    {activeTabConfig.label}
                  </h2>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {activeTabConfig.description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openCreateDialog(activeTabConfig.value)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New {activeTabConfig.shortLabel}
                </Button>
              </div>

              {activeTabConfig.value === "PERSONAL" ? (
                <Card className="border-sky-500/20 bg-sky-500/10">
                  <CardContent className="px-5 py-4 text-sm text-sky-100">
                    Personal promotion creation is available now. Customer
                    assignment search and active-customer filtering land in
                    `PRM-202`.
                  </CardContent>
                </Card>
              ) : null}

              <PromotionTable
                promotions={promotions.filter(
                  (promotion) => promotion.kind === activeTabConfig.value,
                )}
                onCreate={() => openCreateDialog(activeTabConfig.value)}
                onEdit={openEditDialog}
                onActivate={(promotion) =>
                  handleStatusChange(promotion, activateAdminPromotion)
                }
                onPause={(promotion) =>
                  handleStatusChange(promotion, pauseAdminPromotion)
                }
                onDeactivate={handleDeactivate}
                pendingKey={pendingKey}
                tab={activeTabConfig}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create promotion" : "Edit promotion"}
            </DialogTitle>
            <DialogDescription>
              Configure deterministic promotion behavior for the{" "}
              {activeTabConfig.label.toLowerCase()} tab.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promotion-name">Promotion name</Label>
              <Input
                id="promotion-name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Summer partner rate"
              />
            </div>

            {formData.kind === "GENERIC" ? (
              <div className="space-y-2">
                <Label htmlFor="promotion-code">Promotion code</Label>
                <Input
                  id="promotion-code"
                  value={formData.code}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. SUMMER25"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Promotion type</Label>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground">
                  {activeTabConfig.label}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="benefit-type">Benefit type</Label>
              <Select
                value={formData.benefitType}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    benefitType: value,
                    benefitCap: value === "FIXED" ? "" : current.benefitCap,
                  }))
                }
              >
                <SelectTrigger id="benefit-type">
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefit-value">
                {formData.benefitType === "FIXED"
                  ? "Discount amount"
                  : "Discount percentage"}
              </Label>
              <Input
                id="benefit-value"
                type="number"
                min="0"
                step="0.01"
                value={formData.benefitValue}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    benefitValue: event.target.value,
                  }))
                }
                placeholder={formData.benefitType === "FIXED" ? "150" : "20"}
              />
            </div>

            {formData.benefitType === "PERCENTAGE" ? (
              <div className="space-y-2">
                <Label htmlFor="benefit-cap">Benefit cap (optional)</Label>
                <Input
                  id="benefit-cap"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.benefitCap}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      benefitCap: event.target.value,
                    }))
                  }
                  placeholder="250"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="minimum-spend">Minimum spend</Label>
              <Input
                id="minimum-spend"
                type="number"
                min="0"
                step="0.01"
                value={formData.minimumSpend}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    minimumSpend: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                step="1"
                value={formData.priority}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="per-user-limit">Per-user limit (optional)</Label>
              <Input
                id="per-user-limit"
                type="number"
                min="1"
                step="1"
                value={formData.perUserLimit}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    perUserLimit: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total-limit">Total limit (optional)</Label>
              <Input
                id="total-limit"
                type="number"
                min="1"
                step="1"
                value={formData.totalLimit}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    totalLimit: event.target.value,
                  }))
                }
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="starts-at">Starts at (optional)</Label>
              <Input
                id="starts-at"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    startsAt: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends-at">Ends at (optional)</Label>
              <Input
                id="ends-at"
                type="datetime-local"
                value={formData.endsAt}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    endsAt: event.target.value,
                  }))
                }
              />
            </div>

            {formMode === "create" ? (
              <div className="space-y-2">
                <Label htmlFor="create-status">Initial status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger id="create-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATE_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Current status</Label>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground">
                  {formatStatusLabel(formData.status)}
                </div>
              </div>
            )}

            {formData.kind === "AUTOMATIC" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="trigger-type">Trigger type</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        triggerType: value,
                        triggerStartDate:
                          value === "DATE_RANGE"
                            ? current.triggerStartDate
                            : "",
                        triggerEndDate:
                          value === "DATE_RANGE" ? current.triggerEndDate : "",
                      }))
                    }
                  >
                    <SelectTrigger id="trigger-type">
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTOMATIC_TRIGGER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.triggerType === "DATE_RANGE" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="trigger-start-date">
                        Start business date
                      </Label>
                      <Input
                        id="trigger-start-date"
                        type="date"
                        value={formData.triggerStartDate}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            triggerStartDate: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trigger-end-date">
                        End business date
                      </Label>
                      <Input
                        id="trigger-end-date"
                        type="date"
                        value={formData.triggerEndDate}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            triggerEndDate: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="admin-description">
                Admin description (optional)
              </Label>
              <Textarea
                id="admin-description"
                value={formData.adminDescription}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    adminDescription: event.target.value,
                  }))
                }
                placeholder="Internal notes for support, finance, or rollout context."
                rows={3}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="customer-message">
                Customer message (optional)
              </Label>
              <Textarea
                id="customer-message"
                value={formData.customerMessage}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    customerMessage: event.target.value,
                  }))
                }
                placeholder="Optional message shown when the promotion is selected at checkout."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Status transitions remain explicit via activate, pause, and
              deactivate actions.
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={pendingKey === "dialog"}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={pendingKey === "dialog"}
              >
                <BadgePercent className="mr-2 h-4 w-4" />
                {formMode === "create" ? "Create promotion" : "Save changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
