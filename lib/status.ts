import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { BUCKET, s3 } from "@/lib/s3";
import { listEvents } from "@/lib/gcal";

export type ServiceStatus = {
  key: string;
  name: string;
  group: "Platform" | "Infrastructure" | "Integrations";
  ok: boolean;
  message: string;
};

export type SystemStatus = {
  checkedAt: string;
  healthy: boolean;
  services: ServiceStatus[];
};

async function checkStorage(): Promise<ServiceStatus> {
  if (!BUCKET) {
    return {
      key: "storage",
      name: "Storage (S3)",
      group: "Infrastructure",
      ok: false,
      message: "Missing S3 bucket configuration",
    };
  }
  try {
    await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1 }));
    return { key: "storage", name: "Storage (S3)", group: "Infrastructure", ok: true, message: "Connected" };
  } catch (err: any) {
    return {
      key: "storage",
      name: "Storage (S3)",
      group: "Infrastructure",
      ok: false,
      message: err?.message || "Storage unavailable",
    };
  }
}

async function checkCalendar(): Promise<ServiceStatus> {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 60_000);
    await listEvents(now.toISOString(), soon.toISOString());
    return { key: "calendar", name: "Google Calendar", group: "Integrations", ok: true, message: "Connected" };
  } catch (err: any) {
    return {
      key: "calendar",
      name: "Google Calendar",
      group: "Integrations",
      ok: false,
      message: err?.message || "Calendar unavailable",
    };
  }
}

async function checkGallery(): Promise<ServiceStatus> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  if (!cloudName || !apiKey || !apiSecret) {
    return {
      key: "gallery",
      name: "Gallery (Cloudinary)",
      group: "Integrations",
      ok: false,
      message: "Missing Cloudinary configuration",
    };
  }

  try {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    await new Promise((resolve, reject) => {
      cloudinary.api.ping((err: unknown, result: unknown) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    return { key: "gallery", name: "Gallery (Cloudinary)", group: "Integrations", ok: true, message: "Connected" };
  } catch (err: any) {
    return {
      key: "gallery",
      name: "Gallery (Cloudinary)",
      group: "Integrations",
      ok: false,
      message: err?.message || "Gallery unavailable",
    };
  }
}

function checkGoogleAuth(): ServiceStatus {
  const hasServer = Boolean(process.env.GOOGLE_CLIENT_ID);
  const hasClient = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const ok = hasServer && hasClient;
  return {
    key: "auth",
    name: "Google Sign-In",
    group: "Platform",
    ok,
    message: ok ? "Configured" : "Missing Google auth configuration",
  };
}

function checkSessions(): ServiceStatus {
  const ok = Boolean(process.env.IRON_SESSION_PASSWORD && process.env.IRON_SESSION_COOKIE_NAME);
  return {
    key: "sessions",
    name: "Member Sessions",
    group: "Platform",
    ok,
    message: ok ? "Configured" : "Missing session configuration",
  };
}

function checkSentry(): ServiceStatus {
  const ok = Boolean(process.env.SENTRY_DSN);
  return {
    key: "sentry",
    name: "Sentry Monitoring",
    group: "Infrastructure",
    ok,
    message: ok ? "Enabled" : "Sentry DSN not configured",
  };
}

function checkApp(): ServiceStatus {
  return {
    key: "app",
    name: "Web Application",
    group: "Platform",
    ok: true,
    message: "Running",
  };
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const services = await Promise.all([
    Promise.resolve(checkApp()),
    Promise.resolve(checkGoogleAuth()),
    Promise.resolve(checkSessions()),
    Promise.resolve(checkSentry()),
    checkStorage(),
    checkCalendar(),
    checkGallery(),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    healthy: services.every((s) => s.ok),
    services,
  };
}
