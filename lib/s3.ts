import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  }
})

export const BUCKET = process.env.S3_BUCKET || ""

export type FileItem = {
  key: string
  name: string
  size?: number
  lastModified?: string
  type: "podcast" | "pdf"
}

export async function listByPrefix(prefix: string) {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix })
  const res = await s3.send(cmd)
  const items = (res.Contents || [])
    .filter(o => (o.Key || "").endsWith(".mp3") || (o.Key || "").endsWith(".m4a") || (o.Key || "").endsWith(".pdf"))
    .map(o => ({
      key: o.Key!,
      name: o.Key!.split("/").pop()!,
      size: o.Size,
      lastModified: o.LastModified?.toISOString()
    }))
  return items
}

export async function presignGet(key: string, expiresSeconds = 3600) {
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: expiresSeconds })
  return url
}

export async function uploadBuffer(key: string, buf: Buffer, contentType?: string) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType })
  await s3.send(cmd)
  return key
}