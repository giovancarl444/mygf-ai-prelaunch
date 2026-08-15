#!/usr/bin/env bash
# One-time preparation of a fresh Ubuntu droplet. Run as root.
#
# Everything after this is `git push`. Deliberately small: the less that is
# configured by hand, the less there is to reproduce when this has to be done
# again at three in the morning.
set -euo pipefail

DEPLOY_USER=deploy

apt-get update
apt-get install -y curl ca-certificates rsync ufw debian-keyring debian-archive-keyring apt-transport-https

# Node 22, matching what CI builds against. A different major version on the
# server is a class of bug that only ever shows up in production.
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable

# Caddy, for automatic TLS.
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# The application runs as a user that cannot log in.
id -u mygf >/dev/null 2>&1 || useradd --system --home /srv/mygf --shell /usr/sbin/nologin mygf
id -u "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"

mkdir -p /srv/mygf/{current,incoming,previous}
chown -R "$DEPLOY_USER":"$DEPLOY_USER" /srv/mygf

# The deploy user restarts one service and nothing else.
cat > /etc/sudoers.d/mygf-deploy <<SUDO
$DEPLOY_USER ALL=(root) NOPASSWD: /bin/systemctl restart mygf, /bin/systemctl is-active mygf
SUDO
chmod 440 /etc/sudoers.d/mygf-deploy

install -m 640 -o "$DEPLOY_USER" -g mygf /dev/null /srv/mygf/.env
echo "Write the environment into /srv/mygf/.env before starting the service."

ufw allow OpenSSH
ufw allow 80,443/tcp
ufw --force enable

echo "Now: copy deploy/mygf.service to /etc/systemd/system/, deploy/Caddyfile to /etc/caddy/,"
echo "add the CI public key to /home/$DEPLOY_USER/.ssh/authorized_keys, then:"
echo "  systemctl daemon-reload && systemctl enable mygf && systemctl reload caddy"
