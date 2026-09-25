#!/bin/sh
set -eu

base="${VITE_BASE_PATH:-/github-workflow-dispatcher-web/}"
case "$base" in
  /*) ;;
  *) base="/$base" ;;
esac
case "$base" in
  */) ;;
  *) base="$base/" ;;
esac

dest="/usr/share/nginx/html${base}"
mkdir -p "$dest"
cp -a /opt/web-dist/. "$dest"

cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    location = / {
        return 302 ${base};
    }

    location ${base} {
        try_files \$uri \$uri/ ${base}index.html;
    }
}
EOF
