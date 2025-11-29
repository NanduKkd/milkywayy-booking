"use server";

import { sequelize } from "@/lib/db";
import models from "@/lib/db/models";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { actionWrapper } from "@/lib/actions/utils";

const createUserHandler = async (userData) => {
  const { fullName, email, phone, role, password } = userData;

  // Check if user already exists
  const existingUser = await models.User.findOne({
    where: { email },
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
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
    id: newUser.id,
    fullName: newUser.fullName,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    createdAt: newUser.createdAt,
  };
};

export const createUser = actionWrapper(createUserHandler);
