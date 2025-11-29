"use client";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  User,
  Chip,
  Pagination,
  Button,
  Select,
  SelectItem,
} from "@heroui/react";

const getRoleColor = (role) => {
  switch (role) {
    case "SUPERADMIN":
      return "danger";
    case "TRANSPORT":
      return "warning";
    case "SHOOT":
      return "success";
    default:
      return "default";
  }
};

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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button color="primary" onPress={() => router.push("/admin/users/create")}>
          + New User
        </Button>
      </div>
      <Table aria-label="Users table">
        <TableHeader>
          <TableColumn>USER</TableColumn>
          <TableColumn>EMAIL</TableColumn>
          <TableColumn>PHONE</TableColumn>
          <TableColumn>ROLE</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No users found">
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <User
                  name={user.fullName}
                  description={`ID: ${user.id}`}
                  avatarProps={{
                    src: "",
                    name: user.fullName,
                  }}
                />
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.phone || "N/A"}</TableCell>
              <TableCell>
                <Chip color={getRoleColor(user.role)} size="sm" variant="flat">
                  {user.role}
                </Chip>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={() => console.log("Edit user:", user.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 text-sm"
                    onClick={() => console.log("Delete user:", user.id)}
                  >
                    Delete
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-center items-center gap-5 mt-4">
        <Pagination
          total={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          showControls
          showShadow
          color="primary"
        />
        <Select
          name=""
          className="w-36"
          placeholder=""
          label="Per Page"
          selectedKeys={[limit]}
          onChange={(e) => handleLimitChange(e.target.value)}
        >
          {limitOptions.map((limit) => (
            <SelectItem key={limit}>{limit}</SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
