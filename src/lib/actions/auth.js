"use server";

import { sequelize } from "@/db";
import models from "@/db/models";
import bcrypt from "bcrypt";
import { USER_ROLES } from '@/lib/config/app.config';
import { setSessionUser } from '@/lib/helpers/auth';

export async function adminLogin({email, password}) {
  // Check if email exists
  const user = await models.User.findOne({
    where: { email, role: USER_ROLES.CUSTOMER },
  });

  if (!user)
    throw new Error('User does not exist');

  if(!user.password)
    throw new Error('You are not allowed to login');

  // Check if password matches
  if(await bcrypt.compare(password, user.password)) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  throw new Error('Invalid password');
}

export async function customerSendOtp({ userId }) {
  const user = await models.User.findByPk(userId);

  if (!user || user.role !== USER_ROLES.CUSTOMER) {
    throw new Error('User not found');
  }

  // Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP
  const hashedOtp = await bcrypt.hash(otp, 10);

  // Save hashed OTP to user
  user.otp = hashedOtp;
  await user.save();

  // Note: In production, send OTP via SMS/email, but for now just return it
  return { otp };
}

export async function customerVerifyOtp({ userId, otp }) {
  const user = await models.User.findByPk(userId);

  if (!user || user.role !== USER_ROLES.CUSTOMER) {
    throw new Error('User not found');
  }

  if (!user.otp) {
    throw new Error('OTP not found');
  }

  // Verify OTP
  const isValid = await bcrypt.compare(otp, user.otp);

  if (!isValid) {
    throw new Error('Invalid OTP');
  }

  // Clear OTP
  user.otp = null;
  await user.save();

  // Generate auth token and save session
  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  await setSessionUser(userData);

  return userData;
}
