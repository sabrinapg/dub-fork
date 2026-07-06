// ============================================================
// dub — "doodle ur brand" tool
// ============================================================

let selectedVibe = null;
let hasDrawing = false;

function initCanvas() {
  const canvas = document.getElementById("doodle-canvas");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#0a0a0a";

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
  }

  function start(e) {
    drawing = true;
    hasDrawing = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", end);
  canvas.addEventListener("mouseleave", end);
  canvas.addEventListener("touchstart", start);
  canvas.addEventListener("touchmove", move);
  canvas.addEventListener("touchend", end);

  document.getElementById("clear-canvas-btn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawing = false;
  });

  // Alternative: upload an existing sketch instead of drawing
  document.getElementById("upload-sketch-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      hasDrawing = true;
    };
    img.src = URL.createObjectURL(file);
  });
}

function initVibePicker() {
  document.querySelectorAll(".vibe-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".vibe-option").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedVibe = btn.dataset.vibe;
    });
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * Calls the /api/generate-brand serverless function, which runs
 * server-side on Vercel and holds the Anthropic API key securely
 * (via the ANTHROPIC_API_KEY environment variable). The key never
 * touches this frontend code.
 */
async function generateBrandDirection(imageUrl, vibe) {
  const response = await fetch('/api/generate-brand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, vibe }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Generation failed (status ${response.status})`);
  }

  return response.json();
}

function initGenerateFlow() {
  const generateBtn = document.getElementById("generate-btn");
  const canvas = document.getElementById("doodle-canvas");
  const resultPanel = document.getElementById("dub-result");

  generateBtn.addEventListener("click", async () => {
    if (!hasDrawing) {
      alert("drop a doodle or draw one first.");
      return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "reading ur visual DNA…";

    try {
      const blob = await canvasToBlob(canvas);
      const saved = await saveDoodle(blob, {
        creatorName: "dub tool user",
        category: "organic",
        source: "dub_tool",
      });

      const result = await generateBrandDirection(saved.image_url, selectedVibe);

      resultPanel.innerHTML = `
        <h3>your brand direction</h3>
        <div class="palette-row">
          ${result.palette.map((c) => `<div class="swatch" style="background:${c}"></div>`).join("")}
        </div>
        <p><strong>typeface:</strong> ${result.typeface}</p>
        <p class="result-note">${result.note}</p>
      `;
      resultPanel.classList.add("visible");
    } catch (err) {
      console.error(err);
      alert("something went wrong — check your Supabase config in js/config.js.");
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = "generate";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  initVibePicker();
  initGenerateFlow();
});
