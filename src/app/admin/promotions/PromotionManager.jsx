"use client";

import {
  BadgePercent,
  CirclePause,
  CirclePlay,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AdminBadge,
  AdminConfirmDialog,
  AdminDialogContent,
  AdminEmptyState,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
  AdminSearchField,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  assignAdminPromotionCustomer,
  createAdminPromotion,
  deactivateAdminPromotion,
  pauseAdminPromotion,
  searchPromotionAssignableCustomers,
  unassignAdminPromotionCustomer,
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
      "Customer-specific offers assigned directly to eligible customer accounts.",
    icon: UserRound,
    emptyTitle: "No personal promotions yet",
    emptyCopy:
      "Create the offer and attach it to active customer accounts from one place.",
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

function getStatusTone(status) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "DEACTIVATED":
      return "danger";
    default:
      return "neutral";
  }
}

function formatCustomerDisplayName(customer) {
  return (
    customer?.displayName ||
    customer?.companyName ||
    customer?.fullName ||
    customer?.email ||
    customer?.phone ||
    "Unnamed customer"
  );
}

function formatCustomerSecondaryLine(customer) {
  return [customer?.email, customer?.phone].filter(Boolean).join(" • ");
}

function formatPromotionWindow(promotion) {
  if (!promotion.startsAt && !promotion.endsAt) {
    return "Always";
  }

  return `${formatDateTime(promotion.startsAt)} – ${formatDateTime(
    promotion.endsAt,
  )}`;
}

function getSafeActionMessage(result, fallbackMessage) {
  return result?.message || fallbackMessage;
}

function PromotionStatusCell({ promotion }) {
  return (
    <TableCell className="align-top">
      <div className="space-y-1">
        <AdminBadge tone={getStatusTone(promotion.status)}>
          {formatStatusLabel(promotion.status)}
        </AdminBadge>
        <p className="text-xs text-muted-foreground">
          Priority {promotion.priority || 0}
        </p>
      </div>
    </TableCell>
  );
}

function PromotionLimitsCell({ promotion, includeMinimumSpend = false }) {
  const limits = [
    includeMinimumSpend && Number(promotion.minimumSpend || 0) > 0
      ? `${formatCurrency(promotion.minimumSpend)} min`
      : null,
    promotion.perUserLimit == null
      ? "Unlimited/customer"
      : `${promotion.perUserLimit}/customer`,
    promotion.totalLimit == null
      ? "Unlimited total"
      : `${promotion.totalLimit} total`,
  ].filter(Boolean);

  return (
    <TableCell className="align-top text-sm text-muted-foreground">
      {limits.join(" • ")}
    </TableCell>
  );
}

