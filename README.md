# SaaS Boilerplate

A production-ready SaaS starter template built with modern technologies. Ship your next SaaS product faster with authentication, payments, and a scalable monorepo architecture out of the box.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## Features

- **Authentication** - Magic link & Google OAuth via [BetterAuth](https://better-auth.com)
- **Payments** - Subscription billing with [Polar.sh](https://polar.sh) webhooks
- **Database** - PostgreSQL with [Prisma](https://prisma.io) ORM and singleton client pattern
- **Styling** - [Tailwind CSS v4](https://tailwindcss.com) with CSS-first configuration
- **UI Components** - [shadcn/ui](https://ui.shadcn.com) with Radix primitives
- **Monorepo** - [Turborepo](https://turbo.build) for fast, cached builds
- **Type Safety** - Full TypeScript across all packages
- **Logging** - Structured logging with [Winston](https://github.com/winstonjs/winston)
- **Docker Ready** - Multi-stage production builds with `turbo prune`
- **CI/CD** - GitHub Actions workflow included

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15](https://nextjs.org) (App Router, React 19) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| UI | [shadcn/ui](https://ui.shadcn.com) |
| Auth | [BetterAuth](https://better-auth.com) |
| Payments | [Polar.sh](https://polar.sh) |
| Database | [PostgreSQL](https://postgresql.org) + [Prisma](https://prisma.io) |
| Monorepo | [Turborepo](https://turbo.build) + [pnpm](https://pnpm.io) |
| Language | [TypeScript](https://typescriptlang.org) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 10+
- [Docker](https://docker.com) (for local PostgreSQL)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/saas-boilerplate.git
cd saas-boilerplate

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start PostgreSQL
docker compose -f docker/docker-compose.yml up -d

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:54326/saas?schema=public"

# BetterAuth (generate a secure secret: openssl rand -base64 32)
BETTER_AUTH_SECRET="your-secret-key-min-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Polar.sh (optional)
POLAR_ACCESS_TOKEN=""
POLAR_WEBHOOK_SECRET=""
```

## Project Structure

```
saas-boilerplate/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages
│       ├── components/         # React components
│       │   ├── auth/           # Auth components
│       │   ├── layout/         # Layout components
│       │   └── ui/             # shadcn/ui components
│       └── lib/                # Utilities & configurations
├── packages/
│   ├── config/                 # Shared configurations
│   │   ├── typescript/         # TypeScript configs
│   │   ├── tailwind/           # Tailwind theme
│   │   └── eslint/             # ESLint config
│   ├── db/                     # Prisma client & schema
│   └── logger/                 # Winston logger
├── docker/                     # Docker configurations
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.db           # Migration container
│   └── docker-compose.yml      # Local development
└── .github/
    └── workflows/              # CI/CD pipelines
```

## Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Run linting

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
```

## Authentication

This template uses [BetterAuth](https://better-auth.com) with:

- **Magic Link** - Passwordless email authentication
- **Google OAuth** - Social login (requires configuration)

In development, magic links are logged to the console. For production, integrate your email provider in `apps/web/lib/auth.ts`.

## Payments

[Polar.sh](https://polar.sh) handles subscription billing. The webhook handler at `/api/polar/webhooks` processes:

- `subscription.created` - New subscription
- `subscription.updated` - Plan changes
- `subscription.canceled` - Cancellations

## Deployment

### Docker

```bash
# Build production image
docker build -f docker/Dockerfile -t saas-web .

# Run container
docker run -p 3000:3000 --env-file .env saas-web
```

### Vercel

1. Connect your repository to [Vercel](https://vercel.com)
2. Set environment variables in project settings
3. Deploy

### Database Migrations

For production deployments, run migrations using the migration container:

```bash
docker build -f docker/Dockerfile.db -t saas-db-migrate .
docker run --env-file .env saas-db-migrate
```

## Adding shadcn/ui Components

```bash
cd apps/web
pnpm dlx shadcn@latest add [component-name]
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [Documentation](https://github.com/yourusername/saas-boilerplate/wiki)
- [Issues](https://github.com/yourusername/saas-boilerplate/issues)
- [Discussions](https://github.com/yourusername/saas-boilerplate/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with modern tools for modern SaaS</strong>
</p>

<p align="center">
  <a href="https://github.com/yourusername/saas-boilerplate">Star this repo</a> •
  <a href="https://github.com/yourusername/saas-boilerplate/issues">Report Bug</a> •
  <a href="https://github.com/yourusername/saas-boilerplate/issues">Request Feature</a>
</p>
