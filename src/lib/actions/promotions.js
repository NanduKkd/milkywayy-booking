"use server";

import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import {
  activatePromotion,
  assignPromotionCustomer,
  createPromotion,
  deactivatePromotion,
  listPromotions,
  pausePromotion,
  searchAssignableCustomers,
  updatePromotion,
} from "@/lib/services/promotionAdmin";
import { actionWrapper } from "./utils";

async function requirePromotionAdminActor() {
  const session = await auth();

  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const user = await models.User.findByPk(session.id);

  if (!user || user.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Promotion admin access required");
  }

  return {
    id: Number(user.id),
    role: user.role,
  };
}

function revalidatePromotionAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/promotions");
}

const getPromotionsAdminDataHandler = async () => {
  const actorUser = await requirePromotionAdminActor();
  const promotions = await listPromotions({ actorUser });

  return { promotions };
};
export const getPromotionsAdminData = actionWrapper(
  getPromotionsAdminDataHandler,
);

const createAdminPromotionHandler = async (input) => {
  const actorUser = await requirePromotionAdminActor();
  const promotion = await createPromotion({ actorUser, input });

  revalidatePromotionAdminPaths();
  return promotion;
};
export const createAdminPromotion = actionWrapper(createAdminPromotionHandler);

const updateAdminPromotionHandler = async (promotionId, input) => {
  const actorUser = await requirePromotionAdminActor();
  const promotion = await updatePromotion({ actorUser, promotionId, input });

  revalidatePromotionAdminPaths();
  return promotion;
};
export const updateAdminPromotion = actionWrapper(updateAdminPromotionHandler);

const activateAdminPromotionHandler = async (promotionId) => {
  const actorUser = await requirePromotionAdminActor();
  const promotion = await activatePromotion({ actorUser, promotionId });

  revalidatePromotionAdminPaths();
  return promotion;
};
export const activateAdminPromotion = actionWrapper(
  activateAdminPromotionHandler,
);

const pauseAdminPromotionHandler = async (promotionId) => {
  const actorUser = await requirePromotionAdminActor();
  const promotion = await pausePromotion({ actorUser, promotionId });

  revalidatePromotionAdminPaths();
  return promotion;
};
export const pauseAdminPromotion = actionWrapper(pauseAdminPromotionHandler);

const deactivateAdminPromotionHandler = async (promotionId) => {
  const actorUser = await requirePromotionAdminActor();
  const promotion = await deactivatePromotion({ actorUser, promotionId });

  revalidatePromotionAdminPaths();
  return promotion;
};
export const deactivateAdminPromotion = actionWrapper(
  deactivateAdminPromotionHandler,
);

const searchPromotionAssignableCustomersHandler = async (query) => {
  const actorUser = await requirePromotionAdminActor();
  const customers = await searchAssignableCustomers({ actorUser, query });

  return customers;
};
export const searchPromotionAssignableCustomers = actionWrapper(
  searchPromotionAssignableCustomersHandler,
);

const assignAdminPromotionCustomerHandler = async (promotionId, userId) => {
  const actorUser = await requirePromotionAdminActor();
  const promotion = await assignPromotionCustomer({
    actorUser,
    promotionId,
    userId,
  });

  revalidatePromotionAdminPaths();
  return promotion;
};
export const assignAdminPromotionCustomer = actionWrapper(
  assignAdminPromotionCustomerHandler,
);
