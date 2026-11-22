import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Εκδόσεις Ψαλτικής Παιδείας";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function imageData(relativePath: string) {
  const buffer = await readFile(
    path.join(process.cwd(), "public", relativePath),
  );
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export default async function PublicationsOpenGraphImage() {
  const [logo, cover1, cover2, cover3, cover4] = await Promise.all([
    readFile(
      path.join(
        process.cwd(),
        "public",
        "logo_frontistirio_psaltikis.png",
      ),
    ).then(
      (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
    ),
    imageData("ekdoseis/images/b01/cover.jpg"),
    imageData("ekdoseis/images/b11/cover.jpg"),
    imageData("ekdoseis/images/b12/cover.jpg"),
    imageData("ekdoseis/images/b20/cover.jpg"),
  ]);

  const covers = [cover1, cover2, cover3, cover4];

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
            width: 470,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 54px",
            backgroundColor: "#5a1e2e",
            borderRight: "10px solid #b8893a",
          }}
        >
          <img
            src={logo}
            alt=""
            width={370}
            height={105}
            style={{
              width: 370,
              height: 105,
              objectFit: "contain",
            }}
          />
          <div
            style={{
              display: "flex",
              width: 180,
              height: 5,
              marginTop: 42,
              borderRadius: 99,
              backgroundColor: "#b8893a",
            }}
          />
          <div
            style={{
              display: "flex",
              width: 260,
              height: 5,
              marginTop: 15,
              borderRadius: 99,
              backgroundColor: "rgba(255,255,255,0.55)",
            }}
          />
          <div
            style={{
              display: "flex",
              width: 220,
              height: 5,
              marginTop: 15,
              borderRadius: 99,
              backgroundColor: "rgba(255,255,255,0.35)",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
            padding: "50px 42px",
            backgroundColor: "#f6f1e7",
            backgroundImage:
              "radial-gradient(circle at 85% 10%, rgba(184,137,58,.22), transparent 42%)",
          }}
        >
          {covers.map((cover, index) => (
            <img
              key={index}
              src={cover}
              alt=""
              width={190}
              height={266}
              style={{
                width: 170,
                height: 238,
                objectFit: "cover",
                borderRadius: 10,
                border: "2px solid #e7ddc8",
                boxShadow: "0 18px 35px rgba(67,45,26,.22)",
                transform: `translateY(${index % 2 === 0 ? -34 : 34}px) rotate(${
                  index === 0 ? -4 : index === 3 ? 4 : 0
                }deg)`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}

