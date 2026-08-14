import { and, eq, isNotNull } from "drizzle-orm";
import { getUserByOpenId, getDb } from "../server/db";
import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";
import { ohapiMessages, ohapiReports, ohapiRooms } from "../drizzle/schema";

const owner = await getUserByOpenId("TgRoupcpkuPxGXXfXzkb9U");
if (!owner) throw new Error("Owner account was not found.");
const ctx: TrpcContext = {
  user: owner,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};
const caller = appRouter.createCaller(ctx);
const initial = await caller.ohapiPilot.history({ worldSlug: "sienna-vale" });
if (!initial.room) throw new Error("Expected the prior non-personal Sienna verification room.");

await caller.ohapiPilot.renameThread({ roomId: initial.room.id, title: "Sienna pilot verification" });
const report = await caller.ohapiPilot.report({
  roomId: initial.room.id,
  reason: "quality",
  detail: "Automated beta-control verification against the non-personal pilot thread.",
});
const cleared = await caller.ohapiPilot.clearThread({ roomId: initial.room.id });
const after = await caller.ohapiPilot.history({ worldSlug: "sienna-vale" });

const db = await getDb();
if (!db) throw new Error("Database was unavailable for verification.");
const retired = await db.select().from(ohapiRooms).where(and(eq(ohapiRooms.id, initial.room.id), isNotNull(ohapiRooms.deletedAt))).limit(1);
const messages = await db.select().from(ohapiMessages).where(eq(ohapiMessages.roomId, initial.room.id));
const reports = await db.select().from(ohapiReports).where(eq(ohapiReports.roomId, initial.room.id));

console.log(JSON.stringify({
  renamedTitle: "Sienna pilot verification",
  reportSubmitted: report.submitted,
  clearConfirmed: cleared.cleared,
  activeRoomAfterClear: after.room ?? null,
  activeMessageCountAfterClear: after.messages.length,
  retiredRoomFound: retired.length === 1,
  storedMessageCountAfterClear: messages.length,
  storedReportCount: reports.length,
}, null, 2));
