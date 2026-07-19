"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Edit2,
  Eye,
  EyeOff,
  GripVertical,
  MessageSquareQuote,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminBadge,
  AdminConfirmDialog,
  AdminDialogContent,
  AdminEmptyState,
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
import ReviewForm from "./ReviewForm";

const ADMIN_PRIMARY_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";
const ADMIN_GHOST_ICON_BUTTON_CLASS =
  "rounded-full border border-transparent text-[hsl(var(--admin-muted))] hover:border-[hsl(var(--admin-border)/0.9)] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]";
const ADMIN_DANGER_ICON_BUTTON_CLASS = `${ADMIN_GHOST_ICON_BUTTON_CLASS} text-[hsl(var(--admin-danger))] hover:border-[hsl(var(--admin-danger)/0.28)] hover:bg-[hsl(var(--admin-danger)/0.12)] hover:text-[hsl(var(--admin-danger))]`;
const TABLE_HEAD_CLASS =
  "border-white/8 bg-white/[0.03] text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]";
const TABLE_CELL_CLASS = "border-white/8 text-[hsl(var(--admin-foreground))]";
const REVIEW_GROUPS = [
  {
    key: "featured",
    title: "Featured reviews",
    description:
      "These reviews stay pinned ahead of standard entries across the live landing page.",
    emptyTitle: "No featured reviews found",
    emptyDescription:
      "Feature a review or create a new one to populate the priority testimonial group.",
    badgeTone: "warning",
  },
  {
    key: "standard",
    title: "Standard reviews",
    description:
      "Standard reviews still respect drag order, but always render after featured entries.",
    emptyTitle: "No standard reviews found",
    emptyDescription:
      "Create a review or unfeature an existing testimonial to populate the standard list.",
    badgeTone: "neutral",
  },
];

function normalizeGroup(items) {
  return [...(items || [])].sort((left, right) => {
    const leftOrder = Number(left?.order ?? 0);
    const rightOrder = Number(right?.order ?? 0);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return Number(left?.id ?? 0) - Number(right?.id ?? 0);
  });
}

export function normalizeReviewItems(rawItems) {
  const items = [...(rawItems || [])];
  const featuredItems = normalizeGroup(items.filter((item) => item?.featured));
  const standardItems = normalizeGroup(items.filter((item) => !item?.featured));

  return [...featuredItems, ...standardItems];
}

export function buildReviewGroups(rawItems) {
  const normalizedItems = normalizeReviewItems(rawItems);

  return {
    featuredItems: normalizedItems.filter((item) => item.featured),
    standardItems: normalizedItems.filter((item) => !item.featured),
  };
}

export function reorderReviewItems(
  items,
  sourceGroup,
  sourceIndex,
  destinationIndex,
) {
  if (
    sourceIndex === destinationIndex ||
    sourceIndex < 0 ||
    destinationIndex < 0
  ) {
    return normalizeReviewItems(items);
  }

  const { featuredItems, standardItems } = buildReviewGroups(items);
  const currentGroupItems =
    sourceGroup === "featured"
      ? Array.from(featuredItems)
      : Array.from(standardItems);
  const [movedItem] = currentGroupItems.splice(sourceIndex, 1);

  if (!movedItem) {
    return normalizeReviewItems(items);
  }

  currentGroupItems.splice(destinationIndex, 0, movedItem);

  const normalizedFeaturedItems =
    sourceGroup === "featured" ? currentGroupItems : featuredItems;
  const normalizedStandardItems =
    sourceGroup === "standard" ? currentGroupItems : standardItems;

  return [
    ...normalizedFeaturedItems.map((item, index) => ({
      ...item,
      order: index,
    })),
    ...normalizedStandardItems.map((item, index) => ({
      ...item,
      order: index,
    })),
  ];
}

function getNextReviewOrder(items, featured) {
  const { featuredItems, standardItems } = buildReviewGroups(items);
  return featured ? featuredItems.length : standardItems.length;
}

