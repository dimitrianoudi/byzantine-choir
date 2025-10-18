import { NextResponse } from "next/server"

export async function POST() {

  return NextResponse.json(
    { error: "Password login disabled" },
    { status: 410 }
  );
}