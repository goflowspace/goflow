# Go Flow

Open-source platform for nonlinear narratives — interactive stories, branching dialogues, visual novels.

## Architecture

Monorepo with two packages:

- `app/` — Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, Socket.IO
- `backend/` — Backend: Express, TypeScript, Prisma ORM, MongoDB 7.0

## Code Review Guidelines

When reviewing PRs, check for:

- Security: input validation, authentication/authorization, no hardcoded secrets, XSS/injection prevention
- TypeScript: proper typing, no unnecessary `any`
- Prisma: correct schema usage, efficient queries, proper error handling
- React: no missing dependencies in hooks, proper key usage in lists, no unnecessary re-renders
- API: consistent REST conventions, proper HTTP status codes, error responses
- Tests: new features should include tests

## Commands

- Frontend dev: `cd app && npm run dev`
- Backend dev: `cd backend && npm run dev`
- Frontend tests: `cd app && npm test`
- Backend tests: `cd backend && npm test`
- Lint: `cd app && npm run lint`
