import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { db } from "@repo/db";
import { logger } from "@repo/logger";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // In development, log the magic link
        if (process.env.NODE_ENV === "development") {
          logger.info(`Magic link for ${email}: ${url}`);
          return;
        }
        // In production, implement email sending
        // Example implementation with Resend (would need to install @resend/node):
        /*
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'noreply@yourapp.com',
          to: [email],
          subject: 'Your magic link',
          html: `<p>Click <a href="${url}">here</a> to sign in.</p>`
        });
        */
        // Alternative with SendGrid:
        /*
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
          to: email,
          from: 'noreply@yourapp.com',
          subject: 'Your magic link',
          html: `<p>Click <a href="${url}">here</a> to sign in.</p>`
        });
        */
        logger.info(`Sending magic link to ${email}`);
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
