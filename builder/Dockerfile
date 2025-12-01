FROM espressif/idf:v5.1

# Cambiar a root para instalar paquetes adicionales
USER root

# Instalar PlatformIO para soporte Arduino
RUN apt-get update && apt-get install -y \
    python3-pip \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip && \
    pip3 install platformio

# Pre-instalar plataforma ESP32 para PlatformIO (Arduino)
RUN pio platform install espressif32

# Crear directorios de trabajo
RUN mkdir -p /app/builds
WORKDIR /app

# Copiar script de compilación
COPY compile-esp32.sh /app/
RUN dos2unix /app/compile-esp32.sh && chmod +x /app/compile-esp32.sh

# Mantener contenedor activo
CMD ["tail", "-f", "/dev/null"]