import { consumeOhapiTextAllowance } from "../server/ohapiDb";

const result = await consumeOhapiTextAllowance(1, new Date("2026-08-14T12:58:00.000Z"));
console.log(JSON.stringify({ allowed: result.allowed, used: result.used, remaining: result.remaining, resetAt: result.resetAt.toISOString() }));
