"use client";

import { useState } from "react";
import { saveDiscounts } from "@/lib/actions/discounts";
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
  Select,
  SelectItem,
  Switch,
} from "@heroui/react";
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
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
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

  const handleSave = async (onClose) => {
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
        onClose();
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
    onOpen();
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

  const columns = [
    { name: "ORDER", uid: "order" },
    { name: "NAME", uid: "name" },
    { name: "TYPE", uid: "type" },
    { name: "RULES", uid: "rules" },
    { name: "STATUS", uid: "status" },
    { name: "ACTIONS", uid: "actions" },
  ];

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
          color="primary"
          endContent={<Plus size={20} />}
          onPress={() => {
            resetForm();
            onOpen();
          }}
          className="font-semibold"
        >
          Add Discount
        </Button>
      </div>

      <Card className="bg-[#181818bb] border border-zinc-800">
        <CardBody>
          <Table
            aria-label="Discounts table"
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
            <TableBody
              items={discounts}
              emptyContent={"No discounts configured"}
            >
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => {
                    const index = discounts.indexOf(item);
                    if (columnKey === "order") {
                      return (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => moveItem(index, "up")}
                              disabled={index === 0}
                              className="text-zinc-300"
                            >
                              <ArrowUp size={14} />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => moveItem(index, "down")}
                              disabled={index === discounts.length - 1}
                              className="text-zinc-300"
                            >
                              <ArrowDown size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      );
                    }
                    if (columnKey === "name") {
                      return (
                        <TableCell>
                          <span className="font-bold text-white">
                            {item.name}
                          </span>
                        </TableCell>
                      );
                    }
                    if (columnKey === "type") {
                      return (
                        <TableCell>
                          <Chip
                            color={
                              item.type === "wallet" ? "secondary" : "primary"
                            }
                            variant="flat"
                            size="sm"
                            startContent={
                              item.type === "wallet" ? (
                                <Wallet size={14} />
                              ) : (
                                <Tag size={14} />
                              )
                            }
                          >
                            {item.type === "wallet"
                              ? "Wallet Credit"
                              : "Direct Discount"}
                          </Chip>
                        </TableCell>
                      );
                    }
                    if (columnKey === "rules") {
                      return (
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
                      );
                    }
                    if (columnKey === "status") {
                      return (
                        <TableCell>
                          <Chip
                            color={item.isActive ? "success" : "default"}
                            variant="dot"
                            size="sm"
                            classNames={{
                              base: "text-zinc-200",
                            }}
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
                              onPress={() => handleToggle(item.id)}
                            >
                              <Power size={18} />
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => handleEdit(item)}
                              className="text-zinc-300"
                            >
                              Edit
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
                {editingId ? "Edit Discount" : "Add New Discount"}
              </ModalHeader>
              <ModalBody className="py-6">
                <div className="space-y-4">
                  <Input
                    label="Discount Name"
                    placeholder="e.g. Summer Sale"
                    variant="bordered"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    classNames={{
                      inputWrapper:
                        "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                      input: "text-white",
                    }}
                  />

                  <Select
                    label="Discount Type"
                    variant="bordered"
                    selectedKeys={[formData.type]}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    classNames={{
                      trigger:
                        "bg-[#272727] border-zinc-700 hover:border-zinc-500 data-[focus=true]:border-white",
                      value: "text-white",
                      popoverContent: "bg-[#181818] border border-zinc-800",
                    }}
                  >
                    <SelectItem
                      key="direct"
                      value="direct"
                      className="text-white hover:bg-zinc-800"
                    >
                      Direct Discount
                    </SelectItem>
                    <SelectItem
                      key="wallet"
                      value="wallet"
                      className="text-white hover:bg-zinc-800"
                    >
                      Wallet Credit
                    </SelectItem>
                  </Select>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Percentage"
                      placeholder="0-100"
                      type="number"
                      variant="bordered"
                      endContent={<span className="text-zinc-400">%</span>}
                      value={formData.percentage}
                      onChange={(e) =>
                        setFormData({ ...formData, percentage: e.target.value })
                      }
                      classNames={{
                        inputWrapper:
                          "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                        input: "text-white",
                      }}
                    />
                    <Input
                      label="Max Amount (AED)"
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
                  <Input
                    label="Min Spend (AED)"
                    placeholder="Amount"
                    type="number"
                    variant="bordered"
                    value={formData.minAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minAmount: e.target.value })
                    }
                    classNames={{
                      inputWrapper:
                        "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                      input: "text-white",
                    }}
                  />

                  {formData.type === "wallet" && (
                    <Input
                      label="Expiry (Days)"
                      placeholder="0 for no expiry"
                      type="number"
                      variant="bordered"
                      value={formData.expiryDays}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDays: e.target.value })
                      }
                      classNames={{
                        inputWrapper:
                          "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                        input: "text-white",
                      }}
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      isSelected={formData.isActive}
                      onValueChange={(v) =>
                        setFormData({ ...formData, isActive: v })
                      }
                    />
                    <span className="text-sm text-zinc-400">Active</span>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={() => handleSave(onClose)}
                  isLoading={isLoading}
                >
                  Save Discount
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
