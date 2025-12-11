"use client";

import { useState } from "react";
import { saveDiscounts } from "@/lib/actions/discounts";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Power,
  ArrowUp,
  ArrowDown,
  Wallet,
  Tag,
} from "lucide-react";
import { michroma } from "@/fonts";

export default function DiscountManager({ initialDiscounts }) {
  const [discounts, setDiscounts] = useState(initialDiscounts || []);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "direct",
    minAmount: 0,
    percentage: 0,
    maxDiscount: 0,
    expiryDays: 0,
    isActive: true,
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let newDiscounts;
      if (editingId) {
        newDiscounts = discounts.map((d) =>
          d.id === editingId ? { ...d, ...formData, id: editingId } : d,
        );
      } else {
        newDiscounts = [...discounts, { ...formData, id: crypto.randomUUID() }];
      }

      const result = await saveDiscounts(newDiscounts);
      if (result.success) {
        setDiscounts(newDiscounts);
        setIsOpen(false);
        resetForm();
      } else {
        alert(result.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save discount");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "direct",
      minAmount: 0,
      percentage: 0,
      maxDiscount: 0,
      expiryDays: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const handleEdit = (discount) => {
    setFormData(discount);
    setEditingId(discount.id);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;
    const newDiscounts = discounts.filter((d) => d.id !== id);
    const res = await saveDiscounts(newDiscounts);
    if (res.success) {
      setDiscounts(newDiscounts);
    } else {
      alert(res.message);
    }
  };

  const handleToggle = async (id) => {
    const newDiscounts = discounts.map((d) =>
      d.id === id ? { ...d, isActive: !d.isActive } : d,
    );
    const res = await saveDiscounts(newDiscounts);
    if (res.success) {
      setDiscounts(newDiscounts);
    } else {
      alert(res.message);
    }
  };

  const moveItem = async (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === discounts.length - 1)
    )
      return;

    const newDiscounts = [...discounts];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Clone items to ensure reference change and force re-render
    const itemMoved = { ...newDiscounts[index] };
    const itemTarget = { ...newDiscounts[targetIndex] };

    newDiscounts[targetIndex] = itemMoved;
    newDiscounts[index] = itemTarget;

    setDiscounts(newDiscounts); // Optimistic update
    const res = await saveDiscounts(newDiscounts);
    if (!res.success) {
      alert(res.message);
      // Revert changes if needed, but for now just alert
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold text-white ${michroma.className}`}>
            Discount Configuration
          </h1>
          <p className="text-zinc-400">
            Manage automatic discounts and wallet credits
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="font-semibold bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          Add Discount
        </Button>
      </div>

      <Card className="bg-[#181818bb] border border-zinc-800">
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="bg-[#272727]">
                <TableRow className="border-zinc-800 hover:bg-[#272727]">
                  <TableHead className="text-gray-300">ORDER</TableHead>
                  <TableHead className="text-gray-300">NAME</TableHead>
                  <TableHead className="text-gray-300">TYPE</TableHead>
                  <TableHead className="text-gray-300">RULES</TableHead>
                  <TableHead className="text-gray-300">STATUS</TableHead>
                  <TableHead className="text-center text-gray-300">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400">
                      No discounts configured
                    </TableCell>
                  </TableRow>
                ) : (
                  discounts.map((item, index) => (
                    <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0}
                            className="text-zinc-300 h-6 w-6"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveItem(index, "down")}
                            disabled={index === discounts.length - 1}
                            className="text-zinc-300 h-6 w-6"
                          >
                            <ArrowDown size={14} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-white">
                          {item.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.type === "wallet" ? "secondary" : "default"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {item.type === "wallet" ? (
                            <Wallet size={14} />
                          ) : (
                            <Tag size={14} />
                          )}
                          {item.type === "wallet"
                            ? "Wallet Credit"
                            : "Direct Discount"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="text-white">
                            {item.percentage}% (Max AED {item.maxDiscount})
                          </span>
                          <span className="text-zinc-400">
                            Min Spend: AED {item.minAmount}
                          </span>
                          {item.type === "wallet" && item.expiryDays > 0 && (
                            <span className="text-orange-400 text-xs">
                              Expires in {item.expiryDays} days
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.isActive ? "success" : "secondary"}
                          className={item.isActive ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-zinc-500/20 text-zinc-500 hover:bg-zinc-500/30"}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={item.isActive ? "text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10" : "text-green-500 hover:text-green-400 hover:bg-green-500/10"}
                            onClick={() => handleToggle(item.id)}
                          >
                            <Power size={18} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                            className="text-zinc-300 hover:bg-zinc-800"
                          >
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#181818] border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Discount" : "Add New Discount"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Discount Name</Label>
              <Input
                id="name"
                placeholder="e.g. Summer Sale"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Discount Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="bg-[#272727] border-zinc-700 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-zinc-800 text-white">
                  <SelectItem value="direct" className="focus:bg-zinc-800 focus:text-white">Direct Discount</SelectItem>
                  <SelectItem value="wallet" className="focus:bg-zinc-800 focus:text-white">Wallet Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="percentage">Percentage</Label>
                <div className="relative">
                  <Input
                    id="percentage"
                    placeholder="0-100"
                    type="number"
                    value={formData.percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, percentage: e.target.value })
                    }
                    className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Max Amount (AED)</Label>
                <Input
                  id="maxDiscount"
                  placeholder="Amount"
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDiscount: e.target.value,
                    })
                  }
                  className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minAmount">Min Spend (AED)</Label>
              <Input
                id="minAmount"
                placeholder="Amount"
                type="number"
                value={formData.minAmount}
                onChange={(e) =>
                  setFormData({ ...formData, minAmount: e.target.value })
                }
                className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
              />
            </div>

            {formData.type === "wallet" && (
              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expiry (Days)</Label>
                <Input
                  id="expiryDays"
                  placeholder="0 for no expiry"
                  type="number"
                  value={formData.expiryDays}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDays: e.target.value })
                  }
                  className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, isActive: v })
                }
              />
              <Label htmlFor="isActive" className="text-sm text-zinc-400 cursor-pointer">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Saving..." : "Save Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
