const http = require("http");

const PORT = Number(process.env.MATRIX_PORT || 8199);

function send(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 25 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("JSON invalido recebido pelo endpoint."));
      }
    });
    req.on("error", reject);
  });
}

function summarizeWorkflow(payload) {
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const links = Array.isArray(payload.links) ? payload.links : [];
  const target = payload.target || {};
  const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
  const prompt = inputs
    .filter(n => /Prompt/i.test(n.type || "") || /prompt/i.test(n.title || ""))
    .map(n => n.text)
    .filter(Boolean)
    .join("\n\n");
  const media = inputs
    .filter(n => n.fileName)
    .map(n => `${n.title || n.type}: ${n.fileName}`);

  return {
    target: target.title || "Gerador Open Source",
    model: target.model || "qwen-image-edit",
    endpoint: target.endpoint || "",
    nodes: nodes.length,
    links: links.length,
    inputs: inputs.map(n => n.title || n.type),
    media,
    prompt,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/health" || req.url === "/matrix-generate")) {
    return send(res, 200, {
      ok: true,
      service: "MatriX Viral local Open Source endpoint",
      routes: ["POST /matrix-generate"],
      note: "Isto e uma API local, nao a tela da ferramenta. Abra o index.html ou o GitHub Pages para usar a MatriX Viral. Este endpoint recebe o node Gerador Open Source.",
      next_step: "Para gerar imagem real, conecte este servidor ao ComfyUI/RunPod com Qwen-Image-Edit ou FLUX Kontext.",
    });
  }

  if (req.method === "POST" && req.url === "/matrix-generate") {
    try {
      const payload = await readJson(req);
      const summary = summarizeWorkflow(payload);
      return send(res, 200, {
        ok: true,
        text: "Workflow recebido pelo endpoint local. Geracao real ainda precisa ser conectada ao ComfyUI/RunPod.",
        output: "Endpoint local funcionando. Proximo passo: mapear este payload para um workflow ComfyUI com Qwen-Image-Edit ou FLUX Kontext.",
        summary,
      });
    } catch (err) {
      return send(res, 400, { ok: false, error: err.message || String(err) });
    }
  }

  send(res, 404, { ok: false, error: "Rota nao encontrada." });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`MatriX Viral endpoint rodando em http://127.0.0.1:${PORT}/matrix-generate`);
});
