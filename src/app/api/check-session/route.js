import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/helpers/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({
      hasSession: !!user,
      user: user
        ? {
            id: user.id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            accountType: user.accountType,
            companyName: user.companyName,
            billingAddress: user.billingAddress,
            trn: user.trn,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        hasSession: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
