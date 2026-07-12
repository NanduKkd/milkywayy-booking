"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { actionWrapper } from "@/lib/actions/utils";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { getSessionUser } from "@/lib/helpers/auth";

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

const setCustomerDisabledHandler = async ({ userId, disabled }) => {
  const session = await getSessionUser();

  if (!session || session.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("You are not authorized to manage customer access");
  }

  const customer = await models.User.findByPk(userId);

  if (!customer || customer.role !== USER_ROLES.CUSTOMER) {
    throw new Error("Customer not found");
  }

  const shouldDisable = disabled === true;

  await customer.update({
    disabledAt: shouldDisable ? new Date() : null,
    ...(shouldDisable
      ? {
          otp: null,
          otpExpiresAt: null,
          otpAttemptCount: 0,
          otpResendAvailableAt: null,
        }
      : {}),
  });

  revalidatePath("/admin/users");

  return {
    id: customer.id,
    disabledAt: customer.disabledAt,
  };
};

export const setCustomerDisabled = actionWrapper(setCustomerDisabledHandler);
