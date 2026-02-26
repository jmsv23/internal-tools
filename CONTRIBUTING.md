# Contributing to SaaS Boilerplate

First off, thank you for considering contributing to this project! Every contribution helps make this template better for everyone.

## Code of Conduct

By participating in this project, you agree to maintain a welcoming and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Environment details** (OS, Node.js version, pnpm version)
- **Screenshots** if applicable

### Suggesting Features

Feature requests are welcome! Please provide:

- **Clear description** of the feature
- **Use case** explaining why this would be useful
- **Possible implementation** if you have ideas

### Pull Requests

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following our coding standards
5. **Test** your changes thoroughly
6. **Commit** with clear, descriptive messages
7. **Push** to your fork
8. **Open a Pull Request** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/saas-boilerplate.git
cd saas-boilerplate

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Start database
docker compose -f docker/docker-compose.yml up -d

# Push schema
pnpm db:push

# Start dev server
pnpm dev
```

## Coding Standards

### TypeScript

- Use strict TypeScript - avoid `any` types
- Prefer interfaces over type aliases for object shapes
- Export types that are part of the public API

### React

- Use functional components with hooks
- Prefer Server Components where possible (Next.js App Router)
- Keep components small and focused

### Styling

- Use Tailwind CSS utility classes
- Follow the shadcn/ui component patterns
- Maintain dark mode compatibility

### Git Commits

Write clear, concise commit messages:

```
feat: add user profile page
fix: resolve auth redirect loop
docs: update README with deployment instructions
refactor: simplify database client initialization
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Project Structure Guidelines

- **apps/web** - Next.js application code only
- **packages/db** - Database schema and client
- **packages/logger** - Logging utilities
- **packages/config** - Shared configurations

When adding new functionality:

1. Consider if it belongs in a shared package
2. Keep the web app focused on UI and routing
3. Business logic should be in appropriate packages

## Testing

Before submitting a PR:

```bash
# Run type checking
pnpm turbo run typecheck

# Run linting
pnpm lint

# Test build
pnpm build
```

## Questions?

Feel free to open a [Discussion](https://github.com/yourusername/saas-boilerplate/discussions) for any questions about contributing.

Thank you for helping improve this project!
