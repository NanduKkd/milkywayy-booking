"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  ArrowDownUp,
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  Images,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminConfirmDialog,
  AdminDialogContent,
  AdminEmptyState,
  AdminFilterChip,
  AdminFilterRow,
  AdminInlineMessage,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import PortfolioForm from "./PortfolioForm";

const PORTFOLIO_FILTER_ALL = "ALL";

const ADMIN_PRIMARY_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";
const ADMIN_GHOST_ICON_BUTTON_CLASS =
  "rounded-full border border-transparent text-[hsl(var(--admin-muted))] hover:border-[hsl(var(--admin-border)/0.9)] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]";
const TABLE_HEAD_CLASS =
  "border-white/8 bg-white/[0.03] text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]";
const TABLE_CELL_CLASS = "border-white/8 text-[hsl(var(--admin-foreground))]";

const PORTFOLIO_FILTERS = [
  { value: PORTFOLIO_FILTER_ALL, label: "All Works" },
  { value: OUR_WORK_TYPES.IMAGE, label: "Photography" },
  { value: OUR_WORK_TYPES.SHORT_VIDEO, label: "Short Form Video" },
  { value: OUR_WORK_TYPES.VIDEO, label: "Long Form Video" },
  { value: OUR_WORK_TYPES.THREE_SIXTY, label: "360 Virtual Tour" },
];

const PORTFOLIO_TYPE_META = {
  [OUR_WORK_TYPES.IMAGE]: {
    label: "Photography",
    tone: "info",
  },
  [OUR_WORK_TYPES.SHORT_VIDEO]: {
    label: "Short Form Video",
    tone: "warning",
  },
  [OUR_WORK_TYPES.VIDEO]: {
    label: "Long Form Video",
    tone: "success",
  },
  [OUR_WORK_TYPES.THREE_SIXTY]: {
    label: "360 Virtual Tour",
    tone: "neutral",
  },
};

export function normalizePortfolioItems(rawItems) {
  return [...(rawItems || [])].sort((left, right) => {
    const leftOrder = Number(left?.order ?? 0);
    const rightOrder = Number(right?.order ?? 0);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return Number(left?.id ?? 0) - Number(right?.id ?? 0);
  });
}

function matchesPortfolioFilter(item, filterValue) {
  return filterValue === PORTFOLIO_FILTER_ALL || item?.type === filterValue;
}

export function filterPortfolioItems(items, filterValue) {
  return normalizePortfolioItems(items).filter((item) =>
    matchesPortfolioFilter(item, filterValue),
  );
}

export function reorderPortfolioItems(
  items,
  filterValue,
  sourceIndex,
  destinationIndex,
) {
  const normalizedItems = normalizePortfolioItems(items);

  if (
    sourceIndex === destinationIndex ||
    sourceIndex < 0 ||
    destinationIndex < 0
  ) {
    return normalizedItems;
  }

  const filteredItems = filterPortfolioItems(normalizedItems, filterValue);
  const reorderedFilteredItems = Array.from(filteredItems);
  const [movedItem] = reorderedFilteredItems.splice(sourceIndex, 1);

  if (!movedItem) {
    return normalizedItems;
  }

  reorderedFilteredItems.splice(destinationIndex, 0, movedItem);

  let filteredIndex = 0;

  return normalizedItems
    .map((item) =>
      matchesPortfolioFilter(item, filterValue)
        ? reorderedFilteredItems[filteredIndex++]
        : item,
    )
    .map((item, index) => ({
      ...item,
      order: index,
    }));
}