function ReviewGroupTable({
  groupKey,
  title,
  description,
  emptyTitle,
  emptyDescription,
  badgeTone,
  items,
  onEdit,
  onToggleFeatured,
  onToggleVisibility,
  onDelete,
  getItemBusyState,
}) {
  return (
    <AdminTablePanel
      title={title}
      description={description}
      actions={<AdminBadge tone={badgeTone}>{items.length} live</AdminBadge>}
    >
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow>
            <TableHead className={`${TABLE_HEAD_CLASS} w-[72px]`}>
              Order
            </TableHead>
            <TableHead className={TABLE_HEAD_CLASS}>Client</TableHead>
            <TableHead className={TABLE_HEAD_CLASS}>Rating</TableHead>
            <TableHead className={TABLE_HEAD_CLASS}>Visibility</TableHead>
            <TableHead className={TABLE_HEAD_CLASS}>Source</TableHead>
            <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <Droppable droppableId={groupKey}>
          {(provided) => (
            <TableBody {...provided.droppableProps} ref={provided.innerRef}>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={TABLE_CELL_CLASS}>
                    <AdminEmptyState
                      icon={MessageSquareQuote}
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id.toString()}
                    index={index}
                  >
                    {(draggableProvided) => {
                      const rowBusy = getItemBusyState?.(item) || false;

                      return (
                        <TableRow
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                        >
                          <TableCell
                            {...draggableProvided.dragHandleProps}
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
                            <div className="space-y-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-[hsl(var(--admin-muted))]">
                                {[item.role, item.company]
                                  .filter(Boolean)
                                  .join(" at ") || "No role details provided"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell
                            className={`${TABLE_CELL_CLASS} align-top`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {Array.from({
                                  length: Number(item.rating) || 0,
                                }).map((_, ratingIndex) => (
                                  <Star
                                    key={`${item.id}_${ratingIndex}`}
                                    className="h-3.5 w-3.5 fill-[hsl(var(--admin-warning))] text-[hsl(var(--admin-warning))]"
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-[hsl(var(--admin-muted))]">
                                {Number(item.rating) || 0}/5
                              </span>
                            </div>
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
                            <div className="space-y-2">
                              <AdminBadge tone="info">
                                {item.source || "Unknown"}
                              </AdminBadge>
                              <div>
                                <AdminBadge
                                  tone={item.featured ? "warning" : "neutral"}
                                >
                                  {item.featured ? "Featured" : "Standard"}
                                </AdminBadge>
                              </div>
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
                                onClick={() => onEdit(item)}
                                disabled={rowBusy}
                                title="Edit"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Edit2 size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={ADMIN_GHOST_ICON_BUTTON_CLASS}
                                onClick={() => onToggleFeatured(item)}
                                disabled={rowBusy}
                                title={item.featured ? "Unfeature" : "Feature"}
                                aria-label={
                                  item.featured
                                    ? `Move ${item.name} to standard reviews`
                                    : `Move ${item.name} to featured reviews`
                                }
                              >
                                <Star
                                  size={18}
                                  className={
                                    item.featured
                                      ? "fill-[hsl(var(--admin-warning))] text-[hsl(var(--admin-warning))]"
                                      : ""
                                  }
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={ADMIN_GHOST_ICON_BUTTON_CLASS}
                                onClick={() => onToggleVisibility(item)}
                                disabled={rowBusy}
                                title={item.isVisible ? "Hide" : "Show"}
                                aria-label={
                                  item.isVisible
                                    ? `Hide ${item.name}`
                                    : `Show ${item.name}`
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
                                className={ADMIN_DANGER_ICON_BUTTON_CLASS}
                                onClick={() => onDelete(item)}
                                disabled={rowBusy}
                                title="Delete"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </TableBody>
          )}
        </Droppable>
      </Table>
    </AdminTablePanel>
  );
}

export default function ReviewList({ initialItems }) {
  const [items, setItems] = useState(() => normalizeReviewItems(initialItems));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingActionKey, setPendingActionKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { featuredItems, standardItems } = useMemo(
    () => buildReviewGroups(items),
    [items],
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPendingActionKey(`delete:${deleteTarget.id}`);
    try {
      const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete review");

      setItems((currentItems) =>
        normalizeReviewItems(
          currentItems.filter((item) => item.id !== deleteTarget.id),
        ),
      );
      setDeleteTarget(null);
      toast.success("Review deleted successfully");
    } catch (_error) {
      toast.error("Error deleting review");
    } finally {
      setPendingActionKey(null);
    }
  };

  const toggleVisibility = async (item) => {
    setPendingActionKey(`visibility:${item.id}`);
    try {
      const res = await fetch(`/api/admin/reviews/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");

      const updatedItem = await res.json();
      setItems((currentItems) =>
        normalizeReviewItems(
          currentItems.map((currentItem) =>
            currentItem.id === item.id ? updatedItem : currentItem,
          ),
        ),
      );
      toast.success(`Review ${updatedItem.isVisible ? "published" : "hidden"}`);
    } catch (_error) {
      toast.error("Error updating visibility");
    } finally {
      setPendingActionKey(null);
    }
  };

  const toggleFeatured = async (item) => {
    setPendingActionKey(`featured:${item.id}`);
    try {
      const nextFeaturedValue = !item.featured;
      const res = await fetch(`/api/admin/reviews/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featured: nextFeaturedValue,
          order: getNextReviewOrder(items, nextFeaturedValue),
        }),
      });

      if (!res.ok) throw new Error("Failed to update featured status");

      const updatedItem = await res.json();
      setItems((currentItems) =>
        normalizeReviewItems(
          currentItems.map((currentItem) =>
            currentItem.id === item.id ? updatedItem : currentItem,
          ),
        ),
      );
      toast.success(
        updatedItem.featured ? "Marked as featured" : "Moved to standard",
      );
    } catch (_error) {
      toast.error("Error updating featured status");
    } finally {
      setPendingActionKey(null);
    }
  };

  const handleFormSuccess = (savedItem) => {
    if (editingItem) {
      setItems((currentItems) =>
        normalizeReviewItems(
          currentItems.map((item) =>
            item.id === savedItem.id ? savedItem : item,
          ),
        ),
      );
    } else {
      setItems((currentItems) =>
        normalizeReviewItems([...currentItems, savedItem]),
      );
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.droppableId !== result.destination.droppableId) return;

    const previousItems = items;
    const nextItems = reorderReviewItems(
      items,
      result.source.droppableId,
      result.source.index,
      result.destination.index,
    );

    setItems(nextItems);

    try {
      const res = await fetch("/api/admin/reviews/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          nextItems.map((item) => ({ id: item.id, order: item.order })),
        ),
      });

      if (!res.ok) throw new Error("Failed to update review order");
      toast.success("Review order updated");
    } catch (_error) {
      setItems(previousItems);
      toast.error("Failed to sync order with server");
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const getItemBusyState = (item) =>
    pendingActionKey === `delete:${item.id}` ||
    pendingActionKey === `featured:${item.id}` ||
    pendingActionKey === `visibility:${item.id}`;

  return (
    <div className="space-y-5">
      <AdminTablePanel
        title={`${items.length} reviews`}
        actions={
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) {
                setEditingItem(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className={ADMIN_PRIMARY_BUTTON_CLASS}
                onClick={openCreateModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Review
              </Button>
            </DialogTrigger>
            <AdminDialogContent
              className="max-h-[90vh] max-w-2xl overflow-hidden p-0"
              title={editingItem ? "Edit Review" : "Create New Review"}
              description="Keep the current testimonial workflow intact while updating visibility, featured placement, rating, and within-group ordering."
            >
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto px-6 pb-6">
                <ReviewForm
                  key={editingItem?.id ?? "new"}
                  onSuccess={handleFormSuccess}
                  initialData={editingItem}
                  nextOrderByFeatured={{
                    featured: featuredItems.length,
                    standard: standardItems.length,
                  }}
                />
              </div>
            </AdminDialogContent>
          </Dialog>
        }
      >
        <div className="space-y-4 border-b border-white/8 px-5 py-4 sm:px-6">
          <AdminInlineMessage
            tone="info"
            title="Drag ordering is scoped to each review group"
            description="Featured and Standard reviews reorder independently. Moving a review between groups places it at the end of the destination group so the current ranking stays predictable."
          />
        </div>
      </AdminTablePanel>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-5">
          {REVIEW_GROUPS.map((group) => (
            <ReviewGroupTable
              key={group.key}
              groupKey={group.key}
              title={group.title}
              description={group.description}
              emptyTitle={group.emptyTitle}
              emptyDescription={group.emptyDescription}
              badgeTone={group.badgeTone}
              items={group.key === "featured" ? featuredItems : standardItems}
              onEdit={openEditModal}
              onToggleFeatured={toggleFeatured}
              onToggleVisibility={toggleVisibility}
              onDelete={setDeleteTarget}
              getItemBusyState={getItemBusyState}
            />
          ))}
        </div>
      </DragDropContext>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !pendingActionKey?.startsWith("delete:")) {
            setDeleteTarget(null);
          }
        }}
        title="Delete review"
        description="This permanently removes the selected testimonial from the live review dataset."
        confirmLabel="Delete review"
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
            title={deleteTarget.name}
            description="Its visibility, featured placement, and drag order will be removed."
          />
        ) : null}
      </AdminConfirmDialog>
    </div>
  );
}
