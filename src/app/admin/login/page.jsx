"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Button, Card, CardBody, CardHeader } from "@heroui/react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/actions/auth";
import { signInSchema } from "@/lib/schema/auth.schema";
import { setSessionUser } from "@/lib/helpers/auth"; // We might need a client-side wrapper or handle it via server action response

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(signInSchema),
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError("");

        try {
            // adminLogin is a server action.
            // It returns user data if successful.
            // But we also need to set the session cookie.
            // The server action 'adminLogin' currently just returns data.
            // We need to update 'adminLogin' to also set the session cookie using 'setSessionUser'.

            // Wait, 'adminLogin' is in 'src/lib/actions/auth.js'.
            // I should update it to set the session there.

            await adminLogin(data);

            // If successful, redirect
            router.push("/admin");
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Card className="w-full max-w-md p-6">
                <CardHeader className="flex flex-col gap-1 items-center">
                    <h1 className="text-2xl font-bold">Admin Login</h1>
                    <p className="text-sm text-gray-500">Enter your credentials to access admin panel</p>
                </CardHeader>
                <CardBody>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            {...register("email")}
                            label="Email"
                            placeholder="admin@example.com"
                            variant="bordered"
                            isInvalid={!!errors.email}
                            errorMessage={errors.email?.message}
                        />
                        <Input
                            {...register("password")}
                            label="Password"
                            placeholder="********"
                            type="password"
                            variant="bordered"
                            isInvalid={!!errors.password}
                            errorMessage={errors.password?.message}
                        />
                        <Button
                            type="submit"
                            color="primary"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Login
                        </Button>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}
