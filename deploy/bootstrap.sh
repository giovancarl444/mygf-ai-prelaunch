#!/usr/bin/env bash
#
# Prepares a fresh Ubuntu droplet to run MyGF.ai, from nothing to serving.
#
# The repository is private, so this cannot be fetched with an anonymous curl.
# Copy it up from a machine that can see the repository:
#
#   scp deploy/bootstrap.sh root@<droplet-ip>:/root/
#   ssh root@<droplet-ip>
#   bash bootstrap.sh
#
# It is deliberately self-contained — it downloads nothing from the repository,
# so a private repository, a rate limit, or a network hiccup partway through
# cannot leave a half-configured machine.
#
# It asks for two secrets, works out everything else for itself, and finishes by
# printing exactly what to paste into the repository's Actions secrets.
#
# This exists as a script rather than a list of instructions on purpose. A
# server built by hand is a server nobody can rebuild — including the person who
# built it, three months later, at the worst possible moment.
#
# Safe to run again: every step checks before it acts, and nothing here deletes
# data.
set -euo pipefail

DEPLOY_USER=deploy
APP_USER=mygf
APP_ROOT=/srv/mygf
ENV_FILE="$APP_ROOT/.env"

say() { printf '\n\033[1;35m▸ %s\033[0m\n' "$1"; }
note() { printf '  %s\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run this as root: sudo bash bootstrap.sh"

# ---------------------------------------------------------------------------
# Where this machine is, so the certificate hostname does not have to be typed
# ---------------------------------------------------------------------------

say "Finding this machine's address"
PUBLIC_IP="$(curl -fsS --max-time 5 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address 2>/dev/null || true)"
[ -n "$PUBLIC_IP" ] || PUBLIC_IP="$(curl -fsS --max-time 8 https://api.ipify.org || true)"
[ -n "$PUBLIC_IP" ] || fail "Could not determine the public IP. Pass it as: PUBLIC_IP=1.2.3.4 bash bootstrap.sh"

# sslip.io resolves any hostname containing an address to that address, so a
# real certificate is issued for a domain nobody had to register. When the brand
# domain arrives, this is one of two lines that change.
HOSTNAME_FOR_TLS="${SITE_HOSTNAME:-${PUBLIC_IP//./-}.sslip.io}"
BASE_URL="https://$HOSTNAME_FOR_TLS"
note "Address:  $PUBLIC_IP"
note "Hostname: $HOSTNAME_FOR_TLS"
note "Site:     $BASE_URL"

# ---------------------------------------------------------------------------
# The two things only you know
# ---------------------------------------------------------------------------

if [ -f "$ENV_FILE" ] && grep -q '^DATABASE_URL=.\+' "$ENV_FILE"; then
  say "Keeping the existing $ENV_FILE"
  note "Delete it and run again to start over."
  KEEP_ENV=1
else
  KEEP_ENV=0
  say "Two secrets are needed"
  note "Both are read without echoing and written only to $ENV_FILE (mode 640)."
  note "They are not passed as arguments, so they stay out of shell history."
  echo
  printf '  DigitalOcean MySQL connection string (the VPC/private one): '
  read -rs DATABASE_URL_INPUT; echo
  printf '  OhAPI API key: '
  read -rs OHAPI_KEY_INPUT; echo

  [ -n "$DATABASE_URL_INPUT" ] || fail "The database connection string is required."
  [ -n "$OHAPI_KEY_INPUT" ] || fail "The OhAPI key is required."
  case "$DATABASE_URL_INPUT" in
    mysql://*) ;;
    *) fail "That does not look like a MySQL connection string — it should start with mysql://" ;;
  esac
  case "$DATABASE_URL_INPUT" in
    *ssl-mode=*|*sslmode=*) ;;
    *) note "Note: no ssl-mode in that string. Managed databases usually require"
       note "      TLS — if the connection is refused, check you copied the VPC"
       note "      connection string rather than assembling one by hand." ;;
  esac
fi

# ---------------------------------------------------------------------------
# Packages
# ---------------------------------------------------------------------------

