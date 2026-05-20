/**
 * Better-Auth API handler for Astro.
 *
 * All requests to /api/auth/* are forwarded to the better-auth handler.
 * This coexists with the legacy auth-astro handler at /api/[...auth] until
 * the migration to better-auth is complete.
 *
 * @see https://www.better-auth.com/docs/installation#mount-handler
 */
import { auth } from "@/auth";
import type { APIRoute } from "astro";

export const prerender = false;

export const ALL: APIRoute = ({ request }) => {
    return auth.handler(request);
};
