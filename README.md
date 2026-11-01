# MyClaSSes Teacher Portal

The MyClaSSes Teacher Portal is a web workspace for teachers. It combines a
React frontend with an Express API and Prisma access to the existing MyClaSSes
PostgreSQL database.

Teachers can review their assigned sections and subject schedules, schedule
online meeting rooms, and publish announcements or assignments with optional
attachments. The portal uses the existing teacher accounts and course data; it
does not create or manage student, administrator, enrollment, or admission
workflows.

## Features

- **Teacher sign-in:** Uses the existing user records. Only verified teacher
  accounts can sign in. Admin and student accounts are rejected.
- **Overview and sections:** Shows assigned sections, their subjects, and
  schedules.
- **Classroom:** Publishes announcements and assignments to subjects in a
  teacher's assigned sections. Assignments may include a due date. Posts may
  include up to five attachments.
- **Meeting rooms:** Creates a room for the next scheduled meeting of an
  assigned subject. Teachers can copy its meeting ID and passcode or delete a
  room they own.
- **Temporary password changes:** A teacher account marked as requiring a
  password change must set a new password before using the workspace.

## Technology

- React 19, TypeScript, and Vite
- Express 4 and Node.js
- Prisma ORM and PostgreSQL

## Requirements

- Node.js **20.19 or newer** and npm
- Access to a PostgreSQL database containing the existing MyClaSSes tables
  used by this portal (including users, course sections, and subjects)
- A verified teacher account created through the existing MyClaSSes account
  workflow

Install dependencies separately for the frontend and API. The project root and
`server/` each have their own package manifest and lockfile.

## Configuration

The API reads its database connection configuration from `server/.env` or a
repository-root `.env` file. If both files contain the same variable,
`server/.env` takes precedence. Configure the required database connection
locally, and keep environment files out of version control.

## Local development

From the repository root, install both dependency sets, generate the Prisma
client, and apply pending portal migrations:

```powershell
Set-Location C:\Users\Joshua\Documents\teacher-portal
npm ci
npm ci --prefix server
npm run prisma:generate
npm run prisma:deploy
```

Start the API and frontend together:

```powershell
npm run dev
```

Vite starts the frontend and proxies `/api` and `/health` requests to the
Express API. Both processes run in the same terminal; stop them with
**Ctrl+C**.

## Database and migrations

The Prisma schema maps to the existing MyClaSSes tables. This repository's
migrations add the portal's classroom-post and classroom-attachment tables;
they are not a replacement for the existing application schema. Configure the
portal to use the intended MyClaSSes database before running migrations.

`npm run prisma:deploy` applies pending migrations from
`server/prisma/migrations/`. It is intended for deployment and does not reset
the database. **Do not run a database reset against a shared or production
MyClaSSes database.**

The portal's classroom attachment records are stored in PostgreSQL, while the
uploaded file contents are stored on the API server's local filesystem under
`uploads/classroom-posts/` (relative to the API process working directory).
Back up this directory along with the database, and use persistent storage in
production. If the API runs on multiple instances, configure shared storage or
another shared file-storage solution so every instance can serve uploaded
attachments.

## Production build and start

Build and start the application from the repository root:

```powershell
Set-Location C:\Users\Joshua\Documents\teacher-portal
npm ci
npm ci --prefix server
npm run prisma:generate
npm run prisma:deploy
npm run build
npm start
```

The build type-checks and compiles the API, then creates the frontend in
`dist/`. The Express server serves both the API and the built frontend. Put the
server behind HTTPS in production and ensure the attachment directory is
writable and persistent.

### Sign-in and access

Sign in with the email and password for a verified teacher account. The API
checks the account's role and email-verification status before allowing access
to teachers. If an account has a temporary password, the portal requires a new
password of at least 12 characters before workspace features become available.

If no teacher account is available, ask a MyClaSSes administrator to create or
assign one; this portal does not provide account registration.

### Sections and schedules

The sections view is read-only and lists sections assigned to the signed-in
teacher. Section assignment and subject schedule changes are managed through
the existing MyClaSSes administration workflows.

