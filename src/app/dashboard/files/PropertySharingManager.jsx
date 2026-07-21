"use client";

import {
  BarChart3,
  Building2,
  Check,
  Copy,
  Eye,
  Link2,
  Loader2,
  RefreshCcw,
  RotateCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createMasterPropertyShareAction,
  createSinglePropertyShareAction,
  getPropertySharingDashboardAction,
  refreshPropertyShareSnapshotAction,
  revokePropertyShareAction,
  rotatePropertyShareTokenAction,
  setPropertyShareEnabledAction,
  updateMasterPropertyShareAction,
} from "@/lib/actions/propertySharing";

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ShareStatus({ share }) {
  const enabled = share.status === "ENABLED";
  const revoked = share.status === "REVOKED";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        enabled
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
          : revoked
            ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
            : "border-amber-300/20 bg-amber-300/10 text-amber-200",
      ].join(" ")}
    >
      {enabled ? "Enabled" : revoked ? "Revoked" : "Disabled"}
    </span>
  );
}

function ViewSeries({ series }) {
  const max = Math.max(1, ...(series || []).map((day) => day.requestViews));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Trailing 30 Dubai days</span>
        <span>Request views</span>
      </div>
      <div
        className="flex h-12 items-end gap-0.5"
        role="img"
        aria-label="Trailing 30-day request views"
      >
        {(series || []).map((day) => (
          <span
            key={day.date}
            title={`${day.date}: ${day.requestViews} request views`}
            className="min-h-0.5 flex-1 rounded-sm bg-sky-300/70"
            style={{
              height: `${Math.max(3, (day.requestViews / max) * 100)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function initialMasterSelection(data) {
  const eligibleIds = new Set(
    data.eligibleProperties.map((property) => property.id),
  );
  const master = data.shares.find(
    (share) => share.kind === "MASTER" && share.status !== "REVOKED",
  );
  return master
    ? master.properties
        .map((property) => property.bookingId)
        .filter((bookingId) => eligibleIds.has(bookingId))
    : [];
}

function ShareCard({ share, loadingKey, onAction }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const busy = loadingKey.startsWith(`${share.id}:`);
  return (
    <article className="rounded-2xl border border-white/10 bg-[#101114]/80 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">
              {share.kind === "MASTER" ? "Master link" : "Property link"}
            </h3>
            <ShareStatus share={share} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {share.properties.map((property) => property.title).join(" · ")}
          </p>
        </div>
        {share.status !== "REVOKED" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onAction("refresh", share)}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh snapshot
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onAction("toggle", share)}
            >
              {share.enabled ? "Disable" : "Re-enable"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onAction("rotate", share)}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Rotate link
            </Button>
            {confirmRevoke ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => onAction("revoke", share)}
              >
                Confirm revoke
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmRevoke(true)}
              >
                Revoke
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Request views
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {share.analytics.totalRequestViews}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Requests, not unique visitors
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" /> Last viewed
          </div>
          <p className="mt-2 text-sm font-medium text-white">
            {formatDateTime(share.analytics.lastViewedAt)}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <ViewSeries series={share.analytics.trailing30Days} />
      </div>

      <div className="mt-5">
        <h4 className="flex items-center gap-2 text-sm font-medium text-white">
          <UserRound className="h-4 w-4" /> Recent contacts
        </h4>
        {share.contacts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No unexpired contact submissions.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/[0.03] text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Property</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {share.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td className="px-3 py-2 text-zinc-300">
                      {contact.propertyTitle}
                    </td>
                    <td className="px-3 py-2 text-zinc-100">{contact.name}</td>
                    <td className="px-3 py-2 text-zinc-100">{contact.phone}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatDateTime(contact.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PropertySharingManager({ initialData }) {
  const [data, setData] = useState(initialData);
  const [loadingKey, setLoadingKey] = useState("");
  const [oneTimeUrl, setOneTimeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const masterShare = data.shares.find(
    (share) => share.kind === "MASTER" && share.status !== "REVOKED",
  );
  const [masterSelection, setMasterSelection] = useState(() =>
    initialMasterSelection(initialData),
  );
  const sharedSingleBookingIds = useMemo(
    () =>
      new Set(
        data.shares
          .filter(
            (share) =>
              share.kind === "SINGLE_PROPERTY" && share.status !== "REVOKED",
          )
          .flatMap((share) =>
            share.properties.map((property) => property.bookingId),
          ),
      ),
    [data.shares],
  );

  const reload = async () => {
    const result = await getPropertySharingDashboardAction();
    if (!result.success) throw new Error(result.message);
    setData(result.data);
    const eligibleIds = new Set(
      result.data.eligibleProperties.map((property) => property.id),
    );
    setMasterSelection((current) =>
      current.filter((bookingId) => eligibleIds.has(bookingId)),
    );
    return result.data;
  };

  const completeAction = async (key, operation) => {
    setLoadingKey(key);
    setOneTimeUrl("");
    setCopied(false);
    try {
      const result = await operation();
      if (!result.success) throw new Error(result.message);
      if (result.data?.publicUrl) {
        setOneTimeUrl(result.data.publicUrl);
        setCopied(false);
      }
      await reload();
      toast.success("Property sharing updated.");
    } catch (error) {
      toast.error(error.message || "Unable to update property sharing");
    } finally {
      setLoadingKey("");
    }
  };

  const createSingle = (bookingId) =>
    completeAction(`new-single:${bookingId}`, () =>
      createSinglePropertyShareAction(bookingId),
    );

  const saveMaster = () =>
    completeAction(`${masterShare?.id || "new"}:master`, () =>
      masterShare
        ? updateMasterPropertyShareAction(masterShare.id, masterSelection)
        : createMasterPropertyShareAction(masterSelection),
    );

  const shareAction = (action, share) => {
    const operations = {
      refresh: () => refreshPropertyShareSnapshotAction(share.id),
      toggle: () => setPropertyShareEnabledAction(share.id, !share.enabled),
      rotate: () => rotatePropertyShareTokenAction(share.id),
      revoke: () => revokePropertyShareAction(share.id),
    };
    return completeAction(`${share.id}:${action}`, operations[action]);
  };

  const copyOneTimeUrl = async () => {
    try {
      await navigator.clipboard.writeText(oneTimeUrl);
      setCopied(true);
      setOneTimeUrl("");
      toast.success("Secure link copied.");
    } catch {
      toast.error("Unable to copy the secure link");
    }
  };

  return (
    <section
      className="mb-10 space-y-5"
      aria-labelledby="property-sharing-title"
    >
      <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.05] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sky-300">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Secure sharing
              </p>
            </div>
            <h2
              id="property-sharing-title"
              className="mt-3 text-2xl font-semibold text-white"
            >
              Share completed properties
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create a link for one property or a master link for a selected
              collection. Visitors submit only name and phone before exact
              snapshotted files are available.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-muted-foreground">
            Metrics count successful landing requests, not unique people.
          </div>
        </div>
      </div>

      {oneTimeUrl ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-medium text-emerald-100">
              <Link2 className="h-4 w-4" /> New secure URL is ready
            </p>
            <p className="mt-1 text-xs text-emerald-100/70">
              Copy it now. The bearer URL is shown only for this create or
              rotation response.
            </p>
          </div>
          <Button type="button" size="sm" onClick={copyOneTimeUrl}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy secure URL"}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-300" />
            <h3 className="font-semibold text-white">Single-property links</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            One live link is allowed for each eligible completed property.
          </p>
          <div className="mt-4 space-y-2">
            {data.eligibleProperties.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
                No completed properties are currently eligible.
              </p>
            ) : (
              data.eligibleProperties.map((property) => {
                const shared = sharedSingleBookingIds.has(property.id);
                const busy = loadingKey === `new-single:${property.id}`;
                return (
                  <div
                    key={property.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {property.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {property.fileCount} snapshottable file
                        {property.fileCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={shared || busy}
                      onClick={() => createSingle(property.id)}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {shared ? "Created" : "Create link"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-violet-300" />
            <h3 className="font-semibold text-white">Master link</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Select at least two eligible properties. Saving creates a new exact
            snapshot for the selected collection.
          </p>
          <div className="mt-4 space-y-2">
            {data.eligibleProperties.map((property) => (
              <label
                key={property.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={masterSelection.includes(property.id)}
                  onChange={(event) =>
                    setMasterSelection((current) =>
                      event.target.checked
                        ? [...new Set([...current, property.id])]
                        : current.filter((id) => id !== property.id),
                    )
                  }
                  className="h-4 w-4 accent-sky-400"
                />
                <span className="min-w-0 truncate">{property.title}</span>
              </label>
            ))}
          </div>
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={
              masterSelection.length < 2 || loadingKey.endsWith(":master")
            }
            onClick={saveMaster}
          >
            {loadingKey.endsWith(":master") ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {masterShare ? "Update master snapshot" : "Create master link"}
          </Button>
        </div>
      </div>

      {data.shares.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Managed links</h3>
          {data.shares.map((share) => (
            <ShareCard
              key={share.id}
              share={share}
              loadingKey={loadingKey}
              onAction={shareAction}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
