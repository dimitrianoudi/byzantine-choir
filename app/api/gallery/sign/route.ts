export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getSession } from '@/lib/session';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  const session = await getSession();
  if (!session.isLoggedIn || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_GALLERY_FOLDER || 'gallery';

  if (!process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: 'Missing CLOUDINARY_API_SECRET' },
      { status: 500 }
    );
  }

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
}
