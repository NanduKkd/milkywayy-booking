import { Link2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import { listActiveOAuthConnections } from "@/lib/oauth/consent";
import { getOAuthScopeDetails } from "@/lib/oauth/scopes";

const grantedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatGrantedAt(value) {
  try {
    return grantedAtFormatter.format(new Date(value));
  } catch {
    return "Recently";
  }
}

export default async function DashboardConnectionsPage({ searchParams }) {
  const session = await auth();

  if (!session || session.role !== USER_ROLES.CUSTOMER) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const connections = await listActiveOAuthConnections({
    userId: Number(session.id),
  });
  const revoked = resolvedSearchParams?.revoked === "1";

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              OAuth Connections
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground">
              Connected apps
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Review the GPT clients currently authorized to read your approved
              Milkywayy customer data. Revoking a connection immediately retires
              its active access and refresh tokens.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Active connections: {connections.length}
          </div>
        </div>

        {revoked
          ? <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              The selected OAuth connection was revoked.
            </div>
          : null}
      </section>

      {connections.length === 0
        ? <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 text-muted-foreground" size={20} />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No active connections
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  When you connect ChatGPT or another approved OAuth client, it
                  will appear here with the scopes it can access.
                </p>
              </div>
            </div>
          </section>
        : <div className="grid gap-4">
            {connections.map((connection) => (
              <section
                key={connection.id}
                className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                        <Link2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">
                          {connection.client?.name || "OAuth Client"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Connected on {formatGrantedAt(connection.grantedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {connection.scopes.map((scope) => {
                        const details = getOAuthScopeDetails(scope);

                        return (
                          <div
                            key={scope}
                            className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3"
                          >
                            <div className="font-medium text-foreground">
                              {details.title}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {details.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form
                    method="post"
                    action="/oauth/revoke"
                    className="lg:min-w-[220px]"
                  >
                    <input
                      type="hidden"
                      name="client_id"
                      value={connection.client?.clientId || ""}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full rounded-2xl"
                    >
                      Revoke Connection
                    </Button>
                  </form>
                </div>
              </section>
            ))}
          </div>}
    </div>
  );
}
