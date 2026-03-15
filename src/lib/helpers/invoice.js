import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";
import Booking from "@/lib/db/models/booking";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock",
  },
});

export async function generateAndUploadInvoice(transaction, user) {
  try {

    // Fetch bookings
    const bookings = await Booking.findAll({
      where: { transactionId: transaction.id },
    });

    let subTotal = 0;

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
`
          )
          .join("");
      })
      .join("");

    // Hydration safe date
    const invoiceDate = new Date().toLocaleDateString("en-GB");

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>

<style>

body{
font-family: Arial, sans-serif;
padding:40px;
color:#333;
}

.header{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:30px;
}

.invoice-title{
font-size:28px;
font-weight:bold;
}

.logo{
font-size:24px;
font-weight:bold;
}

.invoice-info{
margin-top:10px;
line-height:1.6;
}

.section{
margin-top:30px;
}

.company-bill{
display:flex;
justify-content:space-between;
}

.title{
font-weight:bold;
margin-bottom:6px;
}

table{
width:100%;
border-collapse:collapse;
margin-top:30px;
}

table th,
table td{
border:1px solid #ddd;
padding:10px;
}

table th{
background:#f5f5f5;
text-align:left;
}

.summary{
width:300px;
margin-left:auto;
margin-top:20px;
border:1px solid #ddd;
}

.summary div{
display:flex;
justify-content:space-between;
padding:10px;
border-bottom:1px solid #ddd;
}

.summary div:last-child{
font-weight:bold;
font-size:18px;
}

.footer{
margin-top:40px;
display:flex;
justify-content:space-between;
align-items:flex-end;
}

.signature{
text-align:center;
}

</style>

</head>

<body>

<div class="header">

<div>
<div class="invoice-title">INVOICE</div>

<div class="invoice-info">
Invoice No: MW-${transaction.id}<br/>
Invoice Date: ${invoiceDate}<br/>
Booking ID: ${transaction.bookingId || ""}
</div>

</div>

<div class="logo">
MILKYWAYY
</div>

</div>


<div class="section company-bill">

<div>
<div class="title">MILKYWAYY LLC</div>
Sharjah Media City, Sharjah<br/>
United Arab Emirates<br/>
+971 50 726 3306<br/>
hello@milkywayy.com
</div>

<div>
<div class="title">BILL TO</div>
${user.fullName}<br/>
${user.address || ""}<br/>
${user.phone || ""}<br/>
${user.email}
</div>

</div>


<table>

<thead>
<tr>
<th>Description</th>
<th style="width:150px">Amount</th>
</tr>
</thead>

<tbody>
${bookingRows}
</tbody>

</table>


<div class="summary">

<div>
<span>Sub-Total</span>
<span>AED ${subTotal}</span>
</div>

<div>
<span>Tax (0%)</span>
<span>AED 0.00</span>
</div>

<div>
<span>Total</span>
<span>AED ${transaction.amount}</span>
</div>

</div>


<div class="footer">

<div>
<strong>Payment Method:</strong> Stripe<br/>
<strong>Transaction ID:</strong> ${transaction.id}
<br/><br/>

Thank you for booking with Milkywayy.<br/>
All media files will be delivered through the client portal.
</div>

<div class="signature">

<br/><br/>

<strong>AKASH PRASEED</strong><br/>
Founder & CEO

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
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const customerName = transaction.user?.fullName || transaction.user?.phone || 'Customer';
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const key = `invoices/Milkywayy_Invoice_${sanitizedName}_${dateStr}_${transaction.id}.pdf`;

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