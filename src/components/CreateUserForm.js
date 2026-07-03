"use client";

import { useRef, useState } from "react";
import { AdminInlineMessage } from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser } from "@/lib/actions/users";

const roles = [
  { key: "SUPERADMIN", label: "Super Admin" },
  { key: "TRANSPORT", label: "Transport" },
  { key: "SHOOT", label: "Shoot" },
];

export default function CreateUserForm({ onSubmit, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(null);

  const scrollToError = () => {
    if (errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.target);
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
      setTimeout(scrollToError, 100);
      return;
    }

    try {
      const response = await createUser(userData);

      if (response.success) {
        onSubmit(response.data);
      } else {
        setError(response.message);
        setTimeout(scrollToError, 100);
      }
    } catch {
      setError("An unexpected error occurred");
      setTimeout(scrollToError, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-h-[80vh] overflow-y-auto pr-2"
    >
      {error
        ? <div ref={errorRef} className="sticky top-0 z-10">
            <AdminInlineMessage title={error} tone="danger" />
          </div>
        : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="fullName"
            className="text-sm font-medium text-[hsl(var(--admin-foreground))]"
          >
            Full Name
          </Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Enter full name"
            required
            className="admin-input h-11 rounded-2xl border-white/10 bg-[hsl(var(--admin-background-deep)/0.74)]"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="role"
            className="text-sm font-medium text-[hsl(var(--admin-foreground))]"
          >
            Role
          </Label>
          <Select name="role" required>
            <SelectTrigger
              id="role"
              className="admin-input h-11 rounded-2xl border-white/10 bg-[hsl(var(--admin-background-deep)/0.74)] text-[hsl(var(--admin-foreground))]"
            >
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.key} value={role.key}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-medium text-[hsl(var(--admin-foreground))]"
          >
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter email address"
            required
            className="admin-input h-11 rounded-2xl border-white/10 bg-[hsl(var(--admin-background-deep)/0.74)]"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="phone"
            className="text-sm font-medium text-[hsl(var(--admin-foreground))]"
          >
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            placeholder="Enter phone number"
            className="admin-input h-11 rounded-2xl border-white/10 bg-[hsl(var(--admin-background-deep)/0.74)]"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-medium text-[hsl(var(--admin-foreground))]"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter password"
            className="admin-input h-11 rounded-2xl border-white/10 bg-[hsl(var(--admin-background-deep)/0.74)]"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="confirmPassword"
            className="text-sm font-medium text-[hsl(var(--admin-foreground))]"
          >
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm password"
            className="admin-input h-11 rounded-2xl border-white/10 bg-[hsl(var(--admin-background-deep)/0.74)]"
          />
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
          Access note
        </p>
        <p className="mt-2 text-sm leading-6 text-[hsl(var(--admin-muted))]">
          This flow keeps the existing account-creation behavior unchanged. Use
          role assignment to control which internal workflow the new account can
          access.
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-11 rounded-full border border-white/10 px-5 text-[hsl(var(--admin-muted))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-full bg-[hsl(var(--admin-highlight))] px-5 text-[hsl(var(--admin-background-deep))] hover:bg-[hsl(var(--admin-highlight-soft))]"
        >
          {isSubmitting ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  );
}