function PromotionTable({
  promotions,
  onEdit,
  onActivate,
  onAssignCustomer,
  onPause,
  onDeactivate,
  pendingKey,
  tab,
}) {
  const EmptyIcon = tab.icon;

  if (promotions.length === 0) {
    return (
      <AdminTablePanel>
        <div className="py-16 text-center">
          <div className="flex flex-col gap-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800">
              <EmptyIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <AdminEmptyState
              title={tab.emptyTitle}
              icon={EmptyIcon}
              className="border-0 bg-transparent p-0 [&>div:first-child]:hidden"
            />
          </div>
        </div>
      </AdminTablePanel>
    );
  }

  return (
    <AdminTablePanel>
      <Table>
        <TableHeader className="bg-white/[0.03]">
          <TableRow className="border-white/8 hover:bg-transparent">
            {tab.value === "GENERIC" ? (
              <>
                <TableHead className="min-w-[190px]">Code</TableHead>
                <TableHead className="min-w-[160px]">Discount</TableHead>
                <TableHead className="min-w-[130px]">Min spend</TableHead>
                <TableHead className="min-w-[190px]">Limits</TableHead>
                <TableHead className="min-w-[220px]">Validity</TableHead>
              </>
            ) : tab.value === "PERSONAL" ? (
              <>
                <TableHead className="min-w-[220px]">Customer(s)</TableHead>
                <TableHead className="min-w-[210px]">Promotion</TableHead>
                <TableHead className="min-w-[160px]">Discount</TableHead>
                <TableHead className="min-w-[190px]">Limits</TableHead>
                <TableHead className="min-w-[220px]">Validity</TableHead>
              </>
            ) : (
              <>
                <TableHead className="min-w-[220px]">Promotion</TableHead>
                <TableHead className="min-w-[180px]">Trigger</TableHead>
                <TableHead className="min-w-[160px]">Discount</TableHead>
                <TableHead className="min-w-[260px]">Requirements</TableHead>
                <TableHead className="min-w-[220px]">Validity</TableHead>
              </>
            )}
            <TableHead className="min-w-[140px] text-[hsl(var(--admin-muted))]">
              Status
            </TableHead>
            <TableHead className="w-16 text-right text-[hsl(var(--admin-muted))]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions.map((promotion) => {
            const isBusy = pendingKey === `promotion:${promotion.id}`;

            return (
              <TableRow key={promotion.id} className="border-white/8">
                {tab.value === "GENERIC" ? (
                  <>
                    <TableCell className="align-top">
                      <p className="font-mono text-sm font-bold text-white">
                        {promotion.code || "—"}
                      </p>
                      <p
                        className="mt-1 truncate text-xs text-muted-foreground"
                        title={promotion.name}
                      >
                        {promotion.name}
                      </p>
                    </TableCell>
                    <TableCell className="align-top text-sm font-semibold text-white">
                      {formatBenefit(promotion)}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {Number(promotion.minimumSpend || 0) > 0
                        ? formatCurrency(promotion.minimumSpend)
                        : "—"}
                    </TableCell>
                    <PromotionLimitsCell promotion={promotion} />
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {formatPromotionWindow(promotion)}
                    </TableCell>
                    <PromotionStatusCell promotion={promotion} />
                  </>
                ) : tab.value === "PERSONAL" ? (
                  <>
                    <TableCell className="align-top">
                      {promotion.assignments?.length ? (
                        <div>
                          <p className="text-sm font-medium text-white">
                            {formatCustomerDisplayName(
                              promotion.assignments[0].user,
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {promotion.assignments.length > 1
                              ? `+${promotion.assignments.length - 1} more assigned`
                              : formatCustomerSecondaryLine(
                                  promotion.assignments[0].user,
                                ) || "1 customer assigned"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-amber-400">
                          Unassigned
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-sm font-medium text-white">
                        {promotion.name}
                      </p>
                      {promotion.adminDescription ? (
                        <p
                          className="mt-1 truncate text-xs text-muted-foreground"
                          title={promotion.adminDescription}
                        >
                          {promotion.adminDescription}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top text-sm font-semibold text-white">
                      {formatBenefit(promotion)}
                    </TableCell>
                    <PromotionLimitsCell promotion={promotion} />
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {formatPromotionWindow(promotion)}
                    </TableCell>
                    <PromotionStatusCell promotion={promotion} />
                  </>
                ) : (
                  <>
                    <TableCell className="align-top">
                      <p className="text-sm font-medium text-white">
                        {promotion.name}
                      </p>
                      {promotion.adminDescription ? (
                        <p
                          className="mt-1 truncate text-xs text-muted-foreground"
                          title={promotion.adminDescription}
                        >
                          {promotion.adminDescription}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top text-sm text-amber-300">
                      {formatTrigger(promotion)}
                    </TableCell>
                    <TableCell className="align-top text-sm font-semibold text-white">
                      {formatBenefit(promotion)}
                    </TableCell>
                    <PromotionLimitsCell
                      includeMinimumSpend
                      promotion={promotion}
                    />
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {formatPromotionWindow(promotion)}
                    </TableCell>
                    <PromotionStatusCell promotion={promotion} />
                  </>
                )}
                <TableCell className="align-top">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={`Actions for ${promotion.name}`}
                          disabled={isBusy}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-44 border-white/10 bg-zinc-950 text-zinc-100"
                      >
                        {promotion.kind === "PERSONAL" ? (
                          <DropdownMenuItem
                            onSelect={() => onAssignCustomer(promotion)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Assign customer
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onSelect={() => onEdit(promotion)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {promotion.status === "ACTIVE" ? (
                          <DropdownMenuItem onSelect={() => onPause(promotion)}>
                            <CirclePause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                        ) : promotion.status !== "DEACTIVATED" ? (
                          <DropdownMenuItem
                            onSelect={() => onActivate(promotion)}
                          >
                            <CirclePlay className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        ) : null}
                        {promotion.status !== "DEACTIVATED" ? (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
                              onSelect={() => onDeactivate(promotion)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AdminTablePanel>
  );
}

export default function PromotionManager({
  initialPromotions,
  loadError = null,
}) {
  const router = useRouter();
  const [promotions, setPromotions] = useState(
    sortPromotions(initialPromotions || []),
  );
  const [activeTab, setActiveTab] = useState("GENERIC");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formData, setFormData] = useState(createEmptyForm("GENERIC"));
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentPromotion, setAssignmentPromotion] = useState(null);
  const [assignmentQuery, setAssignmentQuery] = useState("");
  const [assignmentResults, setAssignmentResults] = useState([]);
  const [assignmentMessage, setAssignmentMessage] = useState(null);
  const [assignmentSearchPending, setAssignmentSearchPending] = useState(false);
  const [assignmentPendingUserId, setAssignmentPendingUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(loadError);
  const [pendingKey, setPendingKey] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const pendingOperations = useRef(new Set());

  useEffect(() => {
    setPromotions(sortPromotions(initialPromotions || []));
  }, [initialPromotions]);

  useEffect(() => {
    setErrorMessage(loadError);
  }, [loadError]);

  useEffect(() => {
    if (!assignmentDialogOpen || !assignmentPromotion) {
      return undefined;
    }

    const normalizedQuery = assignmentQuery.trim();

    if (normalizedQuery.length < 2) {
      setAssignmentResults([]);
      setAssignmentSearchPending(false);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setAssignmentSearchPending(true);
      setAssignmentMessage(null);

      let result;

      try {
        result = await searchPromotionAssignableCustomers(normalizedQuery);
      } catch {
        if (cancelled) {
          return;
        }

        setAssignmentSearchPending(false);
        setAssignmentResults([]);
        setAssignmentMessage("Unable to search for customers.");
        return;
      }

      if (cancelled) {
        return;
      }

      setAssignmentSearchPending(false);

      if (!result.success) {
        setAssignmentResults([]);
        setAssignmentMessage(result.message);
        return;
      }

      const assignedUserIds = new Set(
        (assignmentPromotion.assignments || []).map((assignment) =>
          Number(assignment.userId),
        ),
      );
      const nextResults = (result.data || []).filter(
        (customer) => !assignedUserIds.has(Number(customer.id)),
      );

      setAssignmentResults(nextResults);
      setAssignmentMessage(
        nextResults.length === 0
          ? "No active customers match that search."
          : null,
      );
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [assignmentDialogOpen, assignmentPromotion, assignmentQuery]);

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

  const beginPendingOperation = (operationKey) => {
    if (pendingOperations.current.has(operationKey)) {
      return false;
    }

    pendingOperations.current.add(operationKey);
    return true;
  };

  const endPendingOperation = (operationKey) => {
    pendingOperations.current.delete(operationKey);
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

  const openAssignmentDialog = (promotion) => {
    setErrorMessage(null);
    setAssignmentPromotion(promotion);
    setAssignmentDialogOpen(true);
    setAssignmentQuery("");
    setAssignmentResults([]);
    setAssignmentMessage(null);
  };

  const handleSubmit = async () => {
    const operationKey = `form:${formMode}:${formData.id ?? "new"}`;

    if (!beginPendingOperation(operationKey)) {
      return;
    }

    setPendingKey("dialog");
    setErrorMessage(null);

    const payload = buildPayload(formData, {
      includeStatus: formMode === "create",
    });

    try {
      const result =
        formMode === "create"
          ? await createAdminPromotion(payload)
          : await updateAdminPromotion(formData.id, payload);

      if (!result?.success) {
        setErrorMessage(
          getSafeActionMessage(result, "Unable to save this promotion."),
        );
        return;
      }

      upsertPromotion(result.data);
      setDialogOpen(false);
    } catch {
      setErrorMessage("Unable to save this promotion.");
    } finally {
      endPendingOperation(operationKey);
      setPendingKey(null);
    }
  };

  const handleStatusChange = async (promotion, action) => {
    const operationKey = `promotion:${promotion.id}`;

    if (!beginPendingOperation(operationKey)) {
      return false;
    }

    setPendingKey(`promotion:${promotion.id}`);
    setErrorMessage(null);

    try {
      const result = await action(promotion.id);

      if (!result?.success) {
        setErrorMessage(
          getSafeActionMessage(result, "Unable to update this promotion."),
        );
        return false;
      }

      upsertPromotion(result.data);
      return true;
    } catch {
      setErrorMessage("Unable to update this promotion.");
      return false;
    } finally {
      endPendingOperation(operationKey);
      setPendingKey(null);
    }
  };

  const handleDeactivate = async (promotion) => {
    const didDeactivate = await handleStatusChange(
      promotion,
      deactivateAdminPromotion,
    );

    if (didDeactivate) {
      setDeactivateTarget(null);
    }
  };

  const handleAssignCustomer = async (customer) => {
    if (!assignmentPromotion) {
      return;
    }

    const operationKey = `assignment:${assignmentPromotion.id}:${customer.id}`;

    if (!beginPendingOperation(operationKey)) {
      return;
    }

    setAssignmentPendingUserId(customer.id);
    setAssignmentMessage(null);

    try {
      const result = await assignAdminPromotionCustomer(
        assignmentPromotion.id,
        customer.id,
      );

      if (!result?.success) {
        setAssignmentMessage(
          getSafeActionMessage(result, "Unable to assign this customer."),
        );
        return;
      }

      upsertPromotion(result.data);
      setAssignmentPromotion(result.data);
      setAssignmentQuery("");
      setAssignmentResults([]);
      setAssignmentMessage(
        `${formatCustomerDisplayName(customer)} assigned successfully.`,
      );
    } catch {
      setAssignmentMessage("Unable to assign this customer.");
    } finally {
      endPendingOperation(operationKey);
      setAssignmentPendingUserId(null);
    }
  };

  const handleUnassignCustomer = async (assignment) => {
    if (!assignmentPromotion) {
      return;
    }

    const operationKey = `assignment:${assignmentPromotion.id}:${assignment.userId}`;

    if (!beginPendingOperation(operationKey)) {
      return;
    }

    setAssignmentPendingUserId(assignment.userId);
    setAssignmentMessage(null);

    try {
      const result = await unassignAdminPromotionCustomer(
        assignmentPromotion.id,
        assignment.userId,
      );

      if (!result?.success) {
        setAssignmentMessage(
          getSafeActionMessage(result, "Unable to remove this customer."),
        );
        return;
      }

      upsertPromotion(result.data);
      setAssignmentPromotion(result.data);
      setAssignmentMessage(
        `${formatCustomerDisplayName(assignment.user)} removed successfully.`,
      );
    } catch {
      setAssignmentMessage("Unable to remove this customer.");
    } finally {
      endPendingOperation(operationKey);
      setAssignmentPendingUserId(null);
    }
  };

  const activeTabConfig =
    TAB_CONFIG.find((tab) => tab.value === activeTab) ?? TAB_CONFIG[0];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations"
        title="Promotion Management"
        actions={
          <Button type="button" onClick={() => openCreateDialog(activeTab)}>
            <Plus className="mr-2 h-4 w-4" />
            Create {activeTabConfig.shortLabel}
          </Button>
        }
      />

      {errorMessage && !dialogOpen ? (
        <div
          role="alert"
          aria-live="assertive"
          aria-label={
            loadError
              ? "Unable to load promotions"
              : "Unable to update promotions"
          }
        >
          <AdminInlineMessage
            title={
              loadError
                ? "Unable to load promotions"
                : "Unable to update promotions"
            }
            description={errorMessage}
            tone="danger"
          />
        </div>
      ) : null}

      {loadError ? (
        <output
          className="flex flex-wrap items-center gap-3"
          aria-label="Promotions catalog load status"
        >
          <p className="text-sm text-muted-foreground">
            The catalog was not loaded, so no promotion rows are shown.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
          >
            Retry loading promotions
          </Button>
        </output>
      ) : (
        <div className="space-y-5">
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
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-4 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "border-white bg-white text-black"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white",
                  )}
                  onClick={() => setActiveTab(tab.value)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label} ({countsByKind[tab.value] || 0})
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
            <PromotionTable
              promotions={promotions.filter(
                (promotion) => promotion.kind === activeTabConfig.value,
              )}
              onEdit={openEditDialog}
              onAssignCustomer={openAssignmentDialog}
              onActivate={(promotion) =>
                handleStatusChange(promotion, activateAdminPromotion)
              }
              onPause={(promotion) =>
                handleStatusChange(promotion, pauseAdminPromotion)
              }
              onDeactivate={setDeactivateTarget}
              pendingKey={pendingKey}
              tab={activeTabConfig}
            />
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AdminDialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
          title={formMode === "create" ? "Create promotion" : "Edit promotion"}
          description={`Configure deterministic promotion behavior for the ${activeTabConfig.label.toLowerCase()} tab.`}
        >
          {errorMessage ? (
            <div
              role="alert"
              aria-live="assertive"
              aria-label="Unable to update promotions"
            >
              <AdminInlineMessage
                title="Unable to update promotions"
                description={errorMessage}
                tone="danger"
              />
            </div>
          ) : null}
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
                        onInput={(event) =>
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
                        onInput={(event) =>
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
        </AdminDialogContent>
      </Dialog>

      <Dialog
        open={assignmentDialogOpen}
        onOpenChange={(open) => {
          setAssignmentDialogOpen(open);

          if (!open) {
            setAssignmentPromotion(null);
            setAssignmentQuery("");
            setAssignmentResults([]);
            setAssignmentMessage(null);
            setAssignmentPendingUserId(null);
          }
        }}
      >
        <AdminDialogContent
          className="sm:max-w-2xl"
          title="Assign customer"
          description={`Search active customer accounts and attach them to ${assignmentPromotion?.name || "this personal promotion"}.`}
        >
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="promotion-customer-search">
                  Search customers
                </Label>
                <AdminSearchField
                  id="promotion-customer-search"
                  aria-label="Search customers"
                  value={assignmentQuery}
                  onChange={(event) => {
                    setAssignmentQuery(event.target.value);
                    setAssignmentMessage(null);
                  }}
                  placeholder="Name, company, email, phone, or customer ID"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Search only returns customer accounts. Staff users are never
                  shown here.
                </p>
              </div>

              {assignmentMessage ? (
                assignmentMessage.endsWith("successfully.") ? (
                  <output aria-label="Assignment update">
                    <AdminInlineMessage
                      title="Assignment update"
                      description={assignmentMessage}
                      tone="info"
                    />
                  </output>
                ) : (
                  <div
                    role="alert"
                    aria-live="polite"
                    aria-label="Assignment update"
                  >
                    <AdminInlineMessage
                      title="Assignment update"
                      description={assignmentMessage}
                      tone="info"
                    />
                  </div>
                )
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Assigned customers
                </p>
                {assignmentPromotion?.assignments?.length ? (
                  <div className="space-y-2">
                    {assignmentPromotion.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {formatCustomerDisplayName(assignment.user)}
                          </p>
                          {formatCustomerSecondaryLine(assignment.user) ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {formatCustomerSecondaryLine(assignment.user)}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnassignCustomer(assignment)}
                          disabled={
                            assignmentPendingUserId === assignment.userId
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminEmptyState
                    title="No customers assigned yet."
                    description="Search for an active customer account to attach this personal promotion."
                    icon={UserPlus}
                    className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Search results
              </p>
              {assignmentQuery.trim().length < 2 ? (
                <AdminEmptyState
                  title="Type at least two characters."
                  description="Search results will appear here once you start narrowing to a customer account."
                  icon={UserRound}
                  className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6"
                />
              ) : assignmentSearchPending ? (
                <output aria-label="Searching customer accounts">
                  <AdminInlineMessage
                    title="Searching customer accounts"
                    description="Matching active customers are loading now."
                    tone="info"
                    loading
                  />
                </output>
              ) : assignmentResults.length ? (
                <div className="space-y-2">
                  {assignmentResults.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {formatCustomerDisplayName(customer)}
                        </p>
                        {formatCustomerSecondaryLine(customer) ? (
                          <p className="text-xs text-muted-foreground">
                            {formatCustomerSecondaryLine(customer)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAssignCustomer(customer)}
                        disabled={assignmentPendingUserId === customer.id}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignmentDialogOpen(false)}
              disabled={assignmentPendingUserId != null}
            >
              Close
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open && !pendingKey?.startsWith("promotion:")) {
            setDeactivateTarget(null);
          }
        }}
        title="Deactivate promotion"
        description="This permanently retires the selected promotion. Deactivated promotions cannot be reactivated."
        confirmLabel="Deactivate promotion"
        confirmPendingLabel="Deactivating..."
        confirmPending={
          Boolean(deactivateTarget) &&
          pendingKey === `promotion:${deactivateTarget.id}`
        }
        onConfirm={() => {
          if (deactivateTarget) {
            void handleDeactivate(deactivateTarget);
          }
        }}
      >
        {deactivateTarget ? (
          <AdminInlineMessage
            tone="warning"
            title={deactivateTarget.name}
            description="Live checkout and automatic evaluation will stop applying this promotion. Create a replacement promotion if it is needed again."
          />
        ) : null}
      </AdminConfirmDialog>
    </AdminPage>
  );
}