say "Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates rsync ufw gnupg debian-keyring debian-archive-keyring apt-transport-https mysql-client >/dev/null

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
  note "Node 22 — the same major version CI builds against"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
fi
corepack enable >/dev/null 2>&1 || true
note "node $(node -v), pnpm $(corepack pnpm -v 2>/dev/null || echo 'via corepack')"

if ! command -v caddy >/dev/null; then
  note "Caddy — for certificates that renew themselves"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi

# ---------------------------------------------------------------------------
# Users and layout
# ---------------------------------------------------------------------------

say "Creating users and directories"
# The application runs as an account that cannot log in. If it is ever
# compromised, that is the difference between one directory and the machine.
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_ROOT" --shell /usr/sbin/nologin "$APP_USER"
id -u "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"

mkdir -p "$APP_ROOT"/{current,incoming,previous}
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$APP_ROOT"
note "$APP_ROOT ready"

# CI restarts one service and can do nothing else with root.
cat > /etc/sudoers.d/mygf-deploy <<SUDO
$DEPLOY_USER ALL=(root) NOPASSWD: /bin/systemctl restart mygf, /bin/systemctl is-active mygf
SUDO
chmod 440 /etc/sudoers.d/mygf-deploy

# ---------------------------------------------------------------------------
# The deploy key, made here so no private key is ever carried across a laptop
# ---------------------------------------------------------------------------

say "Creating the deploy key"
DEPLOY_HOME=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_HOME/.ssh"
KEY_PATH="$DEPLOY_HOME/.ssh/github_deploy"

if [ ! -f "$KEY_PATH" ]; then
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -C "github-actions" -f "$KEY_PATH" >/dev/null
  cat "$KEY_PATH.pub" >> "$DEPLOY_HOME/.ssh/authorized_keys"
  sort -u "$DEPLOY_HOME/.ssh/authorized_keys" -o "$DEPLOY_HOME/.ssh/authorized_keys"
  chown "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_HOME/.ssh/authorized_keys"
  chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
  note "Generated. The private half is printed once at the end."
else
  note "Already present, keeping it."
fi

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

say "Writing configuration"

if [ "$KEEP_ENV" -eq 0 ]; then
  JWT_SECRET_VALUE="$(openssl rand -base64 48 | tr -d '\n')"
  umask 077
  cat > "$ENV_FILE" <<ENV
# Written by deploy/bootstrap.sh. Secrets live here and nowhere else — not in
# the repository, not in the bundle, not in CI.
NODE_ENV=production
PORT=3000

PUBLIC_BASE_URL=$BASE_URL

DATABASE_URL=$DATABASE_URL_INPUT
# Set only if the database certificate is not publicly trusted. A PEM, or a
# path to one.
DATABASE_CA_CERT=

OHAPI_API_KEY=$OHAPI_KEY_INPUT
JWT_SECRET=$JWT_SECRET_VALUE

# Any non-empty string; it is stamped into the session token and checked for
# presence only.
VITE_APP_ID=mygf

# Set this to your own openId once you have signed in, to unlock /ops/ohapi.
OWNER_OPEN_ID=

# 'log' prints sign-in links to the service log instead of emailing them, which
# is enough to test the whole flow before a sending domain is verified.
EMAIL_PROVIDER=log
EMAIL_API_KEY=
EMAIL_FROM=
ENV
  umask 022
  note "$ENV_FILE written"
fi

# Ownership is repaired on every run, not only when the file is created, so a
# box set up before this was corrected is fixed by running the script again.
#
# The group is the deploy user rather than the application user, which looks
# backwards and is not: systemd reads EnvironmentFile as root and injects the
# variables, so the service never opens this file. The deploy does, to apply
# migrations. Giving the application read access to its own secrets file would
# widen what a compromise of it reaches for nothing.
chown root:"$DEPLOY_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"
note "$ENV_FILE readable by root and $DEPLOY_USER only"

# Written out rather than fetched, so this script needs nothing but itself.
# Kept identical to deploy/mygf.service in the repository.
cat > /etc/systemd/system/mygf.service <<'UNIT'
[Unit]
Description=MyGF.ai
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mygf
Group=mygf
WorkingDirectory=/srv/mygf/current
EnvironmentFile=/srv/mygf/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3

