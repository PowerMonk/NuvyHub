FROM espressif/idf:release-v5.1

# Cambiar a root para instalar paquetes adicionales
USER root

# Instalar utilidades
RUN apt-get update && apt-get install -y \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app
RUN mkdir -p /app/builds

# Copiar script de compilación
COPY compile-esp32.sh /app/
RUN dos2unix /app/compile-esp32.sh && chmod +x /app/compile-esp32.sh

# El contenedor se mantiene vivo esperando comandos
CMD ["tail", "-f", "/dev/null"]