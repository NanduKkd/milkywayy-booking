"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminEmptyState,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
  AdminSearchField,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildInvoiceDownloadUrl,
  formatBookingReferenceList,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatInvoiceDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInvoiceStatusMeta(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (normalized === "success") {
    return { label: "Paid", tone: "success" };
  }
  if (normalized === "failed") {
    return { label: "Failed", tone: "danger" };
  }

  return { label: "Pending", tone: "warning" };
}

function matchesInvoiceSearch(invoice, query) {
  if (!query) return true;

  const haystack = [
    formatInvoiceNumber(invoice),
    formatBookingReferenceList(invoice?.bookings),
    invoice?.user?.fullName,
    invoice?.user?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

async function fetchAdminInvoices() {
  const response = await fetch("/api/admin/invoices");
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch invoices");
  }

  if (!Array.isArray(data)) {
    throw new Error("Failed to fetch invoices");
  }

  return data;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadInvoices = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextInvoices = await fetchAdminInvoices();
        if (isMounted) {
          setInvoices(nextInvoices);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "Failed to fetch invoices");
          setInvoices([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInvoices();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredInvoices = invoices.filter((invoice) =>
    matchesInvoiceSearch(invoice, normalizedSearchQuery),
  );
  const visibleTotalAmount = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice?.amount || 0),
    0,
  );
  const paidInvoicesCount = filteredInvoices.filter(
    (invoice) => String(invoice?.status || "").toLowerCase() === "success",
  ).length;
  const pendingInvoicesCount = filteredInvoices.length - paidInvoicesCount;
  const downloadableInvoicesCount = filteredInvoices.filter((invoice) =>
    Boolean(
      buildInvoiceDownloadUrl(
        invoice?.invoiceUrl,
        formatInvoiceNumber(invoice),
        invoice?.id,
      ),
    ),
  ).length;

  const showingFilteredResults =
    normalizedSearchQuery.length > 0 &&
    filteredInvoices.length !== invoices.length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Finance"
        title="Invoices"
        description="Search live invoice records by invoice number, booking reference, or customer identity while keeping secure downloads unchanged."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminCard>
          <AdminCardHeader>
            <AdminCardDescription>Visible invoices</AdminCardDescription>
            <AdminCardTitle>{filteredInvoices.length}</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
            {showingFilteredResults
              ? `Filtered from ${invoices.length} total records`
              : "Current live result set"}
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader>
            <AdminCardDescription>Visible total</AdminCardDescription>
            <AdminCardTitle>
              {formatCurrency(visibleTotalAmount)}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
            Footer totals stay aligned with the current search result.
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardHeader>
            <AdminCardDescription>Download-ready invoices</AdminCardDescription>
            <AdminCardTitle>{downloadableInvoicesCount}</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
            {paidInvoicesCount} paid · {pendingInvoicesCount} pending or failed
          </AdminCardContent>
        </AdminCard>
      </section>

      <AdminTablePanel
        title="Invoice ledger"
        description="Keep the current finance workflow intact while narrowing the live table with client-side search."
        actions={
          <AdminSearchField
            aria-label="Search invoices"
            placeholder="Search invoice, booking ref, or customer"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full sm:min-w-[320px]"
          />
        }
      >
        {isLoading ? (
          <div className="p-5 sm:p-6">
            <AdminInlineMessage
              title="Loading invoices"
              description="Fetching the latest invoice records and secure download availability."
              tone="info"
              loading
            />
          </div>
        ) : loadError ? (
          <div className="p-5 sm:p-6">
            <AdminInlineMessage
              title="Unable to load invoices"
              description={loadError}
              tone="danger"
            />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/[0.03]">
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="min-w-[180px] text-[hsl(var(--admin-muted))]">
                  Invoice
                </TableHead>
                <TableHead className="min-w-[160px] text-[hsl(var(--admin-muted))]">
                  Booking ref
                </TableHead>
                <TableHead className="min-w-[220px] text-[hsl(var(--admin-muted))]">
                  Customer
                </TableHead>
                <TableHead className="min-w-[140px] text-[hsl(var(--admin-muted))]">
                  Date
                </TableHead>
                <TableHead className="min-w-[140px] text-[hsl(var(--admin-muted))]">
                  Amount
                </TableHead>
                <TableHead className="min-w-[140px] text-[hsl(var(--admin-muted))]">
                  Status
                </TableHead>
                <TableHead className="min-w-[120px] text-[hsl(var(--admin-muted))]">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    <AdminEmptyState
                      title={
                        invoices.length === 0
                          ? "No invoices found"
                          : "No invoices match this search"
                      }
                      description={
                        invoices.length === 0
                          ? "Invoice records will appear here as live transactions are created."
                          : "Try a different invoice number, booking reference, or customer search."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const invoiceNumber = formatInvoiceNumber(invoice);
                  const downloadUrl = buildInvoiceDownloadUrl(
                    invoice.invoiceUrl,
                    invoiceNumber,
                    invoice.id,
                  );
                  const statusMeta = getInvoiceStatusMeta(invoice.status);

                  return (
                    <TableRow
                      key={invoice.id}
                      className="border-white/8 text-[hsl(var(--admin-foreground))] hover:bg-white/[0.03]"
                    >
                      <TableCell className="font-medium">
                        {invoiceNumber}
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-muted))]">
                        {formatBookingReferenceList(invoice.bookings) || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-[hsl(var(--admin-foreground))]">
                            {invoice.user?.fullName || "Customer unavailable"}
                          </p>
                          <p className="text-xs text-[hsl(var(--admin-muted))]">
                            {invoice.user?.email || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[hsl(var(--admin-muted))]">
                        {formatInvoiceDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <AdminBadge tone={statusMeta.tone}>
                          {statusMeta.label}
                        </AdminBadge>
                      </TableCell>
                      <TableCell>
                        {downloadUrl ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl text-[hsl(var(--admin-info))] hover:bg-[hsl(var(--admin-info)/0.14)] hover:text-[hsl(var(--admin-info))]"
                          >
                            <Link
                              href={downloadUrl}
                              target="_blank"
                              aria-label={`Download invoice ${invoiceNumber}`}
                            >
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-[hsl(var(--admin-muted))]">
                            Generating
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {filteredInvoices.length > 0 ? (
              <TableFooter className="border-white/8 bg-white/[0.03] text-[hsl(var(--admin-foreground))]">
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableCell colSpan={4} className="text-sm">
                    Showing {filteredInvoices.length} of {invoices.length}{" "}
                    invoices
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(visibleTotalAmount)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {paidInvoicesCount} paid · {pendingInvoicesCount} pending
                  </TableCell>
                  <TableCell className="text-sm">
                    {downloadableInvoicesCount} ready
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        )}
      </AdminTablePanel>
    </AdminPage>
  );
}
