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

## Create two things in the DigitalOcean console

**Droplet** — region **NYC3**, image **Ubuntu 24.04 LTS**, size **Basic /
Regular / $18** (2 GB, 2 vCPU), authentication **SSH key**, backups on.

NYC3 rather than anywhere else because the provider serves its media from
`us-east-1`, so this is the shortest hop to the thing every request talks to,
and because the largest market for English search traffic is there.

**Managed MySQL 8** — the **same region**, Basic $15 (1 GB). Then
*Settings → Trusted Sources → add the droplet*, which takes the database off the
public internet entirely, and copy the **VPC** connection string rather than the
public one.

## Then one command on the droplet

The repository is private, so the script cannot be fetched with an anonymous
`curl` — copy it up instead:

```bash
scp deploy/bootstrap.sh root@<droplet-ip>:/root/
ssh root@<droplet-ip>
bash bootstrap.sh
```

From Windows, if the file came down through a browser, strip the line endings
first or `bash` will fail on the carriage returns:

```bash
sed -i 's/\r$//' bootstrap.sh
```

The script is self-contained and downloads nothing from the repository, so a
private repository or a network hiccup partway through cannot leave a
half-configured machine.

It asks for the database connection string and the OhAPI key, reads both without
echoing, and writes them only to `/srv/mygf/.env` at mode 640. Everything else
it works out: the public address, the certificate hostname, the session secret,
the deploy key, the service, the firewall.

It finishes by printing the six repository secrets to paste into
*Settings → Secrets and variables → Actions*. After that, deploying is
`git push origin main`.

Safe to run again — every step checks before it acts, and an existing `.env` is
left alone.

### No domain yet

The script points the certificate at `<address-with-dashes>.sslip.io`, a
hostname that resolves to the address inside it. A real certificate is issued
for a domain nobody had to register, so deployment does not wait on the brand
decision. When the real domain arrives, two things change: the hostname in
`/etc/caddy/Caddyfile`, and `PUBLIC_BASE_URL` in `/srv/mygf/.env`.

## The repository secrets CI needs

| Secret | What |
| --- | --- |
| `DEPLOY_HOST` | Droplet address |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private half of the CI deploy key — generated on the server, so it never crosses a laptop |
| `DEPLOY_KNOWN_HOSTS` | Pinned host key, so a changed one fails the deploy |
| `PUBLIC_BASE_URL` | Used for the post-deploy check |
| `VITE_APP_ID` | Baked into the bundle. Any non-empty string. |

## Moving the data off Manus

`deploy/migrate-data.sh` does this in the order that matters, and refuses to
proceed if handed a dump that would undo it.

```bash
# Only if the old credentials still work. Data only — no table definitions.
mysqldump --single-transaction --no-create-info --set-gtid-purged=OFF \
  -h <old-host> -u <user> -p <database> > old-data.sql

# Then, against the new database:
DATABASE_URL='mysql://…' bash deploy/migrate-data.sh old-data.sql
```

With no dump, run it with no argument. That is the normal case and not a loss:
the companion catalogue rebuilds from the provider on the first sync, and the
portrait URLs in any old database expired an hour after they were issued anyway.

**Why the order matters.** The production `__drizzle_migrations` ledger has been
broken since the original deploy, which is why every schema change so far has
been hand-run SQL. Building the schema from zero writes that ledger correctly
and repairs the problem permanently — but only if it happens before any old
tables land. The script checks the dump for `CREATE TABLE` and stops if it finds
any, because importing table definitions is precisely what would carry the
broken state across.

## Rolling back

The previous release is kept on the box.

```bash
ssh deploy@<droplet> 'cd /srv/mygf && rm -rf current && cp -a previous current && sudo systemctl restart mygf'
```

A schema migration is not rolled back by this. If a release migrated, roll
forward instead.

## Sign-in

Sign-in is ours: `POST auth.requestLink` emails a one-time link,
`GET /api/auth/verify` exchanges it for the same session cookie the app already
used. Set `EMAIL_PROVIDER`, `EMAIL_API_KEY`, and `EMAIL_FROM`, and verify the
sending domain with the provider before launch — an unverified domain is how a
sign-in link ends up in spam, which reads to the customer as a broken product.

`PUBLIC_BASE_URL` matters here beyond SEO: it is the origin written into the
link. Unset, links follow the request host, which is wrong the moment anything
sits in front of the app.

The old identity provider's callback is still mounted so accounts created
through it keep working. Those accounts are matched **by email address** on
their first link sign-in, so nobody is orphaned. Once nobody signs in that way,
`registerOAuthRoutes`, `VITE_OAUTH_PORTAL_URL`, and `OAUTH_SERVER_URL` can go.
