# MyClaSSes Teacher Portal

This project includes the React + TypeScript teacher portal and its own
Express/Prisma API. The portal backend connects to the existing MyClaSSes
PostgreSQL database directly; it does not modify or require the
`video-call-app` backend source.

## Requirements

- Node.js 20.19 or newer and npm.
- PostgreSQL containing the MyClaSSes tables, plus `server/.env` with
  `DATABASE_URL` and `JWT_SECRET`.

## Local development

Create `server/.env` with the database connection string and a long random JWT
secret, then install the frontend and API dependencies:

```powershell
Set-Location C:\Users\Joshua\Documents\teacher-portal
npm ci
npm ci --prefix server
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

This starts the portal's Express API on port `5001` and Vite on port `5173`.
Vite forwards API requests to the portal API. In production, the Express API
serves the frontend and API together on port `5001` by default.

Teacher passwords are verified against the existing users table. Only verified
teacher accounts can sign in; administrator and student accounts are rejected.

Sign in using an administrator-created teacher account. The portal rejects
admin and student accounts, including when restoring a saved session. Teachers
can view their assigned sections and schedules, create rooms for the next
scheduled meeting of a subject, publish announcements and assignments from
the Classroom page, copy room meeting details, and delete rooms they created.
Room availability uses the subject's scheduled day and time; create a new
room for each later meeting.
Classroom posts are associated with the selected subject and stored in
PostgreSQL. Students can view announcements and assignments in that subject's
Stream and Classwork tabs in the mobile app.

## Production build and start

```powershell
Set-Location C:\Users\Joshua\Documents\teacher-portal
npm ci
npm ci --prefix server
npm run prisma:generate
npm run prisma:deploy
npm run build
npm start
```

The Express API serves the generated `dist/` site and API together on port
`5001` (or the configured `PORT`). `prisma:deploy` applies the portal's
classroom-post migration to the configured PostgreSQL database.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express API and Vite development server |
| `npm run build` | Type-check and build the frontend and API |
| `npm start` | Serve the production frontend and API |
| `npm run typecheck` | Type-check the frontend and API |
| `npm run prisma:generate` | Generate the portal Prisma Client |
| `npm run prisma:deploy` | Apply portal migrations |

The frontend dependencies are installed in the project-root `node_modules`;
the API dependencies are installed separately in `server/node_modules`.
Install each package with its own lockfile (`npm ci` at the root and
`npm ci --prefix server` for the API).
