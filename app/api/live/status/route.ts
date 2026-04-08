import { NextResponse } from 'next/server';
import { getSafeLiveStatus } from '@/lib/liveStatus';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getSafeLiveStatus();

  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
