import { getUserByOpenId } from "../server/db";
import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

const owner = await getUserByOpenId("TgRoupcpkuPxGXXfXzkb9U");
if (!owner) throw new Error("The owner account could not be found for the private pilot test.");

const ctx: TrpcContext = {
  user: owner,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const caller = appRouter.createCaller(ctx);
const result = await caller.ohapiPilot.send({
  worldSlug: "sienna-vale",
  userGender: "male",
  textingStyle: "default",
  prompt: "Open a short, non-explicit imaginative thread about arriving at a late-night museum. Keep the reply to two sentences.",
});

console.log(JSON.stringify(result));
