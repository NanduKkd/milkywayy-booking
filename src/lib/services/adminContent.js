import OurWork from "@/lib/db/models/ourwork";
import Review from "@/lib/db/models/review";

const OUR_WORK_ATTRIBUTES_WITHOUT_THUMBNAIL = [
  "id",
  "title",
  "subtitle",
  "type",
  "mediaContent",
  "order",
  "isVisible",
  "createdAt",
  "updatedAt",
];

function serializeRows(rows) {
  return rows.map((row) =>
    typeof row?.toJSON === "function" ? row.toJSON() : row,
  );
}

function isMissingThumbnailColumn(error) {
  return (
    error?.parent?.code === "42703" &&
    String(error?.parent?.sql || "").includes('"thumbnail"')
  );
}

export async function listAdminPortfolioItems() {
  const options = {
    order: [
      ["order", "ASC"],
      ["createdAt", "DESC"],
    ],
  };

  try {
    return serializeRows(await OurWork.findAll(options));
  } catch (error) {
    if (!isMissingThumbnailColumn(error)) {
      throw error;
    }

    const rows = await OurWork.findAll({
      ...options,
      attributes: OUR_WORK_ATTRIBUTES_WITHOUT_THUMBNAIL,
    });

    return serializeRows(rows).map((row) => ({
      ...row,
      thumbnail: null,
    }));
  }
}

export async function listAdminReviews() {
  const rows = await Review.findAll({
    order: [
      ["featured", "DESC"],
      ["order", "ASC"],
      ["createdAt", "DESC"],
    ],
  });

  return serializeRows(rows);
}
