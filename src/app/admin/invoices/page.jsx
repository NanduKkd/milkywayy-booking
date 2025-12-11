"use client";
import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
      <div className="rounded-md border border-zinc-800 bg-[#181818]">
        <Table>
          <TableHeader className="bg-zinc-900">
            <TableRow className="border-zinc-800 hover:bg-zinc-900">
              <TableHead className="text-zinc-400">INVOICE ID</TableHead>
              <TableHead className="text-zinc-400">USER</TableHead>
              <TableHead className="text-zinc-400">DATE</TableHead>
              <TableHead className="text-zinc-400">AMOUNT</TableHead>
              <TableHead className="text-zinc-400">STATUS</TableHead>
              <TableHead className="text-zinc-400">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-500">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-zinc-800 border-zinc-800">
                  <TableCell className="text-zinc-300">#{invoice.id}</TableCell>
                  <TableCell className="text-zinc-300">
                    <div>
                      <p>{invoice.user?.fullName}</p>
                      <p className="text-xs text-zinc-500">{invoice.user?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {invoice.createdAt
                      ? new Date(invoice.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-zinc-300">AED {invoice.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={invoice.status === "success" ? "success" : "secondary"}
                      className={
                        invoice.status === "success"
                          ? "bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20"
                          : "bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20"
                      }
                    >
                      {invoice.status || "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.invoiceUrl ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <Link href={invoice.invoiceUrl} target="_blank" aria-label="Download Invoice">
                          <Download size={20} />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
