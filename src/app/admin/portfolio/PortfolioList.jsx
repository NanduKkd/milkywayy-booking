"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { Edit2, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PortfolioForm from "./PortfolioForm";

export default function PortfolioList({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    // Update local state first for instant feedback
    const itemsWithNewOrder = reorderedItems.map((item, index) => ({
      ...item,
      order: index,
    }));
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
      toast.error("Failed to sync order with server");
      // Optionally revert to original items here
    }
  };

  const toggleVisibility = async (item) => {
    try {
      const res = await fetch(`/api/admin/our-works/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });

      if (!res.ok) throw new Error("Failed to update visibility");

      const updatedItem = await res.json();
      setItems(items.map((i) => (i.id === item.id ? updatedItem : i)));
      toast.success(`Entry ${updatedItem.isVisible ? "published" : "hidden"}`);
    } catch (_error) {
      toast.error("Error updating visibility");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const res = await fetch(`/api/admin/our-works/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete entry");

      setItems(items.filter((i) => i.id !== id));
      toast.success("Entry deleted successfully");
    } catch (_error) {
      toast.error("Error deleting entry");
    }
  };

  const handleFormSuccess = (savedItem) => {
    if (editingItem) {
      setItems(items.map((i) => (i.id === savedItem.id ? savedItem : i)));
    } else {
      setItems([...items, savedItem]);
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" /> New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>
                {editingItem
                  ? "Edit Portfolio Entry"
                  : "Create New Portfolio Entry"}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 pb-6">
              <PortfolioForm
                onSuccess={handleFormSuccess}
                initialData={editingItem}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <DragDropContext onDragEnd={onDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <Droppable droppableId="portfolio">
              {(provided) => (
                <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No portfolio items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
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
                            <TableCell {...provided.dragHandleProps}>
                              <GripVertical
                                className="text-muted-foreground cursor-grab active:cursor-grabbing"
                                size={20}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {item.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.subtitle}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.isVisible ? "default" : "secondary"
                                }
                              >
                                {item.isVisible ? "Visible" : "Hidden"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(item)}
                                  title="Edit"
                                >
                                  <Edit2 size={18} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleVisibility(item)}
                                  title={item.isVisible ? "Hide" : "Show"}
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
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(item.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </TableBody>
              )}
            </Droppable>
          </Table>
        </DragDropContext>
      </div>
    </div>
  );
}
