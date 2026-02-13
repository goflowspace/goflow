# Go Flow — Backend

Express API server for the Go Flow nonlinear narrative platform.

## Development

```bash
npm install
cp .env.example .env.development  # configure DATABASE_URL
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t goflow-backend .
docker run -p 8080:8080 goflow-backend
```

## Tech Stack

- Express with TypeScript
- Prisma ORM (MongoDB)
- Socket.IO (real-time collaboration)
- JWT authentication
- Winston (logging)
- Zod (validation)
