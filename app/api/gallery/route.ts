import { NextResponse } from "next/server";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;
const FOLDER = process.env.CLOUDINARY_GALLERY_FOLDER || "gallery";

// Cloudinary Search API (server-side)
export async function GET() {
  try {
    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
    const query = new URLSearchParams({
      expression: `folder:${FOLDER}`,
      max_results: "200",
      // next_cursor: ""  // TODO: pagination later
    });

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expression: `folder:${FOLDER}` }),
        // σημ.: το search API θέλει JSON body, όχι querystring
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || "Cloudinary error" }, { status: 500 });
    }

    const data = await res.json();

    const items = (data.resources || []).map((r: any) => {
      const isVideo = r.resource_type === "video" || r.format === "mp4" || r.type === "video";
      // Full-size
      const src = `https://res.cloudinary.com/${CLOUD_NAME}/${isVideo ? "video" : "image"}/upload/${r.public_id}.${r.format}`;
      // Thumbnail (auto format/quality, width=480, crop=fill for ομοιόμορφα thumbs)
      const thumb = `https://res.cloudinary.com/${CLOUD_NAME}/${isVideo ? "video" : "image"}/upload/f_auto,q_auto,w_480,c_fill/${r.public_id}.${r.format}`;

      return {
        id: r.public_id,
        type: isVideo ? "video" : "image",
        src,
        thumb,
        width: r.width,
        height: r.height,
        format: r.format,
        duration: r.duration || null,
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("GALLERY_API_ERROR:", err);
    return NextResponse.json({ error: "Failed to list gallery" }, { status: 500 });
  }
}
