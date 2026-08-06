import { NextRequest, NextResponse } from "next/server";
import { getSurveyRouteById } from "@/lib/actions";
import { buildMapPNG, buildDocx } from "@/lib/report-doc";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const route = await getSurveyRouteById(Number(id));
    if (!route) {
      return NextResponse.json({ error: "Survey not found", id: Number(id) }, { status: 404 });
    }

    const waypoints = route.waypoints || [];
    const photos = route.photos || [];
    let mapB64 = "";
    try {
      mapB64 = await buildMapPNG(waypoints, photos);
    } catch (mapErr: any) {
      console.error("MAP BUILD ERROR:", mapErr?.message);
    }
    const docx = await buildDocx(route, mapB64);
    const safeName = (route.storeName || "survey").replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(new Uint8Array(docx), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Laporan_Survey_${safeName}.docx"`,
      },
    });
  } catch (e: any) {
    console.error("REPORT ERROR:", e?.message, e?.stack?.split("\n").slice(0, 5).join("\n"));
    return NextResponse.json({ error: e?.message || "Unknown error", stack: e?.stack?.split("\n").slice(0, 3).join("\n") }, { status: 500 });
  }
}