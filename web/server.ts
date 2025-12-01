import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { extname } from "https://deno.land/std@0.210.0/path/mod.ts";

const PORT = 8080;
const BUILD_DIR = Deno.env.get("BUILD_DIR") || "/app/builds";
const DOCKER_HOST = Deno.env.get("DOCKER_HOST") || "tcp://docker-proxy:2375";
const BUILDER_CONTAINER = "nuvyhub_builder";

console.log(`🚀 NuvyHub Server iniciado en puerto ${PORT}`);
console.log(`📁 Directorio de builds: ${BUILD_DIR}`);
console.log(`🐳 Docker Host: ${DOCKER_HOST}`);

// Utilidad para hacer requests al Docker API
async function dockerAPI(endpoint: string, options: RequestInit = {}) {
  const baseURL = DOCKER_HOST.replace("tcp://", "http://");
  const url = `${baseURL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Docker API error: ${response.status} - ${error}`);
  }

  return response;
}

// Generar ID único simple
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Handler principal
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS headers para desarrollo
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Rutas
  if (url.pathname === "/status" && req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "online",
        service: "NuvyHub Compiler",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }

  if (url.pathname === "/build" && req.method === "POST") {
    return handleBuild(req, headers);
  }

  if (url.pathname.startsWith("/download/")) {
    return handleDownload(url.pathname, headers);
  }

  // Landing simple
  return new Response(getLandingHTML(), {
    status: 200,
    headers: { ...headers, "Content-Type": "text/html" },
  });
}

// Handler de compilación
async function handleBuild(
  req: Request,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const formData = await req.formData();
    const codeFile = formData.get("code") as File | null;

    if (!codeFile || !codeFile.name.endsWith(".c")) {
      return new Response(
        JSON.stringify({
          error: "Debes subir un archivo .c válido",
        }),
        {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    const jobId = generateId();
    const outputName = `build_${jobId}`;
    const sourcePath = `${BUILD_DIR}/${outputName}.c`;
    const outputPath = `${BUILD_DIR}/${outputName}.bin`;

    // Guardar archivo fuente
    const code = await codeFile.arrayBuffer();
    await Deno.writeFile(sourcePath, new Uint8Array(code));

    console.log(`⚙️ Compilando job: ${jobId}`);

    // Ejecutar compilación en el Builder usando Docker API
    const execConfig = {
      AttachStdout: true,
      AttachStderr: true,
      Cmd: ["/app/compile-esp32.sh", `/app/builds/${outputName}.c`, outputName],
    };

    // Crear exec instance
    const execCreateResp = await dockerAPI(
      `/containers/${BUILDER_CONTAINER}/exec`,
      {
        method: "POST",
        body: JSON.stringify(execConfig),
      }
    );

    const { Id: execId } = await execCreateResp.json();

    // Ejecutar el comando
    const execStartResp = await dockerAPI(`/exec/${execId}/start`, {
      method: "POST",
      body: JSON.stringify({ Detach: false }),
    });

    const output = await execStartResp.text();

    // Verificar si el comando fue exitoso
    const inspectResp = await dockerAPI(`/exec/${execId}/json`);
    const inspectData = await inspectResp.json();

    if (inspectData.ExitCode !== 0) {
      console.error(`❌ Error en compilación de ${jobId}:`, output);

      // Limpiar archivo fuente en caso de error
      try {
        await Deno.remove(sourcePath);
      } catch (e) {
        console.error("Error limpiando fuente:", e);
      }

      return new Response(
        JSON.stringify({
          error: "Error en compilación",
          log: output,
        }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar que el BIN existe
    try {
      await Deno.stat(outputPath);
      console.log(`✅ Compilación exitosa: ${outputName}.bin`);

      // Limpiar archivo fuente DESPUÉS de éxito
      try {
        await Deno.remove(sourcePath);
      } catch (e) {
        console.error("Error limpiando fuente:", e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          downloadUrl: `/download/${outputName}.bin`,
          log: output,
          jobId,
        }),
        {
          status: 200,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    } catch (e) {
      console.error(`❌ Binario no encontrado: ${outputPath}`);

      // Limpiar archivo fuente si el binario no se generó
      try {
        await Deno.remove(sourcePath);
      } catch (cleanupErr) {
        console.error("Error limpiando fuente:", cleanupErr);
      }

      return new Response(
        JSON.stringify({
          error: "Binario no generado",
          log: output,
        }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("❌ Error general:", error);
    const details = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details,
      }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
}

// Handler de descarga
async function handleDownload(
  path: string,
  headers: Record<string, string>
): Promise<Response> {
  const filename = path.split("/").pop() || "";
  const fullPath = `${BUILD_DIR}/${filename}`;

  if (!filename.endsWith(".bin")) {
    return new Response("Archivo no válido", { status: 400 });
  }

  try {
    const file = await Deno.readFile(fullPath);

    // Eliminar archivo después de 10 segundos
    setTimeout(async () => {
      try {
        await Deno.remove(fullPath);
        console.log(`🗑️ Binario eliminado: ${filename}`);
      } catch (e) {
        console.error("Error eliminando archivo:", e);
      }
    }, 10000);

    return new Response(file, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return new Response("Archivo no encontrado o expirado", {
      status: 404,
      headers,
    });
  }
}

// Landing HTML simple
function getLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NuvyHub Compiler</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2em;
    }
    p {
      color: #666;
      margin-bottom: 30px;
    }
    .drop-zone {
      border: 3px dashed #667eea;
      border-radius: 10px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #f8f9ff;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      background: #667eea;
      color: white;
    }
    .drop-zone.drag-over {
      transform: scale(1.02);
    }
    input[type="file"] { display: none; }
    .status {
      margin-top: 20px;
      padding: 15px;
      border-radius: 8px;
      display: none;
    }
    .status.success { background: #d4edda; color: #155724; display: block; }
    .status.error { background: #f8d7da; color: #721c24; display: block; }
    .status.loading { background: #d1ecf1; color: #0c5460; display: block; }
    .btn {
      display: inline-block;
      margin-top: 10px;
      padding: 10px 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: background 0.3s;
    }
    .btn:hover { background: #5568d3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 NuvyHub</h1>
    <p>Compilador ESP32 en la nube</p>
    
    <div class="drop-zone" id="dropZone">
      📁 Arrastra tu archivo .c aquí<br>
      o haz clic para seleccionar
    </div>
    
    <input type="file" id="fileInput" accept=".c">
    
    <div class="status" id="status"></div>
  </div>

  <script>
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const status = document.getElementById('status');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) uploadFile(file);
    });

    async function uploadFile(file) {
      if (!file.name.endsWith('.c')) {
        showStatus('error', '❌ Solo archivos .c son válidos');
        return;
      }

      showStatus('loading', '⏳ Compilando...');

      const formData = new FormData();
      formData.append('code', file);

      try {
        const response = await fetch('/build', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          showStatus('success', 
            \`✅ Compilación exitosa!<br>
            <a href="\${result.downloadUrl}" class="btn">Descargar BIN</a>\`
          );
        } else {
          showStatus('error', \`❌ Error: \${result.error}\`);
        }
      } catch (err) {
        showStatus('error', '❌ Error de red');
      }
    }

    function showStatus(type, message) {
      status.className = 'status ' + type;
      status.innerHTML = message;
    }
  </script>
</body>
</html>`;
}

serve(handler, { port: PORT });
