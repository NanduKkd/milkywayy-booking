"use server";

import { sequelize } from "@/db";
import models from "@/db/models";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";

export async function createUser(userData) {
  try {

    const { fullName, email, phone, role, password } = userData;

    // Check if user already exists
    const existingUser = await models.User.findOne({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await models.User.create({
      fullName,
      email,
      phone: phone || null,
      role,
      password: hashedPassword,
    });

    // Revalidate the users listing path to refresh the data
    revalidatePath("/");

    return {
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: "Failed to create user. Please try again.",
    };
  }
}
