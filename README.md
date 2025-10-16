# A Next.js / Typescript app for podcasts & PDF member files integrated with AWS S3.

## Features
- Protected sign-in with a shared member code and a separate admin code
- Podcast (MP3/M4A) and PDF listing from S3-compatible storage
- Preview/playback via presigned URLs · file download
- Upload page for the teacher (admin)
- Modern UI with Tailwind CSS
- Ready to deploy on Vercel

## Environment
Create a `.env.local` with:
```
# Iron Session
IRON_SESSION_PASSWORD=change_me_to_at_least_32_characters
IRON_SESSION_COOKIE_NAME=choir_session

# Access codes
SHARED_CODE=members_code
ADMIN_CODE=admin_code

# S3 / R2 / Backblaze etc.
S3_ENDPOINT=https://<endpoint>
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=byzantine-choir
S3_FORCE_PATH_STYLE=1               # optional
```

## Setup
```
pnpm i    # or npm i / yarn
pnpm dev  # http://localhost:3000
```