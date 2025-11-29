const fs = require("fs");
const path = require("path");

const pricingPath = path.join(__dirname, "src/lib/config/pricing.js");
let content = fs.readFileSync(pricingPath, "utf8");

// Regex to find prices: [SERVICES.XYZ]: 123,
// We want to replace 123 with { price: 123, slots: 1, allowEvening: false }

content = content.replace(
  /\[SERVICES\.[A-Z_]+\]:\s*(\d+),/g,
  (match, price) => {
    return `${match.split(":")[0]}: { price: ${price}, slots: 1, allowEvening: false },`;
  },
);

fs.writeFileSync(pricingPath, content);
console.log("Updated pricing.js");
