"use client";
import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Input,
  Link,
  Chip,
} from "@heroui/react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          console.error("Failed to fetch bookings", data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleRowClick = (key) => {
    const booking = bookings.find((b) => b.id === Number(key));
    if (booking) {
      setSelectedBooking(booking);
      onOpen();
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedBooking) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bookingId", selectedBooking.id);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        // Update local state
        const updatedBooking = { ...selectedBooking, filesUrl: data.url };
        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)),
        );
        alert("File uploaded successfully");
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="p-8 bg-[#121212] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>
      <Table
        aria-label="Bookings table"
        selectionMode="single"
        onRowAction={handleRowClick}
        classNames={{
          wrapper: "bg-[#181818] border border-zinc-800",
          th: "bg-zinc-900 text-zinc-400",
          td: "text-zinc-300",
        }}
      >
        <TableHeader>
          <TableColumn>ID</TableColumn>
          <TableColumn>USER</TableColumn>
          <TableColumn>DATE</TableColumn>
          <TableColumn>AMOUNT</TableColumn>
          <TableColumn>STATUS</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No bookings found"}>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              className="cursor-pointer hover:bg-zinc-800"
            >
              <TableCell>{booking.id}</TableCell>
              <TableCell>
                <div>
                  <p>{booking.user?.fullName}</p>
                  <p className="text-xs text-zinc-500">{booking.user?.email}</p>
                </div>
              </TableCell>
              <TableCell>{booking.date}</TableCell>
              <TableCell>AED {booking.total}</TableCell>
              <TableCell>
                <Chip
                  color={
                    booking.transaction?.status === "success"
                      ? "success"
                      : "warning"
                  }
                  variant="flat"
                  size="sm"
                >
                  {booking.transaction?.status || "Pending"}
                </Chip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        className="dark text-white bg-[#181818] border border-zinc-800"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-zinc-800">
                Booking Details #{selectedBooking?.id}
              </ModalHeader>
              <ModalBody className="py-6">
                {selectedBooking && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">User</p>
                        <p className="font-medium">
                          {selectedBooking.user?.fullName}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {selectedBooking.user?.email}
                        </p>
                        <p className="text-sm text-zinc-400">
                          {selectedBooking.user?.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">
                          Date & Slot
                        </p>
                        <p className="font-medium">{selectedBooking.date}</p>
                        <p className="text-sm text-zinc-400">
                          Slot: {selectedBooking.slot}
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                      <h3 className="font-semibold mb-3 text-zinc-300">
                        Transaction
                      </h3>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-zinc-500 text-sm">Amount</p>
                          <p className="font-medium">
                            AED {selectedBooking.transaction?.amount}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-500 text-sm">Status</p>
                          <p className="capitalize font-medium">
                            {selectedBooking.transaction?.status}
                          </p>
                        </div>
                        {selectedBooking.transaction?.invoiceUrl ? (
                          <Button
                            as={Link}
                            href={selectedBooking.transaction.invoiceUrl}
                            target="_blank"
                            color="primary"
                            variant="flat"
                            size="sm"
                          >
                            Download Invoice
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">
                            No invoice available
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <h3 className="font-semibold mb-3 text-zinc-300">
                        Files
                      </h3>
                      {selectedBooking.filesUrl && (
                        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                          <p className="text-xs text-blue-300 mb-1">
                            Current File:
                          </p>
                          <Link
                            href={selectedBooking.filesUrl}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                          >
                            {selectedBooking.filesUrl}
                          </Link>
                        </div>
                      )}
                      <div className="flex gap-3 items-center">
                        <Input
                          type="file"
                          onChange={(e) => setFile(e.target.files[0])}
                          className="max-w-xs"
                          classNames={{
                            inputWrapper: "bg-zinc-900 border-zinc-700",
                            input: "text-zinc-300",
                          }}
                        />
                        <Button
                          onPress={handleUpload}
                          isLoading={uploading}
                          disabled={!file}
                          color="primary"
                        >
                          Upload to S3
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-zinc-800">
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
