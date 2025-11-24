"use client";

import { useRouter } from "next/navigation";
import CreateUserForm from "@/components/CreateUserForm";

export default function CreateUserPage() {
  const router = useRouter();

  const handleSubmit = (userData) => {
    // TODO: Implement user creation logic
    console.log("Creating user:", userData);
    router.push("/users");
  };

  const handleCancel = () => {
    router.push("/users");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create New User</h1>
          <p className="text-gray-600 mt-2">
            Fill in the details to create a new user account
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <CreateUserForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
