import { NextResponse } from "next/server";
import OurWork from "@/lib/db/models/ourwork";

const findWorkByIdSafe = async (id) => {
  try {
    return await OurWork.findByPk(id);
  } catch (error) {
    const isMissingThumbnailColumn =
      error?.parent?.code === "42703" &&
      String(error?.parent?.sql || "").includes('"thumbnail"');
    if (!isMissingThumbnailColumn) throw error;
    return await OurWork.findOne({
      where: { id },
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
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, subtitle, type, mediaContent, thumbnail, order, isVisible } = body;

    const work = await findWorkByIdSafe(id);

    if (!work) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    try {
      await work.update({
        title: title !== undefined ? title : work.title,
        subtitle: subtitle !== undefined ? subtitle : work.subtitle,
        type: type !== undefined ? type : work.type,
        mediaContent:
          mediaContent !== undefined ? mediaContent : work.mediaContent,
        thumbnail: thumbnail !== undefined ? (thumbnail || null) : work.thumbnail,
        order: order !== undefined ? order : work.order,
        isVisible: isVisible !== undefined ? isVisible : work.isVisible,
      });
    } catch (error) {
      const isMissingThumbnailColumn =
        error?.parent?.code === "42703" &&
        String(error?.parent?.sql || "").includes('"thumbnail"');
      if (!isMissingThumbnailColumn) throw error;

      await work.update({
        title: title !== undefined ? title : work.title,
        subtitle: subtitle !== undefined ? subtitle : work.subtitle,
        type: type !== undefined ? type : work.type,
        mediaContent:
          mediaContent !== undefined ? mediaContent : work.mediaContent,
        order: order !== undefined ? order : work.order,
        isVisible: isVisible !== undefined ? isVisible : work.isVisible,
      });
    }

    return NextResponse.json(work);
  } catch (error) {
    console.error("Error updating our work entry:", error);
    return NextResponse.json(
      { error: "Failed to update our work entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const work = await findWorkByIdSafe(id);

    if (!work) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await work.destroy();

    return NextResponse.json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting our work entry:", error);
    return NextResponse.json(
      { error: "Failed to delete our work entry" },
      { status: 500 },
    );
  }
}