### Classroom posts

Select an assigned subject to publish an announcement or assignment. Titles
are limited to 120 characters and post content to 5,000 characters.
Assignments can include a due date. Up to five files can be attached to a
post, with a maximum size of 10 MB per file. Supported formats are JPEG, PNG,
WebP, PDF, plain text, DOCX, and PPTX.

### Meeting rooms

Select an assigned subject to create a room for its next scheduled class
meeting. Each new meeting requires a new room. The room list only includes
upcoming rooms owned by the signed-in teacher. Share the generated meeting ID
and passcode with students through the appropriate class channel.

## API overview

All API responses use JSON except successful attachment downloads.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | API health check. |
| `POST` | `/api/auth/login` | Public | Sign in with email and password. |
| `GET` | `/api/auth/me` | Teacher | Get the current teacher account. |
| `POST` | `/api/auth/change-password` | Teacher | Change a required temporary password. |
| `GET` | `/api/admissions/sections` | Teacher | List assigned sections and subjects. |
| `GET` | `/api/rooms` | Teacher | List upcoming rooms owned by the teacher. |
| `POST` | `/api/rooms` | Teacher | Schedule a room using a `subjectId`. |
| `DELETE` | `/api/rooms/:roomId` | Teacher | Delete a room owned by the teacher. |
| `GET` | `/api/classroom/posts` | Teacher | List classroom posts created by the teacher. |
| `POST` | `/api/classroom/posts` | Teacher | Create an announcement or assignment; multipart form data supports `attachments`. |
| `GET` | `/api/classroom/attachments/:attachmentId` | Teacher | Download an attachment belonging to the teacher's post. |

Successful JSON endpoints return a `{ "success": true, "data": ... }` envelope.
Errors return `{ "success": false, "message": "..." }`. Login accepts a JSON
body with `email` and `password`; room creation accepts a JSON body with
`subjectId`. Classroom post creation uses `multipart/form-data` with these
fields:

| Field | Required | Notes |
| --- | --- | --- |
| `subjectId` | Yes | ID of a subject in a section assigned to the teacher. |
| `type` | Yes | `ANNOUNCEMENT` or `ASSIGNMENT`. |
| `title` | Yes | 1–120 characters. |
| `content` | Yes | 1–5,000 characters. |
| `dueAt` | No | ISO date-time string; used for assignments. |
| `attachments` | No | Repeat this field for each file; maximum five files, 10 MB each. |

Login is rate-limited to 10 attempts per 15-minute window. API request bodies
are validated, and protected actions are scoped to subjects and rooms owned by
or assigned to the authenticated teacher.

## Commands

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and Vite development server. |
| `npm run build` | Type-check and build the frontend and API. |
| `npm start` | Start the production API and serve `dist/`. |
| `npm run typecheck` | Type-check the frontend and API without building. |
| `npm run prisma:generate` | Generate the Prisma Client from the server schema. |
| `npm run prisma:deploy` | Apply pending Prisma migrations to the configured database. |

For API-only development, run `npm --prefix server run dev`. Frontend
dependencies are installed in the root `node_modules`; API dependencies are
installed in `server/node_modules`.

## Troubleshooting

- **Missing environment variable:** Confirm the database connection
  configuration is set in `server/.env` or the repository-root `.env`.
- **Database connection or Prisma errors:** Verify the connection string,
  database availability, and access to the existing MyClaSSes tables. Run
  `npm run prisma:generate` after dependency installation and
  `npm run prisma:deploy` to apply pending portal migrations.
- **Cannot sign in:** Confirm that the account is a teacher, its email is
  verified, and its password is correct. Ask an administrator to set up or
  verify the account if needed.
- **No sections or subjects appear:** Ask an administrator to assign the
  teacher account to a section and configure its subjects and schedules.
- **Attachment downloads fail after deployment:** Check that the attachment
  files exist in the API's persistent `uploads/classroom-posts/` directory
  and that the API process can read them.
