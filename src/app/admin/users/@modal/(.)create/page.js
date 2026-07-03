"use client";

import { useRouter } from "next/navigation";
import { AdminDialogContent } from "@/components/admin/AdminPrimitives";
import CreateUserForm from "@/components/CreateUserForm";
import { Dialog } from "@/components/ui/dialog";

export default function CreateUserModal() {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const handleSubmit = (userData) => {
    console.log("Creating user:", userData);
    handleClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <AdminDialogContent
        className="sm:max-w-2xl"
        title="Create account"
        description="Keep the current account-creation workflow available without leaving the refreshed customer route."
      >
        <div className="pt-2">
          <CreateUserForm onSubmit={handleSubmit} onCancel={handleClose} />
        </div>
      </AdminDialogContent>
    </Dialog>
  );
}
