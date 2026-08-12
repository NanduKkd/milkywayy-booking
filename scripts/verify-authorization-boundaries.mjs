import fs from "node:fs";
import path from "node:path";

const buildDirectory = path.join(process.cwd(), ".next", "server");
const serverActionManifestPath = path.join(
  buildDirectory,
  "server-reference-manifest.json",
);
const appPathsManifestPath = path.join(
  buildDirectory,
  "app-paths-manifest.json",
);

for (const manifestPath of [serverActionManifestPath, appPathsManifestPath]) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Missing ${path.basename(manifestPath)}. Run npm run build before this verification.`,
    );
  }
}

const serverActionManifest = JSON.parse(
  fs.readFileSync(serverActionManifestPath, "utf8"),
);
const serverActions = [
  ...Object.values(serverActionManifest.node || {}),
  ...Object.values(serverActionManifest.edge || {}),
];

const exposedSessionHelpers = serverActions.filter(
  (entry) => entry.filename === "src/lib/helpers/auth.js",
);

if (exposedSessionHelpers.length > 0) {
  throw new Error(
    `Session helper exposes ${exposedSessionHelpers.length} Server Action export(s).`,
  );
}

const requiredGuardedActions = [
  ["src/lib/actions/users.js", "createUser"],
  ["src/lib/actions/bookings.js", "getBookings"],
  ["src/lib/actions/discounts.js", "saveDiscounts"],
  ["src/app/admin/prices/actions.js", "savePricingConfig"],
];

for (const [filename, exportedName] of requiredGuardedActions) {
  const exists = serverActions.some(
    (entry) =>
      entry.filename === filename && entry.exportedName === exportedName,
  );

  if (!exists) {
    throw new Error(
      `Expected guarded action missing: ${filename}#${exportedName}`,
    );
  }
}

const appPathsManifest = JSON.parse(
  fs.readFileSync(appPathsManifestPath, "utf8"),
);
const requiredGuardedRoutes = [
  "/api/admin/invoices/route",
  "/api/admin/invoices/regenerate-last/route",
  "/api/admin/our-works/route",
  "/api/admin/our-works/[id]/route",
  "/api/admin/our-works/reorder/route",
  "/api/admin/reviews/route",
  "/api/admin/reviews/[id]/route",
  "/api/admin/reviews/reorder/route",
  "/api/admin/upload/route",
  "/api/invoices/download/route",
];
const missingRoutes = requiredGuardedRoutes.filter(
  (route) => !Object.hasOwn(appPathsManifest, route),
);

if (missingRoutes.length > 0) {
  throw new Error(`Guarded admin routes missing: ${missingRoutes.join(", ")}`);
}

console.log(
  `Authorization boundary verification passed: 0 session-helper actions, ${requiredGuardedActions.length} guarded UI actions, and ${requiredGuardedRoutes.length} guarded API routes.`,
);
