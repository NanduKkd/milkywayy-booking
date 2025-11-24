"use client";

import { useState } from "react";
import { Input, Select, SelectItem, Button } from "@heroui/react";
import { createUser } from "@/lib/actions/users";

const roles = [
  { key: "SUPERADMIN", label: "Super Admin" },
  { key: "TRANSPORT", label: "Transport" },
  { key: "SHOOT", label: "Shoot" },
];

export default function CreateUserForm({ onSubmit, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.target);
    const userData = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      role: formData.get("role"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    if (userData.password !== userData.confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createUser(userData);

      if (result.success) {
        onSubmit(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Input
        name="fullName"
        label="Full Name"
        placeholder="Enter full name"
        variant="bordered"
        isRequired
      />
      <Input
        name="email"
        label="Email"
        type="email"
        placeholder="Enter email address"
        variant="bordered"
        isRequired
      />
      <Input
        name="phone"
        label="Phone"
        placeholder="Enter phone number"
        variant="bordered"
      />
      <Select
        name="role"
        label="Role"
        placeholder="Select a role"
        variant="bordered"
        isRequired
      >
        {roles.map((role) => (
          <SelectItem key={role.key} value={role.key}>
            {role.label}
          </SelectItem>
        ))}
      </Select>
      <Input
        name="password"
        label="Password"
        type="password"
        placeholder="Enter password"
        variant="bordered"
      />
      <Input
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm password"
        variant="bordered"
      />
      <div className="flex gap-2 pt-4">
        <Button
          color="danger"
          variant="light"
          onPress={onCancel}
          isDisabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button color="primary" type="submit" isLoading={isSubmitting}>
          Create User
        </Button>
      </div>
    </form>
  );
}
