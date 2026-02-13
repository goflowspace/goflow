# Go Flow

Open-source platform for creating nonlinear narratives — interactive stories, branching dialogues, visual novels, and more. Design complex story structures on an infinite canvas with real-time collaboration.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

### Run

```bash
git clone https://github.com/goflowspace/goflow.git
cd goflow
./start.sh
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

On first run, a default user is created automatically. Check the backend logs for credentials:

```bash
docker compose logs backend
```

### Stop

```bash
./stop.sh
```

## Configuration

Copy the example config and customize as needed:

```bash
cp .env.example .env
```

Key settings in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `mongodb://mongodb:27017/goflow?replicaSet=rs0&directConnection=true` | MongoDB connection string |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL (for CORS) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |
| `OSS_USER_PASSWORD` | auto-generated | Initial user password |
| `OPENAI_API_KEY` | — | Optional: enables AI features (OpenAI) |
| `ANTHROPIC_API_KEY` | — | Optional: enables AI features (Anthropic) |

## Architecture

```
goflow/
├── app/          # Frontend — Next.js 15, React 19, TypeScript
├── backend/      # Backend — Express, TypeScript, Prisma, MongoDB
├── docker-compose.yml
├── start.sh
└── stop.sh
```

### Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Zustand, Socket.IO
- **Backend:** Express, TypeScript, Prisma ORM, MongoDB 7.0
- **Real-time:** WebSocket (Socket.IO)
- **Infrastructure:** Docker Compose

## Development

### Local development (without Docker)

**Backend:**

```bash
cd backend
npm install
cp .env.example .env.development  # configure DATABASE_URL
npm run dev
```

**Frontend:**

```bash
cd app
npm install
npm run dev
```

### Project structure

The repository is a monorepo with two main packages:

- `app/` — Next.js frontend application
- `backend/` — Express API server

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This means you can freely use, modify, and distribute this software, but if you run a modified version on a server and let others interact with it, you must make the source code of your modified version available to them.
