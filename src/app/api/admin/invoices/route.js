import { NextResponse } from "next/server";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import "@/lib/db/relations";

export async function GET() {
  try {
    const transactions = await Transaction.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
