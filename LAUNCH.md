# Launch runbook

Written during the build sprint of 16 August 2026. This is the order of
operations for taking the stacked branches live. Nothing here requires code
changes — only pushes, merges, accounts, and environment variables.

## The stack

Six local branches, each verified (`pnpm check`, `pnpm test` — 297 green at
the tip — `pnpm build`), stacked in this order:

```
claude/candy-discovery-port   M1  discovery design on the public pages
└─ claude/crypto-payments     M3  crypto rail (log mode) + /pricing
   └─ claude/generation-quality   M3.5  1080×1920, image-to-video, refunds
      └─ claude/media-storage     M4   durable media (copy-on-complete)
         └─ claude/collection-persistence   M2  collection in the database
            └─ claude/chat-restyle   M5  display type on the chat surface
```

The sibling repo `ohapi-playground` has `fix/live-api-alignment` with its
four live-API corrections.

## Going live

1. **Push the branches** (`git push origin claude/candy-discovery-port` … or
   all six). Nothing deploys from a branch push.
2. **Merge in order** (GitHub PR or CLI), each into the next's parent and
   finally into `main`:
   `candy-discovery-port` → `crypto-payments` → `generation-quality` →
   `media-storage` → `collection-persistence` → `chat-restyle` → `main`.
   Because they are stacked, the final merge to `main` carries everything.
3. **Merge to `main` deploys automatically.** The workflow rsyncs `dist`,
   `drizzle` (migration `0012_saved_companions` ships with it), restarts the
   service, and health-checks `/robots.txt`.
4. **Verify on the live site**: landing renders the new design → catalogue
   lists the synced companions → a profile opens → guest chat still gated →
   `/pricing` shows the plans → sign-in link email arrives.

## Environment variables to add (each is independently safe to skip)

| Block | Vars | Effect when set | Effect when unset |
| --- | --- | --- | --- |
| Media storage | `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_BASE` | Results copied to our bucket on completion; links never expire | Provider links, which die after ~7 days |
| Payments | `PAYMENTS_PROVIDER=nowpayments`, `PAYMENTS_API_KEY`, `PAYMENTS_IPN_SECRET` | Real crypto checkout | `log` mode — dev-confirm only, refused in production |

Add them to `/srv/mygf/.env` on the droplet, then `systemctl restart mygf`.

## Before opening the doors (the pinned TODO)

- [ ] NOWPayments account live and vars set; one real test payment refunded
- [ ] Card rail application submitted (CCBill **and** Epoch — take the first
      approval); underwriting takes weeks, so submit today
- [ ] Spaces bucket created; vars set; one generation confirmed in the bucket
- [ ] Old partner API key rotated at the provider; `OHAPI_API_KEY` updated
- [ ] Fresh characters generated and saved
      (`node scripts/ohapi-create-characters.mjs --candidates 3`), then
      `/ops/ohapi` → Refresh library
- [ ] `includedMediaCredits` revisited once the provider's per-generation
      cost is known (formula in `MONETIZATION.md`)

## If something is wrong after deploy

Rollback is the symlink swap in `RELEASE_RECOVERY.md` — read it before you
need it, not during. The recovery registry lists checkpoints and the
manus.space mirrors.
