import { NextResponse } from "next/server";
import OurWork from "@/lib/db/models/ourwork";

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, subtitle, type, mediaContent, thumbnail, order, isVisible } = body;

    if (!title || !type || !mediaContent) {
      return NextResponse.json(
        { error: "Title, Type, and Media Content are required" },
        { status: 400 },
      );
    }

    let work;
    try {
      work = await OurWork.create({
        title,
        subtitle,
        type,
        mediaContent,
        thumbnail: thumbnail || null,
        order: order || 0,
        isVisible: isVisible !== undefined ? isVisible : true,
      });
    } catch (error) {
      const isMissingThumbnailColumn =
        error?.parent?.code === "42703" &&
        String(error?.parent?.sql || "").includes('"thumbnail"');
      if (!isMissingThumbnailColumn) throw error;

      work = await OurWork.create({
        title,
        subtitle,
        type,
        mediaContent,
        order: order || 0,
        isVisible: isVisible !== undefined ? isVisible : true,
      });
    }

    return NextResponse.json(work, { status: 201 });
  } catch (error) {
    console.error("Error creating our work entry:", error);
    return NextResponse.json(
      { error: "Failed to create our work entry" },
      { status: 500 },
    );
  }
}
