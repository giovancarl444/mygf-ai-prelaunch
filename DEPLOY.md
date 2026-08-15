# Deploying MyGF.ai

Push to `main` is the deploy. This document exists for the parts that happen
once — the box, the database, and the move off the Manus workspace.

## Why a droplet rather than a platform

Vercel's acceptable-use policy prohibits content that is "obscene" or
"sexually exploitative", with no distinction between plans. DigitalOcean's
prohibits child sexual abuse material, non-consensual imagery, and deepfakes,
and does not prohibit legal adult content. In a category where being
deplatformed is the main systemic risk, the host must not have a vague morality
clause pointed at the product.

## What it costs

| | | |
| --- | --- | --- |
| Droplet, Basic 2 GB / 2 vCPU | 60 GB SSD, 3 TB transfer | $18.00/mo |
| Managed MySQL, 1 GB / 1 vCPU | 10 GB | $15.15/mo |
| Droplet backups | 20% of droplet | ~$3.60/mo |
| | | **≈ $37/mo** |

The server proxies to the provider and waits; it is I/O-bound, not CPU-bound,
and does no generation of its own. The 2 vCPU tier is chosen only so a restart
never contends — $12/mo single-vCPU would genuinely do to start.

Put the droplet and the database in the **same region**, and use the database's
**private network** host. Cross-region is latency on every request and
bandwidth you pay for.

## Once, on a fresh droplet

```bash
scp deploy/setup-droplet.sh root@<droplet>:/tmp/
ssh root@<droplet> bash /tmp/setup-droplet.sh

scp deploy/mygf.service root@<droplet>:/etc/systemd/system/mygf.service
scp deploy/Caddyfile    root@<droplet>:/etc/caddy/Caddyfile   # edit the hostname first
ssh root@<droplet> 'systemctl daemon-reload && systemctl enable mygf && systemctl reload caddy'
```

Then write `/srv/mygf/.env` from `.env.example`, and add the CI public key to
`/home/deploy/.ssh/authorized_keys`.

## The repository secrets CI needs

| Secret | What |
| --- | --- |
| `DEPLOY_HOST` | Droplet IP or hostname |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private half of the CI deploy key |
| `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan <droplet>` — pinned, so a changed host key fails the deploy |
| `PUBLIC_BASE_URL` | Used only for the post-deploy check |
| `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` | Read at build time and baked into the bundle |

## Moving the data off Manus

Do this **before** the account deletion window, not during it.

```bash
mysqldump --single-transaction --routines --set-gtid-purged=OFF \
  -h <manus-host> -u <user> -p <database> > mygf-backup.sql
```

Then, against the new database, **run the migrations first and import data
second**:

```bash
DATABASE_URL='mysql://…' pnpm exec drizzle-kit migrate
mysql -h <do-host> -u <user> -p <database> < mygf-data-only.sql
```

This is worth understanding rather than copying: the production
`__drizzle_migrations` ledger has been broken since the original deploy, which
is why every schema change so far has been hand-run SQL. A fresh database
running the migrations from zero builds that ledger correctly. **The move
repairs it for free** — but only in this order. Importing a dump that contains
the old tables first puts you back where you started.

## Rolling back

The previous release is kept on the box.

```bash
ssh deploy@<droplet> 'cd /srv/mygf && rm -rf current && cp -a previous current && sudo systemctl restart mygf'
```

A schema migration is not rolled back by this. If a release migrated, roll
forward instead.

## What is still bound to Manus

`VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, and `OAUTH_SERVER_URL` are the login
system. Moving the hosting does not move those, and when that account goes away
nobody can sign in. Self-hosted sessions are the remaining piece of this
migration, and the one with a date attached.
