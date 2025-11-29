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
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Card,
  CardBody,
} from "@heroui/react";
import { Plus, Trash2, Power, Percent, Tag } from "lucide-react";
import { michroma } from "@/fonts";

export default function CouponManager({ initialCoupons }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    perUser: 1,
    minimumAmount: 0,
    percentDiscount: 0,
    maxDiscount: 0,
    isActive: true,
  });

  const handleCreate = async (onClose) => {
    setIsLoading(true);
    try {
      const result = await createCoupon(formData);
      if (result.success) {
        // Refresh logic or optimistic update could go here
        // For now we might need to reload or rely on the parent to re-render if using router.refresh()
        // But since we are in a client component with initial state, let's just reload the page for simplicity
        // or better, we should probably just update the local state if we returned the new coupon
        // But the action returns success boolean.
        window.location.reload();
        onClose();
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

  const columns = [
    { name: "CODE", uid: "code" },
    { name: "DISCOUNT", uid: "discount" },
    { name: "MIN SPEND", uid: "minSpend" },
    { name: "STATUS", uid: "status" },
    { name: "ACTIONS", uid: "actions" },
  ];

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
          color="primary"
          endContent={<Plus size={20} />}
          onPress={onOpen}
          className="font-semibold"
        >
          Create Coupon
        </Button>
      </div>

      <Card className="bg-[#181818bb] border border-zinc-800">
        <CardBody>
          <Table
            aria-label="Coupons table"
            classNames={{
              base: "max-h-[520px] overflow-scroll",
              table: "min-h-[400px]",
              th: "bg-[#272727] text-gray-300",
              td: "text-gray-300",
              wrapper: "bg-transparent shadow-none",
            }}
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.uid}
                  align={column.uid === "actions" ? "center" : "start"}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={coupons} emptyContent={"No coupons found"}>
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    if (columnKey === "code") {
                      return (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tag size={16} className="text-primary" />
                            <span className="font-bold text-white tracking-wider">
                              {item.code}
                            </span>
                          </div>
                        </TableCell>
                      );
                    }
                    if (columnKey === "discount") {
                      return (
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
                      );
                    }
                    if (columnKey === "minSpend") {
                      return <TableCell>AED {item.minimumAmount}</TableCell>;
                    }
                    if (columnKey === "status") {
                      return (
                        <TableCell>
                          <Chip
                            color={item.isActive ? "success" : "danger"}
                            variant="flat"
                            size="sm"
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </Chip>
                        </TableCell>
                      );
                    }
                    if (columnKey === "actions") {
                      return (
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color={item.isActive ? "warning" : "success"}
                              onPress={() =>
                                handleToggle(item.id, item.isActive)
                              }
                              title={item.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power size={18} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => handleDelete(item.id)}
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </TableCell>
                      );
                    }
                    return <TableCell>{item[columnKey]}</TableCell>;
                  }}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        classNames={{
          base: "bg-[#181818] border border-zinc-800 text-white",
          header: "border-b border-zinc-800",
          footer: "border-t border-zinc-800",
          closeButton: "hover:bg-zinc-800 active:bg-zinc-800",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Create New Coupon
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="space-y-4">
                  <Input
                    label="Coupon Code"
                    placeholder="e.g. SUMMER2024"
                    variant="bordered"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    classNames={{
                      inputWrapper:
                        "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                      input: "text-white",
                    }}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Discount Percentage"
                      placeholder="0-100"
                      type="number"
                      variant="bordered"
                      endContent={
                        <Percent size={16} className="text-gray-400" />
                      }
                      value={formData.percentDiscount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          percentDiscount: e.target.value,
                        })
                      }
                      classNames={{
                        inputWrapper:
                          "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                        input: "text-white",
                      }}
                    />
                    <Input
                      label="Max Discount (AED)"
                      placeholder="Amount"
                      type="number"
                      variant="bordered"
                      value={formData.maxDiscount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDiscount: e.target.value,
                        })
                      }
                      classNames={{
                        inputWrapper:
                          "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                        input: "text-white",
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Min Spend (AED)"
                      placeholder="Amount"
                      type="number"
                      variant="bordered"
                      value={formData.minimumAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minimumAmount: e.target.value,
                        })
                      }
                      classNames={{
                        inputWrapper:
                          "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                        input: "text-white",
                      }}
                    />
                    <Input
                      label="Uses Per User"
                      placeholder="Count"
                      type="number"
                      variant="bordered"
                      value={formData.perUser}
                      onChange={(e) =>
                        setFormData({ ...formData, perUser: e.target.value })
                      }
                      classNames={{
                        inputWrapper:
                          "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                        input: "text-white",
                      }}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={() => handleCreate(onClose)}
                  isLoading={isLoading}
                >
                  Create Coupon
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
