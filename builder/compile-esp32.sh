#!/bin/bash
set -e

SOURCE_PATH=$1
OUTPUT_NAME=$2
BUILD_DIR="/tmp/build_$$"
OUTPUT_DIR="/app/builds"

echo "🔧 Iniciando compilación ESP32: $OUTPUT_NAME"
echo "📄 Archivo fuente: $SOURCE_PATH"

# Validación
if [ -z "$SOURCE_PATH" ] || [ -z "$OUTPUT_NAME" ]; then
    echo "❌ ERROR: Uso: $0 <source_path> <output_name>"
    exit 1
fi

if [ ! -f "$SOURCE_PATH" ]; then
    echo "❌ ERROR: Archivo fuente no encontrado: $SOURCE_PATH"
    exit 1
fi

# Setup - crear estructura de proyecto ESP-IDF
mkdir -p "$BUILD_DIR/main"
cp "$SOURCE_PATH" "$BUILD_DIR/main/main.c"

# Crear CMakeLists.txt principal
cat > "$BUILD_DIR/CMakeLists.txt" << 'EOF'
cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_firmware)
EOF

# Crear CMakeLists.txt del componente main
cat > "$BUILD_DIR/main/CMakeLists.txt" << 'EOF'
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS ".")
EOF

# Compilación con ESP-IDF
cd "$BUILD_DIR"
echo "🔨 Configurando proyecto ESP-IDF..."

# Usar idf.py para compilar (target ESP32 por defecto)
. $IDF_PATH/export.sh
idf.py set-target esp32
idf.py build

# El binario final está en build/*.bin
# ESP-IDF genera varios archivos .bin, el principal es el combinado
if [ -f "$BUILD_DIR/build/esp32_firmware.bin" ]; then
    cp "$BUILD_DIR/build/esp32_firmware.bin" "$OUTPUT_DIR/${OUTPUT_NAME}.bin"
    echo "✅ Compilación exitosa: ${OUTPUT_NAME}.bin"
    
    # Limpieza
    cd /
    rm -rf "$BUILD_DIR"
    exit 0
else
    echo "❌ ERROR: No se generó el binario .bin"
    echo "Archivos generados:"
    find "$BUILD_DIR/build" -name "*.bin" || echo "No se encontraron archivos .bin"
    ls -la "$BUILD_DIR/build/" 2>/dev/null || echo "Directorio build no existe"
    exit 1
fi