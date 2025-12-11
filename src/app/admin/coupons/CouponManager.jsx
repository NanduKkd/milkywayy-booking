"use client";

import { useState } from "react";
import {
  createCoupon,
  toggleCouponStatus,
  deleteCoupon,
} from "@/lib/actions/coupons";
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
import { Plus, Trash2, Power, Percent, Tag } from "lucide-react";
import { michroma } from "@/fonts";

export default function CouponManager({ initialCoupons }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    perUser: 1,
    minimumAmount: 0,
    percentDiscount: 0,
    maxDiscount: 0,
    isActive: true,
  });

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await createCoupon(formData);
      if (result.success) {
        window.location.reload();
        setIsOpen(false);
      } else {
        alert(result.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create coupon");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const res = await toggleCouponStatus(id, !currentStatus);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const res = await deleteCoupon(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold text-white ${michroma.className}`}>
            Coupon Management
          </h1>
          <p className="text-gray-400">Create and manage discount coupons</p>
        </div>
        <Button
          onClick={() => setIsOpen(true)}
          className="font-semibold bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          Create Coupon
        </Button>
      </div>

      <Card className="bg-[#181818bb] border border-zinc-800">
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="bg-[#272727]">
                <TableRow className="border-zinc-800 hover:bg-[#272727]">
                  <TableHead className="text-gray-300">CODE</TableHead>
                  <TableHead className="text-gray-300">DISCOUNT</TableHead>
                  <TableHead className="text-gray-300">MIN SPEND</TableHead>
                  <TableHead className="text-gray-300">STATUS</TableHead>
                  <TableHead className="text-center text-gray-300">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((item) => (
                    <TableRow key={item.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Tag size={16} className="text-blue-500" />
                          <span className="font-bold text-white tracking-wider">
                            {item.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-white font-medium">
                            {item.percentDiscount}% OFF
                          </span>
                          <span className="text-xs text-gray-500">
                            Max AED {item.maxDiscount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">AED {item.minimumAmount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.isActive ? "success" : "destructive"}
                          className={item.isActive ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-red-500/20 text-red-500 hover:bg-red-500/30"}
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
                            onClick={() => handleToggle(item.id, item.isActive)}
                            title={item.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power size={18} />
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
            <DialogTitle>Create New Coupon</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                placeholder="e.g. SUMMER2024"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="percentDiscount">Discount Percentage</Label>
                <div className="relative">
                  <Input
                    id="percentDiscount"
                    placeholder="0-100"
                    type="number"
                    value={formData.percentDiscount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        percentDiscount: e.target.value,
                      })
                    }
                    className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0 pr-8"
                  />
                  <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDiscount">Max Discount (AED)</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumAmount">Min Spend (AED)</Label>
                <Input
                  id="minimumAmount"
                  placeholder="Amount"
                  type="number"
                  value={formData.minimumAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumAmount: e.target.value,
                    })
                  }
                  className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perUser">Uses Per User</Label>
                <Input
                  id="perUser"
                  placeholder="Count"
                  type="number"
                  value={formData.perUser}
                  onChange={(e) =>
                    setFormData({ ...formData, perUser: e.target.value })
                  }
                  className="bg-[#272727] border-zinc-700 text-white focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Creating..." : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
