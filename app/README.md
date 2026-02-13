# Go Flow — Frontend

Next.js 15 frontend application for the Go Flow nonlinear narrative platform.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t goflow-frontend .
docker run -p 3000:3000 goflow-frontend
```

## Tech Stack

- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Socket.IO (real-time collaboration)
- React Flow (canvas rendering)
