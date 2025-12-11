"use client";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const getRoleBadgeVariant = (role) => {
  switch (role) {
    case "SUPERADMIN":
      return "destructive";
    case "TRANSPORT":
      return "secondary"; // Or custom yellow
    case "SHOOT":
      return "default"; // Or custom green
    default:
      return "outline";
  }
};

const getRoleBadgeClass = (role) => {
  switch (role) {
    case "TRANSPORT":
      return "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent";
    case "SHOOT":
      return "bg-green-500 hover:bg-green-600 text-white border-transparent";
    default:
      return "";
  }
}

const getLimitFromParams = (searchParams) => {
  const limitParam = searchParams.get("limit");
  if (!limitParam) return 10;
  const limitNum = Number(limitParam);
  if (isNaN(limitNum)) return 10;
  return limitNum;
};

export default function UserTable({ users, pagination }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [limit, limitOptions] = useMemo(() => {
    const limit = getLimitFromParams(searchParams) + "";
    const options = new Set(["10", "20", "50", limit]);

    return [limit, [...options]];
  }, [searchParams]);

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleLimitChange = (limit) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", limit.toString());
    router.push(`?${params.toString()}`);
  };

  // Simple pagination logic for now
  const renderPaginationItems = () => {
    const items = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    for (let i = 1; i <= totalPages; i++) {
      // Show first, last, current, and neighbors
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={currentPage === i}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      } else if (
        (i === currentPage - 2 && currentPage > 3) ||
        (i === currentPage + 2 && currentPage < totalPages - 2)
      ) {
        // Ellipsis logic could be added here, but skipping for simplicity or adding a dot
        // items.push(<PaginationEllipsis key={`ellipsis-${i}`} />);
      }
    }
    return items;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button
          onClick={() => router.push("/admin/users/create")}
        >
          + New User
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>USER</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>PHONE</TableHead>
              <TableHead>ROLE</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src="" alt={user.fullName} />
                        <AvatarFallback>{user.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">ID: {user.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getRoleBadgeVariant(user.role)}
                      className={getRoleBadgeClass(user.role)}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        onClick={() => console.log("Edit user:", user.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                        onClick={() => console.log("Delete user:", user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center items-center gap-5 mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                className={pagination.page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {renderPaginationItems()}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                className={pagination.page === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <div className="w-36">
          <Select
            value={limit}
            onValueChange={(val) => handleLimitChange(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Per Page" />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
