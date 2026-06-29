import "dotenv/config";

const DEFAULT_AUTH_METHODS = Object.freeze([
  "client_secret_basic",
  "client_secret_post",
]);

function printUsage() {
  console.log(`Usage:
  npm run oauth:provision-client -- --name "Milkywayy GPT" \\
    --redirect-uri "https://chatgpt.com/aip/oauth/callback-test" \\
    --redirect-uri "https://chat.openai.com/aip/oauth/callback-test"

Options:
  --name <value>               OAuth client display name.
  --redirect-uri <value>       Exact approved callback URI. Repeat for each URI.
  --scope <value>              Allowed scope. Repeat to override the default.
  --auth-method <value>        Token endpoint auth method. Repeat to override the default.
  --disabled                   Create the client in a disabled state.
  --help                       Show this message.

Defaults:
  scopes: ${["customer:read"].join(", ")}
  auth methods: ${DEFAULT_AUTH_METHODS.join(", ")}`);
}

function parseCliArgs(argv) {
  const args = {
    redirectUris: [],
    scopes: [],
    authMethods: [],
    isEnabled: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case "--help":
        args.help = true;
        break;
      case "--disabled":
        args.isEnabled = false;
        break;
      case "--name":
        args.name = argv[index + 1];
        index += 1;
        break;
      case "--redirect-uri":
        args.redirectUris.push(argv[index + 1]);
        index += 1;
        break;
      case "--scope":
        args.scopes.push(argv[index + 1]);
        index += 1;
        break;
      case "--auth-method":
        args.authMethods.push(argv[index + 1]);
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

  if (!args.name) {
    throw new Error("Missing required --name argument.");
  }

  if (args.redirectUris.length === 0) {
    throw new Error(
      "At least one --redirect-uri must be provided for OAuth client provisioning.",
    );
  }

  const [{ sequelize: sequelizeInstance }, { provisionOAuthClient }] =
    await Promise.all([
      import("../src/lib/db/db.js"),
      import("../src/lib/oauth/clientProvisioning.js"),
    ]);

  sequelize = sequelizeInstance;

  const { clientId, clientSecret, client } = await provisionOAuthClient({
    name: args.name,
    redirectUris: args.redirectUris,
    allowedScopes: args.scopes.length > 0 ? args.scopes : undefined,
    tokenEndpointAuthMethods:
      args.authMethods.length > 0 ? args.authMethods : undefined,
    isEnabled: args.isEnabled,
  });

  console.log("OAuth client created successfully.");
  console.log(`Client ID: ${clientId}`);
  console.log(`Client secret (shown once): ${clientSecret}`);
  console.log(`Enabled: ${client.isEnabled ? "yes" : "no"}`);
  console.log(`Redirect URIs: ${client.redirectUris.join(", ")}`);
  console.log(`Allowed scopes: ${client.allowedScopes.join(", ")}`);
  console.log(
    `Token endpoint auth methods: ${client.tokenEndpointAuthMethods.join(", ")}`,
  );
  console.log(
    "Transfer the plaintext client secret through the approved secure channel now. It is not stored in plaintext.",
  );
}

let sequelize;

try {
  await main();
} catch (error) {
  console.error("[oauth-provision-client]", error);
  process.exitCode = 1;
} finally {
  await sequelize?.close().catch(() => {});
}
