import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import Booking from "@/lib/db/models/booking";
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

export async function generateAndUploadInvoice(transaction, user) {
  try {
    const [logoSrc, signatureSrc] = await Promise.all([
      getPublicAssetDataUrl("E-sign.png"),
      getPublicAssetDataUrl("Horizontal Logo 3.png"),
    ]);

    // Fetch bookings
    const bookings = await Booking.findAll({
      where: { transactionId: transaction.id },
    });

    let subTotal = 0;
    const bookingReferences = formatBookingReferenceList(bookings);
    const invoiceNumber = formatInvoiceNumber(transaction.id);

    const bookingRows = bookings
      .map((b) => {
        const shoot = b.shootDetails || {};

        const services = Array.isArray(shoot.services)
          ? shoot.services.map((s) => s.replace(/_/g, " "))
          : [];

        subTotal += Number(b.total);

        return services
          .map(
            (service) => `
<tr>
<td>${service}</td>
<td>AED ${b.total}</td>
</tr>
`,
          )
          .join("");
      })
      .join("");

    // Hydration safe date
    const invoiceDate = new Date().toLocaleDateString("en-GB");

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
padding:60px;
color:#111;
}

.header{
display:flex;
justify-content:space-between;
align-items:flex-start;
margin-bottom:10px;
}

.title{
font-size:40px;
font-weight:800;
letter-spacing:2px;
}

.logo{
height:40px;
}

.invoice-meta{
margin-top:8px;
font-size:14px;
line-height:1.6;
margin-bottom:40px;
}

.section{
display:grid;
grid-template-columns:1fr 1fr;
gap:80px;
margin-bottom:40px;
}

.section-title{
font-weight:bold;
font-size:13px;
letter-spacing:1px;
margin-bottom:6px;
}

table{
width:100%;
border-collapse:collapse;
font-size:14px;
}

table th,
table td{
border:1px solid #ddd;
padding:12px;
}

thead td{
font-weight:bold;
}

.amount{
text-align:right;
}

.summary{
width:280px;
margin-left:auto;
margin-top:20px;
border-collapse:collapse;
}

.summary td{
border:1px solid #ddd;
padding:10px;
}

.summary td:last-child{
text-align:right;
}

.summary .total td{
font-weight:bold;
}

.footer{
margin-top:60px;
display:flex;
justify-content:space-between;
align-items:flex-end;
}

.signature{
text-align:center;
}

.signature img{
height:100px;
opacity:0.8;
}

.signature-line{
width:160px;
border-top:1px solid #000;
margin:6px auto;
}

.small{
font-size:12px;
color:#555;
}

</style>

</head>

<body>

<div class="header">

<div class="title">INVOICE</div>

<img src="${logoSrc || "https://milkywayy.com/logo.png"}" class="logo"/>

</div>

<div class="invoice-meta">
<strong>Invoice No:</strong> ${invoiceNumber}<br/>
<strong>Invoice Date:</strong> ${invoiceDate}<br/>
<strong>Booking Reference${bookings.length > 1 ? "s" : ""}:</strong> ${bookingReferences || "N/A"}
</div>

<div class="section">

<div>
<div class="section-title">MILKYWAYY LLC</div>
Sharjah Media City, Sharjah<br/>
United Arab Emirates<br/>
+971 50 726 3306<br/>
hello@milkywayy.com
</div>

<div>
<div class="section-title">BILL TO</div>
<strong>${billToName}</strong><br/>
${billToAddress || ""}${billToAddress ? "<br/>" : ""}
${billToPhone || ""}${billToPhone ? "<br/>" : ""}
${billToEmail}
${billToTrn}
</div>

</div>

<table>

<thead>
<tr>
<td>Description</td>
<td class="amount">Amount</td>
</tr>
</thead>

<tbody>
${bookingRows}
</tbody>

</table>

<table class="summary">

<tr>
<td>Sub-Total</td>
<td>AED ${subTotal}</td>
</tr>

<tr>
<td>Tax (0%)</td>
<td>AED 0.00</td>
</tr>

<tr class="total">
<td>Total</td>
<td>AED ${transaction.amount}</td>
</tr>

</table>

<div class="footer">

<div>

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
