"use client";

import { useRouter } from "next/navigation";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import CreateUserForm from "@/components/CreateUserForm";

export default function CreateUserModal() {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const handleSubmit = (userData) => {
    // TODO: Implement user creation logic
    console.log("Creating user:", userData);
    handleClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      placement="center"
      backdrop="blur"
      hideCloseButton
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Create New User
        </ModalHeader>
        <ModalBody>
          <CreateUserForm onSubmit={handleSubmit} onCancel={handleClose} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
