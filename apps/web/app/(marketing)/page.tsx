import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const features = [
  {
    title: "Authentication",
    description:
      "Magic link and Google OAuth powered by BetterAuth with Prisma adapter.",
  },
  {
    title: "Payments",
    description:
      "Subscription billing with Polar.sh webhooks and automatic status sync.",
  },
  {
    title: "Database",
    description:
      "PostgreSQL with Prisma ORM, singleton client, and type-safe queries.",
  },
  {
    title: "Monorepo",
    description:
      "Turborepo-powered workspace with shared packages and fast builds.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Ship your SaaS faster
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Production-ready boilerplate with authentication, payments, and
            everything you need to launch your next SaaS product.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/login">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
