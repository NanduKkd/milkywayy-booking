"use client";

import { UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AdminBadge,
  AdminEmptyState,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { setCustomerDisabled } from "@/lib/actions/users";

const getRoleBadgeTone = (role) => {
  switch (role) {
    case "SUPERADMIN":
      return "danger";
    case "TRANSPORT":
      return "warning";
    case "SHOOT":
      return "success";
    case "CUSTOMER":
      return "info";
    default:
      return "neutral";
  }
};

const getLimitFromParams = (searchParams) => {
  const limitParam = searchParams.get("limit");
  if (!limitParam) return 10;
  const limitNum = Number(limitParam);
  if (Number.isNaN(limitNum)) return 10;
  return limitNum;
};

const formatJoinedDate = (value) => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function UserTable({ users, pagination }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isPending, startTransition] = useTransition();

  const [limit, limitOptions] = useMemo(() => {
    const currentLimit = `${getLimitFromParams(searchParams)}`;
    const options = new Set(["10", "20", "50", currentLimit]);

    return [currentLimit, [...options]];
  }, [searchParams]);

  const totalPages = pagination.totalPages;
  const currentPage = pagination.page;
  const visibleStart =
    pagination.total === 0 ? 0 : (currentPage - 1) * pagination.limit + 1;
  const visibleEnd =
    pagination.total === 0 ? 0 : visibleStart + Math.max(users.length - 1, 0);
  const hasPages = totalPages > 0;
  const isPreviousDisabled = !hasPages || currentPage === 1;
  const isNextDisabled = !hasPages || currentPage === totalPages;

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleLimitChange = (nextLimit) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", nextLimit.toString());
    router.push(`?${params.toString()}`);
  };

  const handleCustomerAccessChange = (user) => {
    const isDisabled = Boolean(user.disabledAt);

    if (
      !isDisabled &&
      !window.confirm(
        `Disable ${user.fullName || `customer #${user.id}`}? They will not be able to log in until enabled again.`,
      )
    ) {
      return;
    }

    setPendingUserId(user.id);
    startTransition(async () => {
      const result = await setCustomerDisabled({
        userId: user.id,
        disabled: !isDisabled,
      });

      if (!result.success) {
        toast.error(result.message || "Failed to update customer access");
        setPendingUserId(null);
        return;
      }

      toast.success(isDisabled ? "Customer enabled" : "Customer disabled");
      setPendingUserId(null);
      router.refresh();
    });
  };

  const renderPaginationItems = () => {
    const items = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={currentPage === i}
              onClick={() => handlePageChange(i)}
              className={
                currentPage === i
                  ? "rounded-full border-[hsl(var(--admin-highlight)/0.35)] bg-[hsl(var(--admin-highlight)/0.12)] text-[hsl(var(--admin-foreground))]"
                  : "rounded-full border border-white/10 bg-white/[0.03] text-[hsl(var(--admin-foreground))] hover:bg-white/[0.06]"
              }
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        items.push(
          <PaginationItem key={`ellipsis-${i}`}>
            <PaginationEllipsis className="text-[hsl(var(--admin-muted))]" />
          </PaginationItem>,
        );
      }
    }

    return items;
  };

  return (
    <div className="space-y-4">
      <AdminTablePanel
        title="Account directory"
        description="The current customer route still exposes the shared user directory. Existing create, pagination, and role management flows stay available."
        actions={
          <Button
            onClick={() => router.push("/admin/users/create")}
            className="h-11 rounded-full bg-[hsl(var(--admin-highlight))] px-5 text-[hsl(var(--admin-background-deep))] hover:bg-[hsl(var(--admin-highlight-soft))]"
          >
            <UserPlus className="h-4 w-4" />
            Create user
          </Button>
        }
      >
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              <TableHead className="h-12 whitespace-nowrap px-5 text-xs uppercase tracking-[0.24em] text-[hsl(var(--admin-muted))]">
                ID
              </TableHead>
              <TableHead className="whitespace-nowrap px-5 text-xs uppercase tracking-[0.24em] text-[hsl(var(--admin-muted))]">
                Name
              </TableHead>
              <TableHead className="whitespace-nowrap px-5 text-xs uppercase tracking-[0.24em] text-[hsl(var(--admin-muted))]">
                Contact
              </TableHead>
              <TableHead className="whitespace-nowrap px-5 text-xs uppercase tracking-[0.24em] text-[hsl(var(--admin-muted))]">
                Role
              </TableHead>
              <TableHead className="whitespace-nowrap px-5 text-xs uppercase tracking-[0.24em] text-[hsl(var(--admin-muted))]">
                Joined
              </TableHead>
              <TableHead className="whitespace-nowrap px-5 text-xs uppercase tracking-[0.24em] text-[hsl(var(--admin-muted))]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0
              ? <TableRow className="border-white/8 hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <AdminEmptyState
                      title="No users found"
                      description="Adjust the page size or create a new account to repopulate the current directory."
                    />
                  </TableCell>
                </TableRow>
              : users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-white/8 hover:bg-white/[0.03]"
                  >
                    <TableCell className="whitespace-nowrap px-5 font-mono text-sm text-[hsl(var(--admin-muted))]">
                      #{user.id}
                    </TableCell>
                    <TableCell className="px-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-white/10 bg-[hsl(var(--admin-background-deep)/0.92)]">
                          <AvatarImage
                            src=""
                            alt={user.fullName || `User ${user.id}`}
                          />
                          <AvatarFallback className="bg-transparent text-xs text-[hsl(var(--admin-foreground))]">
                            {user.fullName
                              ? user.fullName.slice(0, 2).toUpperCase()
                              : `U${user.id.toString().slice(-2)}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <span className="block font-medium text-[hsl(var(--admin-foreground))]">
                            {user.fullName || `User ${user.id}`}
                          </span>
                          <span className="block text-xs text-[hsl(var(--admin-muted))]">
                            Record #{user.id}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5">
                      <div className="space-y-1">
                        <p className="text-sm text-[hsl(var(--admin-foreground))]">
                          {user.email || "No email"}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-muted))]">
                          {user.phone || "No phone number"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5">
                      <div className="flex flex-wrap gap-2">
                        <AdminBadge tone={getRoleBadgeTone(user.role)}>
                          {user.role}
                        </AdminBadge>
                        {user.role === "CUSTOMER" && user.disabledAt
                          ? <AdminBadge tone="danger">Disabled</AdminBadge>
                          : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-5 text-sm text-[hsl(var(--admin-muted))]">
                      {formatJoinedDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="px-5">
                      {user.role === "CUSTOMER"
                        ? <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isPending && pendingUserId === user.id}
                              className={
                                user.disabledAt
                                  ? "rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-[hsl(var(--admin-highlight))] transition hover:border-[hsl(var(--admin-highlight)/0.42)] hover:bg-[hsl(var(--admin-highlight)/0.08)] disabled:cursor-wait disabled:opacity-50"
                                  : "rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-[hsl(var(--admin-danger))] transition hover:border-[hsl(var(--admin-danger)/0.42)] hover:bg-[hsl(var(--admin-danger)/0.08)] disabled:cursor-wait disabled:opacity-50"
                              }
                              onClick={() => handleCustomerAccessChange(user)}
                            >
                              {user.disabledAt ? "Enable" : "Disable"}
                            </button>
                          </div>
                        : <span className="text-sm text-[hsl(var(--admin-muted))]">
                            —
                          </span>}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </AdminTablePanel>

      <div className="admin-panel-subtle flex flex-col gap-4 rounded-[1.4rem] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
            Showing {visibleStart}-{visibleEnd} of {pagination.total} accounts
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
            Page {currentPage} of {Math.max(totalPages, 1)}
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Pagination className="mx-0 w-auto justify-start">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={isPreviousDisabled}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={
                    isPreviousDisabled
                      ? "pointer-events-none rounded-full border-white/10 bg-white/[0.03] opacity-50"
                      : "cursor-pointer rounded-full border border-white/10 bg-white/[0.03] text-[hsl(var(--admin-foreground))] hover:bg-white/[0.06]"
                  }
                />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  disabled={isNextDisabled}
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    isNextDisabled
                      ? "pointer-events-none rounded-full border-white/10 bg-white/[0.03] opacity-50"
                      : "cursor-pointer rounded-full border border-white/10 bg-white/[0.03] text-[hsl(var(--admin-foreground))] hover:bg-white/[0.06]"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="w-40">
            <Select value={limit} onValueChange={handleLimitChange}>
              <SelectTrigger className="admin-input h-10 rounded-full border-white/10 bg-[hsl(var(--admin-background-deep)/0.66)] text-[hsl(var(--admin-foreground))]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                {limitOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option} per page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
