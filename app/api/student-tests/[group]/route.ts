export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GetObjectCommand, ListObjectsV2Command, type _Object } from "@aws-sdk/client-s3";
import { BUCKET, presignGet, s3 } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  canAccessStudentTest,
  getStudentTestGroup,
  isStudentTestGroup,
  isStudentTestsAdmin,
  studentTestBasePrefix,
  studentMatchesEmail,
  type StudentTestGroup,
} from "@/lib/studentTests";

type StudentAsset = {
  key: string;
  url: string;
  lastModified: string | null;
};

type StudentVocalRange = {
  range: string;
  lowHz: number | null;
  highHz: number | null;
  detectedAt: string | null;
};

type StudentTeacherNote = {
  text: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

type ListedObject = {
  key: string;
  lastModified: Date | null;
};

function toListedObject(obj: _Object): ListedObject | null {
  if (!obj.Key || obj.Key.endsWith("/")) return null;
  return {
    key: obj.Key,
    lastModified: obj.LastModified ?? null,
  };
}

async function listAllObjects(prefix: string) {
  const objects: ListedObject[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents ?? []) {
      const listed = toListedObject(obj);
      if (listed) objects.push(listed);
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

function latestUnder(objects: ListedObject[], prefix: string) {
  return objects
    .filter((obj) => obj.key.startsWith(prefix))
    .sort((a, b) => {
      const byDate = (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0);
      if (byDate !== 0) return byDate;
      return b.key.localeCompare(a.key);
    })[0] ?? null;
}

async function toSignedAsset(obj: ListedObject | null): Promise<StudentAsset | null> {
  if (!obj) return null;
  return {
    key: obj.key,
    url: await presignGet(obj.key, 60 * 60),
    lastModified: obj.lastModified?.toISOString() ?? null,
  };
}

async function streamToString(body: any) {
  if (!body) return "";
  if (typeof body.transformToString === "function") return body.transformToString();

  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readVocalRange(key: string): Promise<StudentVocalRange | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await streamToString(res.Body);
    const json = JSON.parse(text) as Record<string, unknown>;
    const range = typeof json.range === "string" ? json.range : "";
    if (!range) return null;

    return {
      range,
      lowHz: Number.isFinite(Number(json.lowHz)) ? Number(json.lowHz) : null,
      highHz: Number.isFinite(Number(json.highHz)) ? Number(json.highHz) : null,
      detectedAt: typeof json.detectedAt === "string" ? json.detectedAt : null,
    };
  } catch {
    return null;
  }
}

async function readTeacherNote(key: string): Promise<StudentTeacherNote | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await streamToString(res.Body);
    const json = JSON.parse(text) as Record<string, unknown>;
    const noteText = typeof json.text === "string" ? json.text : "";
    if (!noteText.trim()) return null;

    return {
      text: noteText,
      updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : null,
      updatedBy: typeof json.updatedBy === "string" ? json.updatedBy : null,
    };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ group: string }> }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { group: rawGroup } = await params;
  if (!isStudentTestGroup(rawGroup)) {
    return NextResponse.json({ error: "Invalid group" }, { status: 404 });
  }

  const group = rawGroup as StudentTestGroup;
  const config = getStudentTestGroup(group);
  const role = session.user?.role ?? "member";
  const isAdmin = isStudentTestsAdmin(role, session.user?.email);
  const requestedStudentId = new URL(req.url).searchParams.get("studentId") || "";
  const visibleStudents = config.students.filter((student) => {
    if (requestedStudentId && student.id !== requestedStudentId) return false;
    if (isAdmin) return true;
    return studentMatchesEmail(student, session.user?.email);
  });

  if (requestedStudentId && !canAccessStudentTest(role, session.user?.email, group, requestedStudentId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!isAdmin && visibleStudents.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const base = studentTestBasePrefix(group);
  const objects = await listAllObjects(`${base}/`);
  const completedKeys = new Set(
    objects
      .filter((obj) => obj.key.startsWith(`${base}/completed/`) && obj.key.endsWith(".json"))
      .map((obj) => obj.key)
  );
  const rangeKeys = new Set(
    objects
      .filter((obj) => obj.key.startsWith(`${base}/ranges/`) && obj.key.endsWith(".json"))
      .map((obj) => obj.key)
  );
  const noteKeys = new Set(
    objects
      .filter((obj) => obj.key.startsWith(`${base}/notes/`) && obj.key.endsWith(".json"))
      .map((obj) => obj.key)
  );

  const score = await toSignedAsset(latestUnder(objects, `${base}/score/`));
  const students = await Promise.all(
    visibleStudents.map(async (student) => {
      const sample = await toSignedAsset(latestUnder(objects, `${base}/students/${student.id}/sample/`));
      const feedback = await toSignedAsset(latestUnder(objects, `${base}/students/${student.id}/feedback/`));
      const rangeKey = `${base}/ranges/${student.id}.json`;
      const vocalRange = rangeKeys.has(rangeKey) ? await readVocalRange(rangeKey) : null;
      const noteKey = `${base}/notes/${student.id}.json`;
      const teacherNote = noteKeys.has(noteKey) ? await readTeacherNote(noteKey) : null;

      return {
        id: student.id,
        name: student.name,
        sample,
        feedback,
        teacherNote,
        vocalRange,
        completed: completedKeys.has(`${base}/completed/${student.id}.json`),
      };
    })
  );

  return NextResponse.json({
    group,
    label: config.label,
    courseLabel: config.courseLabel,
    role: isAdmin ? "admin" : "member",
    score,
    students,
  });
}
