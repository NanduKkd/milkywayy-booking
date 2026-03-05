import { NextResponse } from "next/server";
import OurWork from "@/lib/db/models/ourwork";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const type = searchParams.get("type");

    const where = {
      isVisible: true,
    };

    if (type) {
      where.type = type;
    }

    const options = {
      where,
      order: [["order", "ASC"]],
    };

    if (limit) {
      const parsedLimit = Number.parseInt(limit, 10);
      if (!Number.isNaN(parsedLimit)) {
        options.limit = parsedLimit;
      }
    }

    let works;
    try {
      works = await OurWork.findAll(options);
    } catch (error) {
      const isMissingThumbnailColumn =
        error?.parent?.code === "42703" &&
        String(error?.parent?.sql || "").includes('"thumbnail"');
      if (!isMissingThumbnailColumn) throw error;

      works = await OurWork.findAll({
        ...options,
        attributes: [
          "id",
          "title",
          "subtitle",
          "type",
          "mediaContent",
          "order",
          "isVisible",
          "createdAt",
          "updatedAt",
        ],
      });
      works = works.map((w) => ({ ...w.toJSON(), thumbnail: null }));
    }

    return NextResponse.json(works);
  } catch (error) {
    console.error("Error fetching our works:", error);
    return NextResponse.json(
      { error: "Failed to fetch our works" },
      { status: 500 },
    );
  }
}
