export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ListObjectsV2Command, type _Object } from "@aws-sdk/client-s3";
import { BUCKET, presignGet, s3 } from "@/lib/s3";
import { getSession } from "@/lib/session";
import {
  getStudentTestGroup,
  isStudentTestGroup,
  studentTestBasePrefix,
  type StudentTestGroup,
} from "@/lib/studentTests";

type StudentAsset = {
  key: string;
  url: string;
  lastModified: string | null;
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

export async function GET(
  _req: Request,
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
  const base = studentTestBasePrefix(group);
  const objects = await listAllObjects(`${base}/`);
  const completedKeys = new Set(
    objects
      .filter((obj) => obj.key.startsWith(`${base}/completed/`) && obj.key.endsWith(".json"))
      .map((obj) => obj.key)
  );

  const score = await toSignedAsset(latestUnder(objects, `${base}/score/`));
  const students = await Promise.all(
    config.students.map(async (student) => {
      const sample = await toSignedAsset(latestUnder(objects, `${base}/students/${student.id}/sample/`));
      const feedback = await toSignedAsset(latestUnder(objects, `${base}/students/${student.id}/feedback/`));

      return {
        ...student,
        sample,
        feedback,
        completed: completedKeys.has(`${base}/completed/${student.id}.json`),
      };
    })
  );

  return NextResponse.json({
    group,
    label: config.label,
    courseLabel: config.courseLabel,
    role: session.user?.role ?? "member",
    score,
    students,
  });
}
