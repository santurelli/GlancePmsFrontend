FROM caddy:2-alpine

# Copia i file buildati (Vite genera in dist/)
COPY dist/ /usr/share/caddy/

# Copia il Caddyfile per il routing SPA
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
