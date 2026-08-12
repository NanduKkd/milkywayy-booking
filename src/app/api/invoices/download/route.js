import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import Transaction from "@/lib/db/models/transaction";
import { requireInvoiceDownloadActor } from "@/lib/helpers/authorization";
import { formatInvoiceNumber } from "@/lib/helpers/invoice-format";
import { authorizationErrorResponse } from "@/lib/helpers/routeAuthorization";
import {
  createInvoiceDownloadUrl,
  parseOwnedInvoiceObjectUrl,
} from "@/lib/storage/s3";

export async function GET(request) {
  let actorUser;

  try {
    actorUser = await requireInvoiceDownloadActor();
  } catch (error) {
    const authorizationResponse = authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    throw error;
  }

  const { searchParams } = new URL(request.url);
  const transactionId = Number(searchParams.get("transactionId"));
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return NextResponse.json(
      { error: "transactionId is required" },
      { status: 400 },
    );
  }

  const where = { id: transactionId };
  if (actorUser.role !== USER_ROLES.SUPERADMIN) where.userId = actorUser.id;
  const transaction = await Transaction.findOne({ where });
  if (!transaction?.invoiceUrl) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const ownedObject = parseOwnedInvoiceObjectUrl(transaction.invoiceUrl);
  if (!ownedObject) {
    return NextResponse.json(
      { error: "Invoice is not stored in the configured bucket" },
      { status: 409 },
    );
  }

  try {
    const invoiceNumber = formatInvoiceNumber(transaction);
    const signedUrl = await createInvoiceDownloadUrl({
      key: ownedObject.key,
      fileName: `Milkywayy_${invoiceNumber || "invoice"}.pdf`,
    });
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to sign invoice download:", error);
    return NextResponse.json(
      { error: "Unable to prepare invoice" },
      { status: 502 },
    );
  }
}
