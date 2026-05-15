# AR Farmhouse

Premium private family property platform — feed, calendar, album, property hub, map, tasks, and family activity.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill Firebase + site URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run firebase:deploy` | Deploy Firestore rules, indexes, Storage rules |

## Documentation

- [Deployment](./docs/DEPLOYMENT.md)
- [Environment variables](./docs/ENVIRONMENT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Future roadmap](./docs/ROADMAP.md)

## Stack

Next.js 16 · React 19 · Firebase · Tailwind · Vercel
