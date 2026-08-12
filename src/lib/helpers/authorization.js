import "server-only";

import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";

export class AuthorizationError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

async function getDatabaseActor() {
  const session = await auth();

  if (!session?.id) {
    throw new AuthorizationError("Unauthorized", 401);
  }

  const user = await models.User.findByPk(session.id, {
    attributes: ["id", "role", "disabledAt"],
  });

  return user;
}

export async function requireSuperadminActor() {
  const user = await getDatabaseActor();

  if (!user || user.role !== USER_ROLES.SUPERADMIN) {
    throw new AuthorizationError("Forbidden", 403);
  }

  return {
    id: Number(user.id),
    role: user.role,
  };
}

export async function requireCustomerActor() {
  const user = await getDatabaseActor();

  if (!user || user.role !== USER_ROLES.CUSTOMER || Boolean(user.disabledAt)) {
    throw new AuthorizationError("Unauthorized", 401);
  }

  return {
    id: Number(user.id),
    role: user.role,
  };
}

export function getAuthorizationErrorStatus(error) {
  return error instanceof AuthorizationError ? error.status : null;
}
