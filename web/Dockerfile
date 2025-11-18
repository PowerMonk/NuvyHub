FROM denoland/deno:1.45.5

WORKDIR /app

# Copiar código
COPY server.ts .

# Pre-cachear dependencias como usuario deno
USER deno
RUN deno cache server.ts

# Volver a root para el entrypoint
USER root

# Script de inicio que arregla permisos y ejecuta como deno
# Usamos 'runuser' que ya viene en la imagen base
RUN printf '#!/bin/sh\n\
mkdir -p /app/builds\n\
chown -R deno:deno /app/builds\n\
exec deno run --allow-net --allow-read --allow-write=/app/builds --allow-env /app/server.ts\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
