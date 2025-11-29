"use client";
import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Link,
  Chip,
  Button,
} from "@heroui/react";
import { Download } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetch("/api/admin/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          console.error("Failed to fetch invoices", data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-8 bg-[#121212] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>
      <Table
        aria-label="Invoices table"
        selectionMode="none"
        classNames={{
          wrapper: "bg-[#181818] border border-zinc-800",
          th: "bg-zinc-900 text-zinc-400",
          td: "text-zinc-300",
        }}
      >
        <TableHeader>
          <TableColumn>INVOICE ID</TableColumn>
          <TableColumn>USER</TableColumn>
          <TableColumn>DATE</TableColumn>
          <TableColumn>AMOUNT</TableColumn>
          <TableColumn>STATUS</TableColumn>
          <TableColumn>ACTION</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No invoices found"}>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="hover:bg-zinc-800">
              <TableCell>#{invoice.id}</TableCell>
              <TableCell>
                <div>
                  <p>{invoice.user?.fullName}</p>
                  <p className="text-xs text-zinc-500">{invoice.user?.email}</p>
                </div>
              </TableCell>
              <TableCell>
                {invoice.createdAt
                  ? new Date(invoice.createdAt).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell>AED {invoice.amount}</TableCell>
              <TableCell>
                <Chip
                  color={invoice.status === "success" ? "success" : "warning"}
                  variant="flat"
                  size="sm"
                >
                  {invoice.status || "Pending"}
                </Chip>
              </TableCell>
              <TableCell>
                {invoice.invoiceUrl ? (
                  <Button
                    as={Link}
                    href={invoice.invoiceUrl}
                    target="_blank"
                    isIconOnly
                    variant="light"
                    color="primary"
                    aria-label="Download Invoice"
                  >
                    <Download size={20} />
                  </Button>
                ) : (
                  <span className="text-zinc-600">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
