import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import Booking from "@/lib/db/models/booking";
import User from "@/lib/db/models/user";
import { getPricingConfig } from "@/lib/helpers/pricing";
import {
  formatBookingReferenceList,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock",
  },
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

function getBookingDisplayTitle(booking) {
  const property = booking.propertyDetails || {};
  const type = property.type || property.propertyType || booking.propertyType || "";
  const size = property.size || property.propertySize || booking.propertySize || "";
  const community = property.community || "";

  return [type, size, community].filter(Boolean).join(" - ");
}

function getBookingServiceSummary(booking) {
  const shoot = booking.shootDetails || {};
  const services = Array.isArray(shoot.services)
    ? shoot.services.map((service) => String(service).replace(/_/g, " "))
    : [];

  const videoFormat = shoot.videographySubService
    ? String(shoot.videographySubService)
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
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" - ");

  return label ? `Videography - ${label}` : "Videography";
}

export function buildBookingInvoiceItems(booking, pricingConfig) {
  const bookingTotal = roundCurrency(booking?.total || 0);
  const property = booking?.propertyDetails || {};
  const shoot = booking?.shootDetails || {};
  const services = Array.isArray(shoot.services) ? shoot.services : [];
  const propertyType = property.type || property.propertyType || booking?.propertyType;
  const propertySize = property.size || property.propertySize || booking?.propertySize;

  const sizeConfig = pricingConfig?.[propertyType]?.sizes?.find(
    (size) => size.label === propertySize,
  );
  const prices = sizeConfig?.prices || {};

  const items = [];

  services.forEach((service) => {
    if (service === "Videography") {
      const videographySelections = parseVideographySelections(
        shoot.videographySubService,
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

  const itemizedTotal = roundCurrency(
    validItems.reduce((sum, item) => sum + item.amount, 0),
  );
  const delta = roundCurrency(bookingTotal - itemizedTotal);

  if (Math.abs(delta) >= 0.01) {
    validItems[validItems.length - 1] = {
      ...validItems[validItems.length - 1],
      amount: roundCurrency(validItems[validItems.length - 1].amount + delta),
    };
  }

  return validItems;
}

export async function generateAndUploadInvoice(transaction, user) {
  try {
    const [logoSrc, signatureSrc] = await Promise.all([
      getPublicAssetDataUrl("Horizontal Logo 3.png"),
      getPublicAssetDataUrl("E-sign.png"),
    ]);

    // Fetch bookings
    const bookings = await Booking.findAll({
      where: { transactionId: transaction.id },
    });

    const pricingConfig = await getPricingConfig();

    let subTotal = 0;
    const bookingReferences = formatBookingReferenceList(bookings);
    const invoiceNumber = formatInvoiceNumber(transaction.id);

    const bookingRows = bookings
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
  <td class="service-label">${item.label}</td>
  <td class="amount">AED ${item.amount.toFixed(2)}</td>
</tr>
`,
          )
          .join("");

        return `
<tr>
  <th class="item-group item-heading" scope="colgroup">
    <div class="item-title">${bookingTitle}</div>
    ${
      bookingReference
        ? `<div class="item-subtitle">Booking ID: ${bookingReference}</div>`
        : ""
    }
  </th>
  <th class="amount item-group item-heading" scope="col">Amount</th>
</tr>
${serviceRows}
`;
      })
      .join("");

    // Hydration safe date
    const invoiceDate = formatDisplayDate(new Date());

    const billToName = user.companyName || user.fullName || "Customer";
    const billToAddress = user.billingAddress || user.address || "";
    const billToEmail = user.email || "";
    const billToPhone = user.phone || "";
    const billToTrn = user.trn ? `<br/><strong>TRN:</strong> ${user.trn}` : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>

<style>

body{
font-family: Arial, sans-serif;
padding:44px 54px 38px;
color:#0f172a;
background:#ffffff;
font-size:14px;
}

.invoice-shell{
position:relative;
}

.header{
display:flex;
justify-content:space-between;
align-items:flex-start;
margin-bottom:28px;
padding-top:6px;
}

.title{
font-size:34px;
font-weight:800;
letter-spacing:-0.03em;
margin-bottom:10px;
}

.logo{
height:68px;
object-fit:contain;
}

.invoice-meta{
font-size:14px;
line-height:1.65;
margin-bottom:30px;
}

.invoice-meta strong{
font-weight:700;
}

.section{
display:grid;
grid-template-columns:1fr 1fr;
gap:52px;
margin-bottom:34px;
}

.section-title{
font-weight:700;
font-size:14px;
letter-spacing:0.05em;
margin-bottom:10px;
text-transform:uppercase;
}

.party-block{
font-size:14px;
line-height:1.7;
}

table{
width:100%;
border-collapse:collapse;
font-size:14px;
}

table th,
table td{
border:1px solid #d8dee8;
padding:14px 16px;
vertical-align:top;
}

table th{
text-align:left;
font-weight:700;
}

thead td{
font-weight:700;
background:#f7f9fc;
}

.item-title{
font-weight:700;
font-size:16px;
margin-bottom:5px;
}

.item-subtitle{
font-size:13px;
line-height:1.55;
color:#475569;
}

.item-group{
background:#f7f9fc;
}

.item-heading{
vertical-align:middle;
}

.service-label{
padding-left:18px;
}

.amount{
text-align:right;
white-space:nowrap;
font-weight:700;
font-size:15px;
}

.summary{
width:270px;
margin-left:auto;
margin-top:10px;
border-collapse:collapse;
}

.summary td{
border:1px solid #d8dee8;
padding:12px 16px;
}

.summary td:last-child{
text-align:right;
}

.summary .total td{
font-weight:800;
}

.footer{
margin-top:132px;
display:flex;
justify-content:space-between;
align-items:flex-end;
gap:24px;
}

.footer-copy{
font-size:14px;
line-height:1.7;
max-width:320px;
}

.signature{
text-align:center;
min-width:180px;
}

.signature img{
height:102px;
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
<div class="header">
  <div>
    <div class="title">INVOICE</div>
    <div class="invoice-meta">
      <strong>Invoice No:</strong> ${invoiceNumber}<br/>
      <strong>Invoice Date:</strong> ${invoiceDate}<br/>
      <strong>Booking ID${bookings.length > 1 ? "s" : ""}:</strong> ${bookingReferences || "N/A"}
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
    <strong>${billToName}</strong><br/>
    ${billToAddress || ""}${billToAddress ? "<br/>" : ""}
    ${billToPhone || ""}${billToPhone ? "<br/>" : ""}
    ${billToEmail}
    ${billToTrn}
  </div>
</div>

<table>
  <tbody>
    ${bookingRows}
  </tbody>
</table>

<table class="summary">
  <tr>
    <td>Sub-Total</td>
    <td>AED ${subTotal.toFixed(2)}</td>
  </tr>
  <tr>
    <td>Tax (0%)</td>
    <td>AED 0.00</td>
  </tr>
  <tr class="total">
    <td>Total</td>
    <td>AED ${Number(transaction.amount || 0).toFixed(2)}</td>
  </tr>
</table>

<div class="footer">
  <div class="footer-copy">
    <p><strong>Payment Method:</strong> Stripe</p>
    <p><strong>Transaction ID:</strong> ${transaction.id}</p>
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
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    const customerName =
      transaction.user?.companyName ||
      transaction.user?.fullName ||
      transaction.user?.phone ||
      "Customer";
    const sanitizedName = customerName
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const key = `invoices/Milkywayy_Invoice_${invoiceNumber}_${sanitizedName}_${dateStr}.pdf`;

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
  if (transaction.invoiceUrl) return transaction.invoiceUrl;

  const resolvedUser =
    user ||
    transaction.user ||
    (transaction.userId ? await User.findByPk(transaction.userId) : null);
  if (!resolvedUser) return null;

  const generatedInvoiceUrl = await generateAndUploadInvoice(
    transaction,
    resolvedUser,
  );
  if (!generatedInvoiceUrl) return null;

  await transaction.update({ invoiceUrl: generatedInvoiceUrl });
  if (typeof transaction.setDataValue === "function") {
    transaction.setDataValue("invoiceUrl", generatedInvoiceUrl);
  } else {
    transaction.invoiceUrl = generatedInvoiceUrl;
  }

  return generatedInvoiceUrl;
}
