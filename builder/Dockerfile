FROM ubuntu:22.04

# Evitar prompts interactivos
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias base
RUN apt-get update && apt-get install -y \
    git \
    cmake \
    gcc-arm-none-eabi \
    libnewlib-arm-none-eabi \
    build-essential \
    libstdc++-arm-none-eabi-newlib \
    wget \
    python3 \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Descargar Pico SDK
WORKDIR /pico
RUN git clone --depth 1 --branch 1.5.1 https://github.com/raspberrypi/pico-sdk.git
WORKDIR /pico/pico-sdk
RUN git submodule update --init

# Variables de entorno
ENV PICO_SDK_PATH=/pico/pico-sdk

# Crear directorio de trabajo
WORKDIR /app
RUN mkdir -p /app/builds

# Copiar script de compilación
COPY compile-rp2040.sh /app/
RUN dos2unix /app/compile-rp2040.sh && chmod +x /app/compile-rp2040.sh

# El contenedor se mantiene vivo esperando comandos
CMD ["tail", "-f", "/dev/null"]