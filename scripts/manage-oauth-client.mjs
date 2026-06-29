import "dotenv/config";

const ACTIONS = new Set(["rotate-secret", "enable", "disable"]);

function printUsage() {
  console.log(`Usage:
  npm run oauth:manage-client -- --action rotate-secret --client-id "<client-id>"
  npm run oauth:manage-client -- --action enable --client-id "<client-id>"
  npm run oauth:manage-client -- --action disable --client-id "<client-id>"

Options:
  --action <rotate-secret|enable|disable>   Management action to perform.
  --client-id <value>                       OAuth client ID to update.
  --help                                    Show this message.`);
}

function parseCliArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--help":
        args.help = true;
        break;
      case "--action":
        args.action = argv[index + 1];
        index += 1;
        break;
      case "--client-id":
        args.clientId = argv[index + 1];
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (!ACTIONS.has(args.action)) {
    throw new Error(
      "Missing or invalid --action. Expected one of: rotate-secret, enable, disable.",
    );
  }

  if (!args.clientId) {
    throw new Error("Missing required --client-id argument.");
  }

  const [
    { sequelize: sequelizeInstance },
    { rotateOAuthClientSecret, setOAuthClientEnabledState },
  ] = await Promise.all([
    import("../src/lib/db/db.js"),
    import("../src/lib/oauth/clientProvisioning.js"),
  ]);

  sequelize = sequelizeInstance;

  if (args.action === "rotate-secret") {
    const { client, clientSecret } = await rotateOAuthClientSecret(
      args.clientId,
    );

    console.log("OAuth client secret rotated successfully.");
    console.log(`Client ID: ${client.clientId}`);
    console.log(`Enabled: ${client.isEnabled ? "yes" : "no"}`);
    console.log(`New client secret (shown once): ${clientSecret}`);
    console.log(
      "Store and transfer the new plaintext client secret through the approved secure channel now. The previous secret will no longer authenticate token requests.",
    );
    return;
  }

  const isEnabled = args.action === "enable";
  const client = await setOAuthClientEnabledState(args.clientId, isEnabled);

  console.log(
    `OAuth client ${isEnabled ? "enabled" : "disabled"} successfully.`,
  );
  console.log(`Client ID: ${client.clientId}`);
  console.log(`Enabled: ${isEnabled ? "yes" : "no"}`);
}

let sequelize;

try {
  await main();
} catch (error) {
  console.error("[oauth-manage-client]", error);
  process.exitCode = 1;
} finally {
  await sequelize?.close().catch(() => {});
}
