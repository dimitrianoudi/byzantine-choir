import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getPublicationBySlug } from "@/lib/publications";

export const runtime = "nodejs";
export const alt = "Έκδοση Ψαλτικής Παιδείας";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function dataUrl(buffer: Buffer, type: "jpeg" | "png") {
  return `data:image/${type};base64,${buffer.toString("base64")}`;
}

export default async function PublicationOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publication = getPublicationBySlug(slug);
  if (!publication) {
    throw new Error(`Publication not found: ${slug}`);
  }

  const coverPath = publication.images.cover!.replace(/^\/+/, "");
  const [coverBuffer, logoBuffer] = await Promise.all([
    readFile(path.join(process.cwd(), "public", coverPath)),
    readFile(
      path.join(
        process.cwd(),
        "public",
        "logo_frontistirio_psaltikis.png",
      ),
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#f6f1e7",
        }}
      >
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "78px 76px",
            backgroundColor: publication.seriesColor,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 410,
              padding: "18px 20px",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,.92)",
            }}
          >
            <img
              src={dataUrl(logoBuffer, "png")}
              alt=""
              width={370}
              height={105}
              style={{
                width: 370,
                height: 105,
                objectFit: "contain",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              width: 310,
              height: 7,
              marginTop: 46,
              borderRadius: 99,
              backgroundColor: "#f3e6c4",
            }}
          />
          <div
            style={{
              display: "flex",
              width: 210,
              height: 7,
              marginTop: 17,
              borderRadius: 99,
              backgroundColor: "rgba(255,255,255,.65)",
            }}
          />
        </div>

        <div
          style={{
            width: 475,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "44px 62px",
            borderLeft: "10px solid #b8893a",
            backgroundColor: "#f6f1e7",
            backgroundImage:
              "radial-gradient(circle at 65% 15%, rgba(184,137,58,.25), transparent 45%)",
          }}
        >
          <img
            src={dataUrl(coverBuffer, "jpeg")}
            alt=""
            width={340}
            height={500}
            style={{
              width: publication.landscapeCover ? 345 : 330,
              height: publication.landscapeCover ? 250 : 480,
              objectFit: publication.landscapeCover ? "contain" : "cover",
              padding: publication.landscapeCover ? 18 : 0,
              borderRadius: 14,
              border: "2px solid #e7ddc8",
              backgroundColor: "#fff",
              boxShadow: "0 22px 42px rgba(67,45,26,.26)",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}

