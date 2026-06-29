import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";

function normalizeDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("A valid date is required.");
  }

  return date;
}

function normalizeScopes(scopes) {
  return [...new Set((Array.isArray(scopes) ? scopes : []).map(String))]
    .map((scope) => scope.trim())
    .filter(Boolean)
    .sort();
}

function areScopeSetsEqual(left, right) {
  const normalizedLeft = normalizeScopes(left);
  const normalizedRight = normalizeScopes(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every(
    (scope, index) => scope === normalizedRight[index],
  );
}

function runInTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

async function findActiveConsentInTransaction({
  clientId,
  userId,
  transaction,
}) {
  return models.OAuthConsent.findOne({
    where: {
      clientId,
      revokedAt: null,
      userId,
    },
    lock: transaction?.LOCK?.UPDATE,
    transaction,
  });
}

export function hasActiveConsentForScopes({ consent, scopes }) {
  if (!consent) {
    return false;
  }

  const requestedScopes = normalizeScopes(scopes);

  if (requestedScopes.length === 0) {
    return false;
  }

  const grantedScopes = new Set(normalizeScopes(consent.scopes));
  return requestedScopes.every((scope) => grantedScopes.has(scope));
}

export async function loadActiveOAuthConsent({
  clientId,
  transaction,
  userId,
}) {
  return findActiveConsentInTransaction({
    clientId,
    transaction,
    userId,
  });
}

export async function grantOAuthConsent({
  clientId,
  now = new Date(),
  scopes,
  transaction,
  userId,
}) {
  const grantedAt = normalizeDate(now);
  const normalizedScopes = normalizeScopes(scopes);

  if (normalizedScopes.length === 0) {
    throw new TypeError("At least one OAuth scope is required.");
  }

  return runInTransaction(transaction, async (activeTransaction) => {
    const activeConsent = await findActiveConsentInTransaction({
      clientId,
      transaction: activeTransaction,
      userId,
    });

    if (
      activeConsent &&
      areScopeSetsEqual(activeConsent.scopes, normalizedScopes)
    ) {
      return activeConsent;
    }

    if (activeConsent) {
      await activeConsent.update(
        {
          revokedAt: grantedAt,
        },
        { transaction: activeTransaction },
      );
    }

    return models.OAuthConsent.create(
      {
        clientId,
        grantedAt,
        revokedAt: null,
        scopes: normalizedScopes,
        userId,
      },
      { transaction: activeTransaction },
    );
  });
}

export async function revokeOAuthConsent({
  clientId,
  now = new Date(),
  transaction,
  userId,
}) {
  const revokedAt = normalizeDate(now);

  return runInTransaction(transaction, async (activeTransaction) => {
    const activeConsent = await findActiveConsentInTransaction({
      clientId,
      transaction: activeTransaction,
      userId,
    });

    if (activeConsent) {
      await activeConsent.update(
        {
          revokedAt,
        },
        { transaction: activeTransaction },
      );
    }

    const [revokedAccessTokenCount] = await models.OAuthAccessToken.update(
      {
        revokedAt,
      },
      {
        where: {
          clientId,
          revokedAt: null,
          userId,
        },
        transaction: activeTransaction,
      },
    );

    const [revokedRefreshTokenCount] = await models.OAuthRefreshToken.update(
      {
        revokedAt,
      },
      {
        where: {
          clientId,
          revokedAt: null,
          userId,
        },
        transaction: activeTransaction,
      },
    );

    return {
      activeConsentId: activeConsent?.id ?? null,
      revokedAccessTokenCount,
      revokedConsent: Boolean(activeConsent),
      revokedRefreshTokenCount,
    };
  });
}

export async function listActiveOAuthConnections({ userId }) {
  return models.OAuthConsent.findAll({
    include: [
      {
        as: "client",
        model: models.OAuthClient,
        required: true,
      },
    ],
    order: [
      ["grantedAt", "DESC"],
      ["id", "DESC"],
    ],
    where: {
      revokedAt: null,
      userId,
    },
  });
}