# The process needs its own release directory and nothing else on the box. If
# it is ever compromised, this is the difference between one directory and the
# whole machine.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/mygf
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
UNIT
note "systemd unit installed"

cat > /etc/caddy/Caddyfile <<CADDY
# Written by deploy/bootstrap.sh.
$HOSTNAME_FOR_TLS {
	encode zstd gzip

	# Asset filenames carry a content hash, so they never change meaning. The
	# HTML shell does, because per-route metadata is written into it per request.
	@immutable path /assets/*
	header @immutable Cache-Control "public, max-age=31536000, immutable"
	header /index.html Cache-Control "no-cache"

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	reverse_proxy 127.0.0.1:3000
}
CADDY
note "Caddyfile written for $HOSTNAME_FOR_TLS"

# ---------------------------------------------------------------------------
# Firewall
# ---------------------------------------------------------------------------

say "Closing everything except SSH and the web"
ufw allow OpenSSH >/dev/null
ufw allow 80,443/tcp >/dev/null
ufw --force enable >/dev/null
note "$(ufw status | head -1)"

# ---------------------------------------------------------------------------
# Start
# ---------------------------------------------------------------------------

say "Starting"
systemctl daemon-reload

# `enable --now` is a no-op on a service apt has already started, which would
# leave Caddy serving its default configuration and issuing no certificate for
# our hostname. Validate, then restart unconditionally.
if ! caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  fail "The Caddy configuration is not valid. Nothing was restarted."
fi
systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy
note "Caddy restarted with our configuration"

# The certificate is fetched on first request and takes a few seconds. Nudge it
# so the operator is not left wondering whether it worked.
sleep 3
if curl -fsS --max-time 20 "https://$HOSTNAME_FOR_TLS" -o /dev/null 2>/dev/null; then
  note "Certificate issued — HTTPS is answering"
else
  note "Certificate not issued yet. It arrives within a minute of the first"
  note "request; check with: journalctl -u caddy -n 30"
fi
systemctl enable mygf >/dev/null 2>&1 || true
# The service will not stay up until a release exists; the first deploy starts
# it for real. Failing here is expected and not worth alarming anyone about.
systemctl restart mygf >/dev/null 2>&1 || true

if [ -d "$APP_ROOT/current" ] && [ -f "$APP_ROOT/current/dist/index.js" ]; then
  systemctl is-active --quiet mygf && note "Application running"
else
  note "No release deployed yet — that is the next step, and it is a git push."
fi

# ---------------------------------------------------------------------------
# What to paste into GitHub
# ---------------------------------------------------------------------------

KNOWN_HOSTS="$(ssh-keyscan -t ed25519 "$PUBLIC_IP" 2>/dev/null || true)"

cat <<BANNER

$(printf '\033[1;32m')════════════════════════════════════════════════════════════════
 The server is ready. Six secrets to add, then deploying is a push.
════════════════════════════════════════════════════════════════$(printf '\033[0m')

 Repository → Settings → Secrets and variables → Actions → New repository secret

 ── DEPLOY_HOST ────────────────────────────────────────────────
$PUBLIC_IP

 ── DEPLOY_USER ────────────────────────────────────────────────
$DEPLOY_USER

 ── PUBLIC_BASE_URL ────────────────────────────────────────────
$BASE_URL

 ── VITE_APP_ID ────────────────────────────────────────────────
mygf

 ── DEPLOY_KNOWN_HOSTS ─────────────────────────────────────────
$KNOWN_HOSTS

 ── DEPLOY_SSH_KEY ─────────────────────────────────────────────
 (everything between and including the BEGIN and END lines)

$(cat "$KEY_PATH")

$(printf '\033[1;33m')────────────────────────────────────────────────────────────────
 Then, from your machine:   git push origin main
 Watch it in the repository's Actions tab.

 Your site:  $BASE_URL
 Live logs:  journalctl -u mygf -f
────────────────────────────────────────────────────────────────$(printf '\033[0m')

BANNER