export default function PortfolioList({ initialItems, loadError = null }) {
  const router = useRouter();
  const [items, setItems] = useState(() =>
    normalizePortfolioItems(initialItems),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeFilter, setActiveFilter] = useState(PORTFOLIO_FILTER_ALL);
  const [pendingActionKey, setPendingActionKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = filterPortfolioItems(items, activeFilter);
  const totalItems = items.length;
  const visibleItems = items.filter((item) => item.isVisible).length;
  const hiddenItems = totalItems - visibleItems;
  const activeFilterLabel =
    PORTFOLIO_FILTERS.find((filter) => filter.value === activeFilter)?.label ||
    "All Works";

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const previousItems = items;
    const itemsWithNewOrder = reorderPortfolioItems(
      items,
      activeFilter,
      result.source.index,
      result.destination.index,
    );

    setItems(itemsWithNewOrder);

    try {
      const res = await fetch("/api/admin/our-works/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          itemsWithNewOrder.map((item) => ({ id: item.id, order: item.order })),
        ),
      });

      if (!res.ok) throw new Error("Failed to update order");
      toast.success("Order updated");
    } catch (_error) {
      setItems(previousItems);
      toast.error("Failed to sync order with server");
    }
  };

  const toggleVisibility = async (item) => {
    setPendingActionKey(`visibility:${item.id}`);
    try {
      const res = await fetch(`/api/admin/our-works/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");

      const updatedItem = await res.json();
      setItems((currentItems) =>
        normalizePortfolioItems(
          currentItems.map((currentItem) =>
            currentItem.id === item.id ? updatedItem : currentItem,
          ),
        ),
      );
      toast.success(`Entry ${updatedItem.isVisible ? "published" : "hidden"}`);
    } catch (_error) {
      toast.error("Error updating visibility");
    } finally {
      setPendingActionKey(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPendingActionKey(`delete:${deleteTarget.id}`);
    try {
      const res = await fetch(`/api/admin/our-works/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete entry");

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast.success("Entry deleted successfully");
    } catch (_error) {
      toast.error("Error deleting entry");
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleFormSuccess = (savedItem) => {
    if (editingItem) {
      setItems((currentItems) =>
        normalizePortfolioItems(
          currentItems.map((item) =>
            item.id === savedItem.id ? savedItem : item,
          ),
        ),
      );
    } else {
      setItems((currentItems) =>
        normalizePortfolioItems([...currentItems, savedItem]),
      );
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardDescription>Total entries</AdminCardDescription>
            <AdminCardTitle>
              {loadError ? "Unavailable" : totalItems}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              {loadError
                ? "Portfolio totals could not be loaded."
                : "Global drag order persists across all media types."}
            </p>
          </AdminCardContent>
        </AdminCard>
        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardDescription>Visible on site</AdminCardDescription>
            <AdminCardTitle>
              {loadError ? "Unavailable" : visibleItems}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              {loadError
                ? "Visibility totals could not be loaded."
                : `${hiddenItems} currently hidden from the public portfolio.`}
            </p>
          </AdminCardContent>
        </AdminCard>
        <AdminCard tone="subtle">
          <AdminCardHeader>
            <AdminCardDescription>Current filter</AdminCardDescription>
            <AdminCardTitle>
              {loadError ? "Unavailable" : filteredItems.length}
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              {loadError
                ? "Filtered results could not be loaded."
                : `Showing ${activeFilterLabel} results from the live content library.`}
            </p>
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminTablePanel
        title="Portfolio entries"
        description="Filter by media type, keep visibility in sync, and drag rows to update the single public display order."
        actions={
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) setEditingItem(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className={ADMIN_PRIMARY_BUTTON_CLASS}
                onClick={openCreateModal}
                disabled={Boolean(loadError)}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Button>
            </DialogTrigger>
            <AdminDialogContent
              className="max-h-[90vh] max-w-2xl overflow-hidden p-0"
              title={
                editingItem
                  ? "Edit Portfolio Entry"
                  : "Create New Portfolio Entry"
              }
              description="Keep the current content workflow intact while updating media, visibility, and display order."
            >
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto px-6 pb-6">
                <PortfolioForm
                  key={editingItem?.id ?? "new"}
                  onSuccess={handleFormSuccess}
                  initialData={editingItem}
                />
              </div>
            </AdminDialogContent>
          </Dialog>
        }
      >
        <div className="space-y-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <AdminFilterRow>
            {PORTFOLIO_FILTERS.map((filter) => (
              <AdminFilterChip
                key={filter.value}
                active={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </AdminFilterChip>
            ))}
          </AdminFilterRow>

          <AdminInlineMessage
            tone="info"
            title="Filtered drag ordering remains global"
            description="Reordering a filtered view only changes the relative sequence of matching entries. Hidden media types keep their place in the overall portfolio order."
          />
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className={`${TABLE_HEAD_CLASS} w-[72px]`}>
                  Order
                </TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Title</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Media Type</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Assets</TableHead>
                <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <Droppable droppableId="portfolio">
              {(provided) => (
                <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                  {loadError ? (
                    <TableRow>
                      <TableCell colSpan={6} className={TABLE_CELL_CLASS}>
                        <div className="space-y-4 py-4 text-center">
                          <AdminEmptyState
                            icon={Images}
                            title="Portfolio entries are unavailable"
                            description="The live portfolio could not be loaded, so this table cannot determine whether the library is empty. Retry before creating or changing entries."
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.refresh()}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry load
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className={TABLE_CELL_CLASS}>
                        <AdminEmptyState
                          icon={Images}
                          title={
                            totalItems === 0
                              ? "No portfolio items found"
                              : "No entries match this filter"
                          }
                          description={
                            totalItems === 0
                              ? "Create the first portfolio entry to populate the landing page and portfolio collections."
                              : "Try a different media-type filter or create a new entry for this content group."
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => {
                      const visibilityPending =
                        pendingActionKey === `visibility:${item.id}`;
                      const deletePending =
                        pendingActionKey === `delete:${item.id}`;
                      const rowBusy = visibilityPending || deletePending;

                      return (
                        <Draggable
                          key={item.id}
                          draggableId={item.id.toString()}
                          index={index}
                        >
                          {(provided) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <TableCell
                                {...provided.dragHandleProps}
                                className={`${TABLE_CELL_CLASS} align-top`}
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical
                                    className="cursor-grab text-[hsl(var(--admin-muted))] active:cursor-grabbing"
                                    size={18}
                                    aria-hidden="true"
                                  />
                                  <div className="space-y-1">
                                    <div className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                                      {(item.order ?? index) + 1}
                                    </div>
                                    <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--admin-muted))]">
                                      Drag
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell
                                className={`${TABLE_CELL_CLASS} align-top`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {item.title}
                                  </span>
                                  <span className="text-xs text-[hsl(var(--admin-muted))]">
                                    {item.subtitle || "No subtitle provided"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell
                                className={`${TABLE_CELL_CLASS} align-top`}
                              >
                                <AdminBadge
                                  tone={PORTFOLIO_TYPE_META[item.type]?.tone}
                                >
                                  {PORTFOLIO_TYPE_META[item.type]?.label ||
                                    item.type}
                                </AdminBadge>
                              </TableCell>
                              <TableCell
                                className={`${TABLE_CELL_CLASS} align-top`}
                              >
                                <AdminBadge
                                  tone={item.isVisible ? "success" : "neutral"}
                                >
                                  {item.isVisible ? "Visible" : "Hidden"}
                                </AdminBadge>
                              </TableCell>
                              <TableCell
                                className={`${TABLE_CELL_CLASS} align-top`}
                              >
                                <div className="flex items-center gap-2 text-sm text-[hsl(var(--admin-muted))]">
                                  <ArrowDownUp className="h-4 w-4" />
                                  <span>
                                    {Array.isArray(item.mediaContent)
                                      ? `${item.mediaContent.length} files`
                                      : "1 link"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell
                                className={`${TABLE_CELL_CLASS} align-top text-right`}
                              >
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={ADMIN_GHOST_ICON_BUTTON_CLASS}
                                    onClick={() => openEditModal(item)}
                                    disabled={rowBusy}
                                    title="Edit"
                                    aria-label={`Edit ${item.title}`}
                                  >
                                    <Edit2 size={18} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={ADMIN_GHOST_ICON_BUTTON_CLASS}
                                    onClick={() => toggleVisibility(item)}
                                    disabled={rowBusy}
                                    title={item.isVisible ? "Hide" : "Show"}
                                    aria-label={
                                      item.isVisible
                                        ? `Hide ${item.title}`
                                        : `Show ${item.title}`
                                    }
                                  >
                                    {item.isVisible ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`${ADMIN_GHOST_ICON_BUTTON_CLASS} text-[hsl(var(--admin-danger))] hover:border-[hsl(var(--admin-danger)/0.28)] hover:bg-[hsl(var(--admin-danger)/0.12)] hover:text-[hsl(var(--admin-danger))]`}
                                    onClick={() => setDeleteTarget(item)}
                                    disabled={rowBusy}
                                    title="Delete"
                                    aria-label={`Delete ${item.title}`}
                                  >
                                    <Trash2 size={18} />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </DragDropContext>
      </AdminTablePanel>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !pendingActionKey?.startsWith("delete:")) {
            setDeleteTarget(null);
          }
        }}
        title="Delete portfolio entry"
        description="This permanently removes the selected portfolio entry from the live content library."
        confirmLabel="Delete entry"
        confirmPendingLabel="Deleting..."
        confirmPending={
          Boolean(deleteTarget) &&
          pendingActionKey === `delete:${deleteTarget.id}`
        }
        onConfirm={confirmDelete}
      >
        {deleteTarget ? (
          <AdminInlineMessage
            tone="warning"
            title={deleteTarget.title}
            description="Uploads, visibility state, and ordering for this entry will be removed."
          />
        ) : null}
      </AdminConfirmDialog>
    </div>
  );
}
