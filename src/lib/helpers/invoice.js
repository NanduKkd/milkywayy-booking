import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import { Op } from "sequelize";
import { LAUNCH_PROMO_LABEL } from "@/lib/config/promo";
import Booking from "@/lib/db/models/booking";
import User from "@/lib/db/models/user";
import {
  formatBookingReferenceList,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";
import { ensureTransactionInvoiceNumber } from "@/lib/helpers/numbering";
import { getPricingConfig } from "@/lib/helpers/pricing";
import {
  buildTransactionPromotionSummary,
  getTransactionGrossAmount,
} from "@/lib/helpers/transactionPricing";

export const INVOICE_TEMPLATE_VERSION = 3;

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

async function getPublicAssetDataUrl(fileName) {
  try {
    const filePath = path.join(process.cwd(), "public", fileName);
    const fileBuffer = await fs.readFile(filePath);
    const extension = path.extname(fileName).toLowerCase();

    const mimeType =
      extension === ".svg"
        ? "image/svg+xml"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : "image/png";

    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch (_error) {
    return null;
  }
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-GB").format(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMultilineHtml(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

function normalizePropertySizeLabel(value) {
  const size = String(value || "").trim();
  const match = size.match(/^(\d+)\s*(?:Bed|Bedroom|BR)\b/i);
  if (match) return `${match[1]}BR`;
  return size;
}

function getBookingDisplayTitle(booking) {
  const property = booking.propertyDetails || {};
  const type =
    property.type || property.propertyType || booking.propertyType || "";
  const size = normalizePropertySizeLabel(
    property.size || property.propertySize || booking.propertySize || "",
  );
  const unit = property.unit || property.unitNumber || property.name || "";
  const building = property.building || "";
  const community = property.community || "";
  const location = [unit, building || community].filter(Boolean).join(", ");

  if (location && size) {
    return `${location} - ${size}`;
  }

  return [type, size, community].filter(Boolean).join(" - ");
}

function getBookingServiceSummary(booking) {
  const property = booking.propertyDetails || {};
  const shoot = booking.shootDetails || {};
  const services = Array.isArray(shoot.services)
    ? shoot.services.map((service) => String(service).replace(/_/g, " "))
    : [];

  const videographySubService =
    property.videographySubService || shoot.videographySubService;
  const videoFormat = videographySubService
    ? String(videographySubService)
        .split("|")
        .map((value) => value.replace(/\./g, " - "))
        .join(", ")
    : "";

  const details = [...services];
  if (videoFormat && services.includes("Videography")) {
    details.push(videoFormat);
  }

  return details.join(", ");
}

function roundCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function parseVideographySelections(value) {
  return String(value || "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveVideographyPriceConfig(servicePriceConfig, subService) {
  if (
    !subService ||
    !servicePriceConfig ||
    typeof servicePriceConfig !== "object"
  ) {
    return servicePriceConfig;
  }

  if (subService.includes(".")) {
    const [mainService, category] = subService.split(".");
    const nested = servicePriceConfig?.[mainService]?.[category];

    if (nested !== undefined) return nested;

    const mainConfig = servicePriceConfig?.[mainService];
    if (
      mainConfig &&
      typeof mainConfig === "object" &&
      !Array.isArray(mainConfig) &&
      "price" in mainConfig
    ) {
      return mainConfig;
    }
  }

  const direct = servicePriceConfig?.[subService];
  if (direct !== undefined) return direct;

  return servicePriceConfig;
}

function getServiceAmount(priceConfig) {
  const amount =
    typeof priceConfig === "object"
      ? Number(priceConfig?.price || 0)
      : Number(priceConfig || 0);

  return Number.isFinite(amount) ? amount : 0;
}

function formatInvoiceServiceLabel(service, subService = "") {
  if (service !== "Videography") {
    return String(service || "Service").replace(/_/g, " ");
  }

  if (!subService) return "Videography";

  const label = String(subService)
    .split(".")
    .map((part) => part.trim().replace(/_/g, " "))
    .filter(Boolean)
    .join(" - ");

  return label ? `Videography - ${label}` : "Videography";
}

function formatInvoiceDisplayLabel(label) {
  const normalizedLabel = String(label || "Service")
    .replace(/360(?:Â°|°)?\s*Tour/gi, "360° Virtual Tour")
    .replace(/\bShort Form\b/g, "Short-Form Reel")
    .replace(/\bLong Form\b/g, "Long-Form");

  if (!normalizedLabel.startsWith("Videography - ")) {
    return normalizedLabel;
  }

  const detail = normalizedLabel.slice("Videography - ".length).trim();
  return detail ? `Videography - (${detail})` : "Videography";
}

function formatInvoiceAmount(value, { forceDecimals = false } = {}) {
  const amount = roundCurrency(value);
  if (forceDecimals || !Number.isInteger(amount)) {
    return `AED ${amount.toFixed(2)}`;
  }
  return `AED ${amount}`;
}

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

export function buildInvoiceCouponSummary(transaction) {
  const amount = roundCurrency(transaction?.couponDeduction || 0);
  if (amount <= 0) return null;

  const couponCode = String(
    transaction?.metadata?.appliedCouponCode || transaction?.coupon?.code || "",
  )
    .trim()
    .toUpperCase();

  return {
    label: couponCode ? `Coupon (${couponCode})` : "Coupon Discount",
    amount,
  };
}

export function buildInvoiceDiscountSummaries(transaction) {
  const summaries = [];
  const promotionSummary = buildTransactionPromotionSummary(transaction);
  const bulkDeduction = roundCurrency(transaction?.bulkDeduction || 0);
  const launchPromoDeduction = roundCurrency(
    transaction?.metadata?.appliedLaunchPromoDeduction || 0,
  );

  const couponSummary = buildInvoiceCouponSummary(transaction);
  const isLaunchSnapshotDuplicate =
    promotionSummary &&
    !promotionSummary.code &&
    promotionSummary.name === LAUNCH_PROMO_LABEL &&
    toCents(promotionSummary.amount) === toCents(bulkDeduction) &&
    toCents(launchPromoDeduction) === toCents(bulkDeduction);
  const isCouponSnapshotDuplicate =
    promotionSummary?.code &&
    couponSummary &&
    promotionSummary.code ===
      String(
        transaction?.metadata?.appliedCouponCode ||
          transaction?.coupon?.code ||
          "",
      )
        .trim()
        .toUpperCase() &&
    toCents(promotionSummary.amount) === toCents(couponSummary.amount);

  if (promotionSummary) {
    summaries.push({
      label: promotionSummary.label,
      amount: promotionSummary.amount,
    });
  }

  if (bulkDeduction > 0 && !isLaunchSnapshotDuplicate) {
    summaries.push({
      label:
        launchPromoDeduction > 0 && launchPromoDeduction === bulkDeduction
          ? LAUNCH_PROMO_LABEL
          : "Discount",
      amount: bulkDeduction,
    });
  }

  if (couponSummary && !isCouponSnapshotDuplicate) {
    summaries.push(couponSummary);
  }

  return summaries;
}

export function isTransactionInvoiceCurrent(
  transaction,
  invoiceNumber,
  bookingCount,
) {
  return Boolean(
    transaction?.invoiceUrl &&
      (invoiceNumber ? transaction.invoiceUrl.includes(invoiceNumber) : true) &&
      Number(transaction?.metadata?.invoiceBookingCount || 0) ===
        bookingCount &&
      Number(transaction?.metadata?.invoiceTemplateVersion || 0) ===
        INVOICE_TEMPLATE_VERSION &&
      bookingCount > 0,
  );
}

function findBookingSubsetByAmount(bookings, targetCents) {
  const matches = [];
  const candidates = Array.isArray(bookings)
    ? bookings
        .map((booking) => ({
          booking,
          cents: toCents(booking?.total),
        }))
        .filter((entry) => entry.cents > 0)
    : [];

  const search = (index, total, selected) => {
    if (matches.length > 1) return;
    if (total === targetCents) {
      matches.push([...selected]);
      return;
    }
    if (index >= candidates.length || total > targetCents) return;

    const current = candidates[index];
    selected.push(current.booking);
    search(index + 1, total + current.cents, selected);
    selected.pop();
    search(index + 1, total, selected);
  };

  search(0, 0, []);

  return matches.length === 1 ? matches[0] : [];
}

async function resolveTransactionBookings(transaction) {
  if (!transaction?.id) return [];

  let bookings = await Booking.findAll({
    where: { transactionId: transaction.id },
    order: [["id", "ASC"]],
  });
  if (bookings.length > 0) return bookings;

  const metadataBookingIds = Array.isArray(transaction.metadata?.bookingIds)
    ? transaction.metadata.bookingIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    : [];
  if (metadataBookingIds.length > 0) {
    await Booking.update(
      { transactionId: transaction.id, status: "CONFIRMED" },
      { where: { id: metadataBookingIds, userId: transaction.userId } },
    );
    bookings = await Booking.findAll({
      where: { id: metadataBookingIds, userId: transaction.userId },
      order: [["id", "ASC"]],
    });
    if (bookings.length > 0) return bookings;
  }

  const transactionCreatedAt = transaction?.createdAt
    ? new Date(transaction.createdAt)
    : null;
  const hasValidTimestamp =
    transactionCreatedAt instanceof Date &&
    !Number.isNaN(transactionCreatedAt.getTime());
  const expectedGrossCents = toCents(getTransactionGrossAmount(transaction));
  if (!transaction?.userId || !hasValidTimestamp || expectedGrossCents <= 0) {
    return [];
  }

  const windowStart = new Date(
    transactionCreatedAt.getTime() - 2 * 60 * 60 * 1000,
  );
  const windowEnd = new Date(transactionCreatedAt.getTime() + 15 * 60 * 1000);
  const candidates = await Booking.findAll({
    where: {
      userId: transaction.userId,
      status: { [Op.in]: ["DRAFT", "CONFIRMED"] },
      createdAt: { [Op.between]: [windowStart, windowEnd] },
      [Op.or]: [{ transactionId: null }, { transactionId: transaction.id }],
    },
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
  });
  const matchedBookings = findBookingSubsetByAmount(
    candidates,
    expectedGrossCents,
  );
  if (matchedBookings.length === 0) {
    console.warn("[INVOICE] Unable to resolve bookings for transaction", {
      transactionId: transaction.id,
      userId: transaction.userId,
      candidateCount: candidates.length,
      expectedGrossCents,
    });
    return [];
  }

  const matchedIds = matchedBookings.map((booking) => booking.id);
  await Booking.update(
    { transactionId: transaction.id, status: "CONFIRMED" },
    { where: { id: matchedIds } },
  );

  return Booking.findAll({
    where: { id: matchedIds },
    order: [["id", "ASC"]],
  });
}

export function buildBookingInvoiceItems(booking, pricingConfig) {
  const bookingTotal = roundCurrency(booking?.total || 0);
  const property = booking?.propertyDetails || {};
  const shoot = booking?.shootDetails || {};
  const videographySubService =
    property.videographySubService || shoot.videographySubService;
  const services = Array.isArray(shoot.services) ? shoot.services : [];
  const propertyType =
    property.type || property.propertyType || booking?.propertyType;
  const propertySize =
    property.size || property.propertySize || booking?.propertySize;

  const sizeConfig = pricingConfig?.[propertyType]?.sizes?.find(
    (size) => size.label === propertySize,
  );
  const prices = sizeConfig?.prices || {};

  const items = [];

  services.forEach((service) => {
    if (service === "Videography") {
      const videographySelections = parseVideographySelections(
        videographySubService,
      );
      const videographyConfig = prices[service];

      if (videographySelections.length > 0) {
        videographySelections.forEach((selection) => {
          items.push({
            label: formatInvoiceServiceLabel(service, selection),
            amount: roundCurrency(
              getServiceAmount(
                resolveVideographyPriceConfig(videographyConfig, selection),
              ),
            ),
          });
        });
        return;
      }

      items.push({
        label: formatInvoiceServiceLabel(service),
        amount: roundCurrency(getServiceAmount(videographyConfig)),
      });
      return;
    }

    items.push({
      label: formatInvoiceServiceLabel(service),
      amount: roundCurrency(getServiceAmount(prices[service])),
    });
  });

  const validItems = items.filter((item) => item.amount > 0);
  if (validItems.length === 0) {
    return [
      {
        label: getBookingServiceSummary(booking) || "Booking",
        amount: bookingTotal,
      },
    ];
  }

  const itemizedTotalCents = validItems.reduce(
    (sum, item) => sum + toCents(item.amount),
    0,
  );
  const deltaCents = toCents(bookingTotal) - itemizedTotalCents;

  if (deltaCents !== 0) {
    const lastItemIndex = validItems.length - 1;
    const lastItem = validItems[lastItemIndex];
    const adjustedLastItemCents = toCents(lastItem.amount) + deltaCents;

    if (adjustedLastItemCents > 0) {
      validItems[lastItemIndex] = {
        ...lastItem,
        amount: adjustedLastItemCents / 100,
      };
    } else {
      validItems.push({
        label: "Booking total adjustment",
        amount: deltaCents / 100,
      });
    }
  }

  return validItems;
}

export async function generateAndUploadInvoice(
  transaction,
  user,
  invoiceNumber,
  resolvedBookings = null,
) {
  try {
    const [logoSrc, signatureSrc] = await Promise.all([
      getPublicAssetDataUrl("Horizontal Logo 3.png"),
      getPublicAssetDataUrl("E-sign.png"),
    ]);

    const bookings =
      Array.isArray(resolvedBookings) && resolvedBookings.length > 0
        ? resolvedBookings
        : await resolveTransactionBookings(transaction);

    const pricingConfig = await getPricingConfig();

    let subTotal = 0;
    const bookingReferences = formatBookingReferenceList(bookings);
    const resolvedInvoiceNumber =
      invoiceNumber ||
      transaction.invoiceNumber ||
      formatInvoiceNumber(transaction);
    const discountSummaryRows = buildInvoiceDiscountSummaries(transaction)
      .map(
        (summary) => `
  <tr>
    <td>${escapeHtml(summary.label)}</td>
    <td>- ${formatInvoiceAmount(summary.amount, { forceDecimals: true })}</td>
  </tr>`,
      )
      .join("");

    const bookingTables = bookings
      .map((booking) => {
        const bookingTotal = Number(booking.total || 0);
        subTotal += bookingTotal;

        const bookingTitle =
          getBookingDisplayTitle(booking) ||
          formatBookingReferenceList([booking]) ||
          "Booking";
        const bookingReference = formatBookingReferenceList([booking]);
        const invoiceItems = buildBookingInvoiceItems(booking, pricingConfig);
        const serviceRows = invoiceItems
          .map(
            (item) => `
<tr>
  <td class="service-label">${escapeHtml(formatInvoiceDisplayLabel(item.label))}</td>
  <td class="amount">${formatInvoiceAmount(item.amount)}</td>
</tr>
`,
          )
          .join("");

        return `
<table class="booking-table">
  <tbody>
    <tr>
      <th class="item-group item-heading" scope="colgroup">
        <div class="item-title">${escapeHtml(bookingTitle)}</div>
        ${
          bookingReference
            ? `<div class="item-subtitle">Booking ID: ${escapeHtml(bookingReference)}</div>`
            : ""
        }
      </th>
      <th class="item-group item-heading amount-heading" scope="col">Amount</th>
    </tr>
    ${serviceRows}
  </tbody>
</table>
`;
      })
      .join("");

    // Hydration safe date
    const invoiceIssuedAt = new Date(
      transaction.paidAt || transaction.createdAt || Date.now(),
    );
    const invoiceDate = formatDisplayDate(invoiceIssuedAt);

    const billToName = user.companyName || user.fullName || "Customer";
    const billToAddress = user.billingAddress || user.address || "";
    const billToEmail = user.email || "";
    const billToPhone = user.phone || "";
    const billToTrn = user.trn
      ? `<br/><strong>TRN:</strong> ${escapeHtml(user.trn)}`
      : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>

<style>

body{
font-family: Arial, sans-serif;
padding:40px 48px 34px;
color:#202124;
background:#ffffff;
font-size:15px;
}

.invoice-shell{
position:relative;
}

.header{
display:flex;
justify-content:space-between;
align-items:flex-start;
margin-bottom:26px;
}

.title{
font-size:42px;
font-weight:800;
letter-spacing:0.02em;
margin-bottom:12px;
}

.logo{
height:58px;
object-fit:contain;
}

.invoice-meta{
font-size:15px;
line-height:1.55;
margin-bottom:30px;
}

.invoice-meta strong{
font-weight:700;
}

.section{
display:grid;
grid-template-columns:1fr 1fr;
gap:44px;
margin-bottom:38px;
}

.section-title{
font-weight:700;
font-size:15px;
letter-spacing:0.01em;
margin-bottom:10px;
text-transform:uppercase;
}

.party-block{
font-size:15px;
line-height:1.5;
}

table{
width:100%;
border-collapse:collapse;
font-size:15px;
}

.booking-table{
margin-bottom:14px;
}

table th,
table td{
border:1px solid #5f6368;
padding:14px 12px;
vertical-align:top;
}

table th{
text-align:left;
font-weight:700;
}

.item-title{
font-weight:700;
font-size:16px;
margin-bottom:0;
}

.item-subtitle{
font-size:13px;
line-height:1.5;
color:#475569;
margin-top:4px;
}

.item-group{
background:#ffffff;
}

.item-heading{
vertical-align:middle;
}

.service-label{
padding-left:12px;
}

.amount{
text-align:right;
white-space:nowrap;
font-weight:400;
font-size:15px;
}

.amount-heading{
text-align:right;
font-weight:700;
}

.summary{
width:302px;
margin-left:auto;
margin-top:6px;
border-collapse:collapse;
}

.summary td{
border:1px solid #5f6368;
padding:12px 14px;
}

.summary td:last-child{
text-align:right;
}

.summary .total td{
font-weight:800;
}

.content-wrapper{
min-height:780px;
margin-bottom:40px;
}

.footer{
display:flex;
justify-content:space-between;
align-items:flex-end;
gap:24px;
}

.footer-copy{
font-size:15px;
line-height:1.55;
max-width:320px;
}

.footer-copy p{
margin:0 0 2px 0;
}

.signature{
text-align:center;
min-width:180px;
}

.signature img{
height:92px;
object-fit:contain;
margin-bottom:2px;
}

.signature-line{
width:138px;
border-top:1px solid #111827;
margin:4px auto 8px;
}

.small{
font-size:13px;
color:#475569;
}

</style>

</head>

<body>

<div class="invoice-shell">
<div class="content-wrapper">
<div class="header">
  <div>
    <div class="title">INVOICE</div>
    <div class="invoice-meta">
      <strong>Invoice No:</strong> ${escapeHtml(resolvedInvoiceNumber)}<br/>
      <strong>Invoice Date:</strong> ${escapeHtml(invoiceDate)}<br/>
      <strong>Booking ID${bookings.length > 1 ? "s" : ""}:</strong> ${escapeHtml(bookingReferences || "N/A")}
    </div>
  </div>

  <img src="${logoSrc || "https://milkywayy.com/logo.png"}" class="logo"/>
</div>

<div class="section">
  <div class="party-block">
    <div class="section-title">MILKYWAYY LLC</div>
    Sharjah Media City, Sharjah<br/>
    United Arab Emirates<br/>
    +971 50 726 3306<br/>
    hello@milkywayy.com
  </div>

  <div class="party-block">
    <div class="section-title">Bill To</div>
    <strong>${escapeHtml(billToName)}</strong><br/>
    ${billToAddress ? `${formatMultilineHtml(billToAddress)}<br/>` : ""}
    ${billToPhone ? `${escapeHtml(billToPhone)}<br/>` : ""}
    ${escapeHtml(billToEmail)}
    ${billToTrn}
  </div>
</div>

${bookingTables}

<table class="summary">
  <tr>
    <td>Sub-Total</td>
    <td>${formatInvoiceAmount(subTotal)}</td>
  </tr>
  ${discountSummaryRows}
  <tr>
    <td>Tax (0%)</td>
    <td>AED 0.00</td>
  </tr>
  <tr class="total">
    <td>Total</td>
    <td>${formatInvoiceAmount(transaction.amount || 0, { forceDecimals: true })}</td>
  </tr>
</table>
</div>

<div class="footer">
  <div class="footer-copy">
    <p><strong>Payment Method:</strong> Stripe</p>
    <p><strong>Transaction ID:</strong> ${escapeHtml(transaction.id)}</p>
    <br/>
    <p><strong>Thank you for booking with Milkywayy.</strong></p>
    <p class="small">All media files will be delivered through the client portal.</p>
  </div>

  <div class="signature">
    <img src="${signatureSrc || "https://milkywayy.com/signature.png"}"/>
    <div class="signature-line"></div>
    <strong>AKASH PRASEED</strong><br/>
    <span class="small">Founder & CEO</span>
  </div>
</div>
</div>

</body>
</html>
`;
    // Generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Create user-friendly filename
    const dateStr = invoiceIssuedAt.toISOString().split("T")[0];
    const customerName =
      user.companyName || user.fullName || user.phone || "Customer";
    const sanitizedName = customerName
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const key = `invoices/Milkywayy_Invoice_${resolvedInvoiceNumber}_${sanitizedName}_${dateStr}_v${INVOICE_TEMPLATE_VERSION}.pdf`;

    const bucketName = process.env.AWS_BUCKET_NAME || "milkywayy-bookings";

    if (process.env.AWS_ACCESS_KEY_ID === "mock") {
      console.log("Mocking S3 upload for invoice");
      return `https://mock-s3.com/${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    });

    await s3Client.send(command);

    return `https://${bucketName}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error generating invoice:", error);
    return null;
  }
}

export async function ensureTransactionInvoiceUrl(transaction, user = null) {
  if (!transaction) return null;
  const invoiceNumber = await ensureTransactionInvoiceNumber(transaction);
  const resolvedBookings = await resolveTransactionBookings(transaction);
  const hasCurrentInvoiceUrl = isTransactionInvoiceCurrent(
    transaction,
    invoiceNumber,
    resolvedBookings.length,
  );
  if (hasCurrentInvoiceUrl) return transaction.invoiceUrl;

  const resolvedUser =
    user ||
    transaction.user ||
    (transaction.userId ? await User.findByPk(transaction.userId) : null);
  if (!resolvedUser) return null;

  const generatedInvoiceUrl = await generateAndUploadInvoice(
    transaction,
    resolvedUser,
    invoiceNumber,
    resolvedBookings,
  );
  if (!generatedInvoiceUrl) return transaction.invoiceUrl || null;

  await transaction.update({
    invoiceUrl: generatedInvoiceUrl,
    metadata: {
      ...(transaction.metadata || {}),
      invoiceBookingCount: resolvedBookings.length,
      invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
    },
  });
  if (typeof transaction.setDataValue === "function") {
    transaction.setDataValue("invoiceUrl", generatedInvoiceUrl);
    transaction.setDataValue("metadata", {
      ...(transaction.metadata || {}),
      invoiceBookingCount: resolvedBookings.length,
      invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
    });
  } else {
    transaction.invoiceUrl = generatedInvoiceUrl;
    transaction.metadata = {
      ...(transaction.metadata || {}),
      invoiceBookingCount: resolvedBookings.length,
      invoiceTemplateVersion: INVOICE_TEMPLATE_VERSION,
    };
  }

  return generatedInvoiceUrl;
}
