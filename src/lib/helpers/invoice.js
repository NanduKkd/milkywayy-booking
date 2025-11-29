import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock",
  },
});

import Booking from "@/lib/db/models/booking";

export async function generateAndUploadInvoice(transaction, user) {
  try {
    // Fetch bookings
    const bookings = await Booking.findAll({
      where: { transactionId: transaction.id },
    });

    const bookingRows = bookings
      .map((b) => {
        const details = b.propertyDetails || {};
        const shoot = b.shootDetails || {};
        const services = Array.isArray(shoot.services)
          ? shoot.services
              .map((s) => s.replace(/_/g, " "))
              .join(", ") // simple cleanup if needed
          : "";

        let desc = `<strong>${details.type || "Property"} ${details.size ? `- ${details.size}` : ""}</strong>`;
        desc += `<br/><span style="color: #666; font-size: 0.9em;">Date: ${b.date}</span>`;
        if (services) {
          desc += `<br/><span style="color: #666; font-size: 0.9em;">Services: ${services}</span>`;
        }

        return `
        <tr>
          <td>${desc}</td>
          <td>AED ${b.total}</td>
        </tr>`;
      })
      .join("");

    let discountRows = "";
    if (transaction.bulkDeduction > 0) {
      discountRows += `
        <tr>
          <td>Discount (Automatic)</td>
          <td>- AED ${transaction.bulkDeduction}</td>
        </tr>`;
    }
    if (transaction.couponDeduction > 0) {
      discountRows += `
        <tr>
          <td>Coupon Discount</td>
          <td>- AED ${transaction.couponDeduction}</td>
        </tr>`;
    }

    // 1. Generate HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .title { font-size: 24px; font-weight: bold; }
          .details { margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">INVOICE</div>
          <div>
            <p>MilkyWayy Booking</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p>Invoice #: ${transaction.id}</p>
          </div>
        </div>
        
        <div class="details">
          <p><strong>Bill To:</strong></p>
          <p>${user.fullName}</p>
          <p>${user.email}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bookingRows}
            ${discountRows}
          </tbody>
        </table>

        <div class="total">
          Total: AED ${transaction.amount}
        </div>
      </body>
      </html>
    `;

    // 2. Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for some environments
    });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // 3. Upload to S3
    const key = `invoices/${transaction.id}_${Date.now()}.pdf`;
    const bucketName = process.env.AWS_BUCKET_NAME || "milkywayy-bookings";

    // If no real creds, return a mock URL for dev
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
