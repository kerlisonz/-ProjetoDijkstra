/* ===============================================================
   app.js — Dijkstra RN · Frontend Interativo
   =============================================================== */

const SVG_W = 1400;
const SVG_H = 900;
const PAD   = 80;

let grafoData    = null;
let ultimoResult = null;

// Raios dos nós — menores para não sobrepor
const R = { default: 18, path: 28, main: 36 };

// Nomes abreviados para nós menores (fora do círculo)
const ABBREV = {
  "Areia Branca":    "A. Branca",
  "Porto do Mangue": "P. Mangue",
  "Rio do Fogo":     "R. do Fogo",
  "Campo Grande":    "C. Grande",
  "João Câmara":     "J. Câmara",
  "Ceará Mirim":     "C. Mirim",
  "Nísia Floresta":  "N. Floresta",
  "Canguaretama":    "Canguaret.",
  "Santa Maria":     "Sta. Maria",
};
function abbrev(id) { return ABBREV[id] || id; }

// Nomes completos para nós grandes (dentro do círculo) — com quebra de linha
// Valores estáticos do caminho padrão Mossoró→Pipa
const LABEL_LINES = {
  "Mossoró":     ["Mossoró", "(0 km)"],
  "Pipa":        ["Pipa", "(320 km)"],
  "Assú":        ["Assú", "(67 km)"],
  "Itajá":       ["Itajá", "(82 km)"],
  "Lajes":       ["Lajes", "(122 km)"],
  "Caiçara":     ["Caiçara", "(144 km)"],
  "Riachuelo":   ["Riachuelo", "(176 km)"],
  "Santa Maria": ["Sta. Maria", "(194 km)"],
  "Macaíba":     ["Macaíba", "(236 km)"],
  "Parnamirim":  ["Parnamirim", "(249 km)"],
  "São José":    ["São José", "(267 km)"],
  "Goianinha":   ["Goianinha", "(295 km)"],
};

/* ── Inicialização ─────────────────────────────────────────── */
async function init() {
  const res = await fetch("/api/grafo");
  grafoData = await res.json();
  popularSelects();
  renderGrafo();
  initZoom();
  setupNav();
  document.getElementById("btn-run").addEventListener("click", rodarDijkstra);
  document.getElementById("btn-swap").addEventListener("click", trocarCidades);
}

/* ── Popula selects ────────────────────────────────────────── */
function popularSelects() {
  const selO = document.getElementById("select-origem");
  const selD = document.getElementById("select-destino");
  const cidades = grafoData.nos.map(n => n.id).sort((a, b) => a.localeCompare(b, "pt-BR"));
  cidades.forEach(c => {
    selO.add(new Option(c, c));
    selD.add(new Option(c, c));
  });
  selO.value = "Mossoró";
  selD.value = "Pipa";
}

/* ── Troca origem e destino ────────────────────────────────── */
function trocarCidades() {
  const selO = document.getElementById("select-origem");
  const selD = document.getElementById("select-destino");
  [selO.value, selD.value] = [selD.value, selO.value];
  renderGrafo(ultimoResult);
}

/* ── Coordenadas SVG ───────────────────────────────────────── */
function toSVG(x, y) {
  return {
    px: PAD + x * (SVG_W - 2 * PAD),
    py: PAD + y * (SVG_H - 2 * PAD),
  };
}
function buildNodeMap() {
  const m = {};
  grafoData.nos.forEach(n => { m[n.id] = toSVG(n.x, n.y); });
  return m;
}

/* ── Renderiza o grafo ─────────────────────────────────────── */
function renderGrafo(resultado = null) {
  const svg     = document.getElementById("graph-svg");
  const nodeMap = buildNodeMap();

  const pathSet   = new Set();
  const pathNodes = new Set();
  if (resultado) {
    const cam = resultado.caminho;
    for (let i = 0; i < cam.length - 1; i++) pathSet.add(edgeKey(cam[i], cam[i + 1]));
    cam.forEach(c => pathNodes.add(c));
  }

  const origem  = document.getElementById("select-origem").value;
  const destino = document.getElementById("select-destino").value;

  /* ── Defs ── */
  const defs = `<defs>
    <marker id="arr-def" viewBox="0 -4 8 8" refX="8" refY="0"
            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0,-4L8,0L0,4" fill="rgba(150,150,150,0.6)"/>
    </marker>
    <marker id="arr-path" viewBox="0 -5 10 10" refX="10" refY="0"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,-5L10,0L0,5" fill="#D85A30"/>
    </marker>
    <filter id="lbl-bg" x="-20%" y="-30%" width="140%" height="160%">
      <feFlood flood-color="var(--bg-graph)" flood-opacity="0.75" result="bg"/>
      <feMerge><feMergeNode in="bg"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  const gEdgesBg   = svgEl("g");
  const gEdgesPath = svgEl("g");
  const gNodes     = svgEl("g");

  /* ── Arestas ── */
  grafoData.arestas.forEach(({ u, v, peso }) => {
    const A = nodeMap[u]; const B = nodeMap[v];
    if (!A || !B) return;

    const key = edgeKey(u, v);
    const isP = pathSet.has(key);

    const rA  = nodeRadius(u, origem, destino, pathNodes);
    const rB  = nodeRadius(v, origem, destino, pathNodes);
    const dx  = B.px - A.px;
    const dy  = B.py - A.py;
    const len = Math.hypot(dx, dy) || 1;
    const ux  = dx / len; const uy = dy / len;

    const x1 = A.px + ux * (rA + 2);
    const y1 = A.py + uy * (rA + 2);
    const x2 = B.px - ux * (rB + 2);
    const y2 = B.py - uy * (rB + 2);

    const line = svgEl("line", {
      x1, y1, x2, y2,
      class: isP ? "edge edge-path" : "edge",
      "marker-end":   isP ? "url(#arr-path)" : "url(#arr-def)",
      "marker-start": isP ? "url(#arr-path)" : "url(#arr-def)",
    });

    if (isP) {
      const segLen = Math.hypot(x2 - x1, y2 - y1);
      line.style.strokeDasharray  = segLen;
      line.style.strokeDashoffset = segLen;
    }

    isP ? gEdgesPath.appendChild(line) : gEdgesBg.appendChild(line);

    /* Label da aresta — com fundo para não sobrepor linhas */
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    // Offset perpendicular pequeno para afastar da linha
    const angle   = Math.atan2(dy, dx);
    const offDist = 11;
    const ox = -Math.sin(angle) * offDist;
    const oy =  Math.cos(angle) * offDist;

    const lbl = svgEl("text", {
      x: mx + ox,
      y: my + oy,
      class: isP ? "edge-label edge-label-path" : "edge-label",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      filter: "url(#lbl-bg)",
    });
    lbl.textContent = `${peso} km`;
    gEdgesBg.appendChild(lbl);
  });

  /* ── Nós ── */
  grafoData.nos.forEach(({ id }) => {
    const { px, py } = nodeMap[id];
    const r = nodeRadius(id, origem, destino, pathNodes);

    let role = "default";
    if (id === origem)          role = "origin";
    else if (id === destino)    role = "dest";
    else if (id === "Natal")    role = "natal";
    else if (pathNodes.has(id)) role = "path";

    const g    = svgEl("g", { class: `node node-${role}` });
    const circ = svgEl("circle", { cx: px, cy: py, r, class: "node-circle" });

    if (role === "path") {
      const order = resultado?.caminho.indexOf(id) ?? 0;
      circ.style.animationDelay = `${order * 0.12}s`;
    }

    g.appendChild(circ);

    const isLarge = (role !== "default");

    if (isLarge) {
      // Gera linhas dinamicamente: nome + km acumulado se disponível
      let lines;
      if (role === "natal") {
        lines = ["Natal"];
      } else if (resultado?.dist_acumulada?.[id] !== undefined) {
        lines = [abbrev(id), `(${resultado.dist_acumulada[id]} km)`];
      } else {
        lines = LABEL_LINES[id] || [abbrev(id)];
      }

      const lineH  = 13;
      const totalH = lines.length * lineH;
      const startY = py - totalH / 2 + lineH / 2;

      lines.forEach((line, i) => {
        const t = svgEl("text", {
          x: px,
          y: startY + i * lineH,
          class: i === 0 ? "node-name node-name-main" : "node-name node-name-km",
          "text-anchor": "middle",
          "dominant-baseline": "middle",
        });
        t.textContent = line;
        g.appendChild(t);
      });
    } else {
      /* Nós pequenos: nome abaixo do círculo com fundo */
      const t = svgEl("text", {
        x: px,
        y: py + r + 13,
        class: "node-name node-name-outside",
        "text-anchor": "middle",
        "dominant-baseline": "hanging",
        filter: "url(#lbl-bg)",
      });
      t.textContent = abbrev(id);
      g.appendChild(t);
    }

    gNodes.appendChild(g);
  });

  const root = getZoomRoot();
  root.innerHTML = defs;
  root.appendChild(gEdgesBg);
  root.appendChild(gEdgesPath);
  root.appendChild(gNodes);

  /* Anima arestas do caminho em sequência */
  if (resultado) {
    [...gEdgesPath.querySelectorAll("line.edge-path")].forEach((line, i) => {
      line.style.animationDelay    = `${i * 0.35}s`;
      line.style.animationDuration = "0.7s";
    });
  }
}

/* ── Raio do nó conforme papel ─────────────────────────────── */
function nodeRadius(id, origem, destino, pathNodes) {
  if (id === origem || id === destino) return R.main;
  if (pathNodes.has(id)) return R.path;
  if (id === "Natal") return R.path; // Natal tem tamanho médio sempre
  return R.default;
}

/* ── API Dijkstra ──────────────────────────────────────────── */
async function rodarDijkstra() {
  const origem  = document.getElementById("select-origem").value;
  const destino = document.getElementById("select-destino").value;
  if (origem === destino) { alert("Origem e destino não podem ser iguais."); return; }

  const btn     = document.getElementById("btn-run");
  const loading = document.getElementById("loading");
  btn.disabled  = true;
  loading.classList.add("active");

  try {
    const res = await fetch("/api/dijkstra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origem, destino }),
    });
    const data = await res.json();
    if (data.erro) { alert(data.erro); return; }
    ultimoResult = data;
    renderGrafo(data);
  } catch (e) {
    alert("Erro ao comunicar com o servidor.");
    console.error(e);
  } finally {
    btn.disabled = false;
    loading.classList.remove("active");
  }
}

/* ── Helpers ───────────────────────────────────────────────── */
function edgeKey(u, v) { return [u, v].sort().join("||"); }
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
function setupNav() {
  const sidebar = document.querySelector(".sidebar");

  // Gera URL do GraphvizOnline com o .dot atual
  const DOT_CONTENT = `digraph RN {

    layout      = neato;
    overlap     = false;
    splines     = true;
    sep         = "+18";
    outputorder = edgesfirst;

    graph [
        label     = "Mapa Rodoviário RN — Mossoró → Praia de Pipa\\nDijkstra: 320 km  |  Google Maps BR-304: 332 km  |  27 cidades  |  37 arestas",
        fontname  = "Helvetica",
        fontsize  = 12,
        fontcolor = "#333333",
        bgcolor   = "#F8F7F4",
        labelloc  = "t"
    ];

    node [
        shape     = circle,
        style     = "filled,setlinewidth(1.2)",
        width     = 0.85,
        height    = 0.85,
        fixedsize = true,
        fontname  = "Helvetica",
        fontsize  = 8,
        fontcolor = "#333333",
        fillcolor = "#D3D1C7",
        color     = "#888780"
    ];

    edge [
        fontname  = "Helvetica",
        fontsize  = 7,
        fontcolor = "#777777",
        color     = "#BBBBBB",
        penwidth  = 1.2,
        dir       = both,
        arrowsize = 0.45
    ];

    Mossoro [label = "Mossoró\\n(0 km)", fillcolor = "#378ADD", fontcolor = "#FFFFFF", color = "#185FA5", width = 1.15, height = 1.15, fontsize = 9, penwidth = 2.8, pos = "3.20,6.84!"];
    Pipa [label = "Praia de Pipa\\n(320 km)", fillcolor = "#D85A30", fontcolor = "#FFFFFF", color = "#993C1D", width = 1.15, height = 1.15, fontsize = 8, penwidth = 2.8, pos = "14.40,4.68!"];
    Natal [label = "Natal", fillcolor = "#B5D4F4", fontcolor = "#0C447C", color = "#185FA5", width = 1.0, height = 1.0, fontsize = 9, penwidth = 2.0, pos = "8.64,5.22!"];
    Assu [label = "Assú\\n(67 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "1.12,5.76!"];
    Itaja [label = "Itajá\\n(82 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "4.80,6.30!"];
    Lajes [label = "Lajes\\n(122 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "4.96,4.50!"];
    Caicara [label = "Caiçara\\n(144 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "3.52,3.60!"];
    Riachuelo [label = "Riachuelo\\n(176 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "3.52,2.16!"];
    SantaMaria [label = "Sta. Maria\\n(194 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "6.08,2.16!"];
    Macaiba [label = "Macaíba\\n(236 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "8.64,3.78!"];
    Parnamirim [label = "Parnamirim\\n(249 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "10.08,4.68!"];
    SaoJose [label = "São José\\n(267 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "11.84,4.68!"];
    Goianinha [label = "Goianinha\\n(295 km)", fillcolor = "#EF9F27", color = "#BA7517", fontcolor = "#412402", penwidth = 2.0, pos = "12.64,2.52!"];
    Apodi [label = "Apodi", pos = "0.80,8.10!"];
    AreiaBranca [label = "Areia\\nBranca", pos = "3.20,8.37!"];
    PortoMangue [label = "Porto do\\nMangue", pos = "5.76,8.37!"];
    Macau [label = "Macau", pos = "8.64,8.37!"];
    RioFogo [label = "Rio do\\nFogo", pos = "13.12,8.37!"];
    Guamare [label = "Guamaré", pos = "7.36,6.48!"];
    Touros [label = "Touros", pos = "10.24,7.02!"];
    Canguaretama [label = "Canguare-\\ntama", pos = "13.44,6.66!"];
    Angicos [label = "Angicos", pos = "3.04,4.86!"];
    JoaoCamara [label = "João\\nCâmara", pos = "6.72,5.22!"];
    CampoGrande [label = "Campo\\nGrande", pos = "0.96,3.78!"];
    CearaMirim [label = "Ceará\\nMirim", pos = "6.72,3.78!"];
    Nisia [label = "Nísia\\nFloresta", pos = "10.08,2.70!"];
    Caico [label = "Caicó", pos = "0.96,1.98!"];

    Mossoro -> Assu [label = "67 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Assu -> Itaja [label = "15 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Itaja -> Lajes [label = "40 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Lajes -> Caicara [label = "22 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Caicara -> Riachuelo [label = "32 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Riachuelo -> SantaMaria [label = "18 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    SantaMaria -> Macaiba [label = "42 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Macaiba -> Parnamirim [label = "13 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Parnamirim -> SaoJose [label = "18 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    SaoJose -> Goianinha [label = "28 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Goianinha -> Pipa [label = "25 km", color = "#D85A30", penwidth = 4.5, fontcolor = "#7A2810", fontsize = 8];
    Mossoro -> AreiaBranca [label = "47 km"];
    Mossoro -> Apodi [label = "110 km"];
    AreiaBranca -> PortoMangue [label = "52 km"];
    PortoMangue -> Macau [label = "58 km"];
    Macau -> Guamare [label = "42 km"];
    Guamare -> JoaoCamara [label = "80 km"];
    Assu -> Angicos [label = "55 km"];
    Angicos -> Lajes [label = "30 km"];
    Angicos -> CampoGrande [label = "78 km"];
    CampoGrande -> Caico [label = "90 km"];
    Lajes -> JoaoCamara [label = "65 km"];
    JoaoCamara -> Natal [label = "80 km"];
    JoaoCamara -> Touros [label = "75 km"];
    JoaoCamara -> CearaMirim [label = "42 km"];
    Touros -> RioFogo [label = "22 km"];
    RioFogo -> Natal [label = "62 km"];
    CearaMirim -> Natal [label = "44 km"];
    CearaMirim -> Macaiba [label = "35 km"];
    Macaiba -> Natal [label = "18 km"];
    Natal -> Parnamirim [label = "15 km"];
    SaoJose -> Nisia [label = "10 km"];
    Nisia -> Goianinha [label = "25 km"];
    Goianinha -> Canguaretama [label = "18 km"];
    Canguaretama -> Pipa [label = "22 km"];
    SaoJose -> Canguaretama [label = "32 km"];
}`;

  const graphvizURL = "https://dreampuf.github.io/GraphvizOnline/?engine=neato#" + encodeURIComponent(DOT_CONTENT);
  const btnGraphviz = document.getElementById("btn-graphviz-open");
  if (btnGraphviz) btnGraphviz.href = graphvizURL;

  // Navegação dos botões inferiores
  document.querySelectorAll(".slide-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.slide;
      const leaving = document.querySelector(".slide.active")?.id;

      // Ao sair do slide do grafo: reseta o grafo
      if (leaving === "slide-grafo" && target !== "slide-grafo") {
        ultimoResult = null;
        _zoom = { scale: 1, tx: 0, ty: 0 };
        applyZoom();
        renderGrafo(null);
        sidebar.classList.add("sidebar-hidden");
      }

      // Ao voltar para o slide do grafo: mostra a sidebar
      if (target === "slide-grafo") {
        sidebar.classList.remove("sidebar-hidden");
      }

      document.querySelectorAll(".slide").forEach(s => s.classList.remove("active"));
      document.querySelectorAll(".slide-nav-btn").forEach(b => b.classList.remove("active"));
      document.getElementById(target).classList.add("active");
      btn.classList.add("active");
    });
  });
}

/* ── Zoom & Pan ────────────────────────────────────────────── */
let _zoom = { scale: 1, tx: 0, ty: 0 };

function getZoomRoot() {
  const svg = document.getElementById("graph-svg");
  let root = svg.querySelector("g.zoom-root");
  if (!root) {
    root = document.createElementNS("http://www.w3.org/2000/svg", "g");
    root.setAttribute("class", "zoom-root");
    svg.appendChild(root);
  }
  return root;
}

function applyZoom() {
  const root = getZoomRoot();
  root.setAttribute("transform",
    `translate(${_zoom.tx},${_zoom.ty}) scale(${_zoom.scale})`);
}

function initZoom() {
  const svg = document.getElementById("graph-svg");
  let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;

  // Scroll = zoom centrado no cursor
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const rect   = svg.getBoundingClientRect();
    const vb     = svg.viewBox.baseVal;
    const ratioX = vb.width  / rect.width;
    const ratioY = vb.height / rect.height;
    const cx = (e.clientX - rect.left) * ratioX;
    const cy = (e.clientY - rect.top)  * ratioY;

    const factor   = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.min(Math.max(_zoom.scale * factor, 0.25), 8);

    _zoom.tx = cx - (cx - _zoom.tx) * (newScale / _zoom.scale);
    _zoom.ty = cy - (cy - _zoom.ty) * (newScale / _zoom.scale);
    _zoom.scale = newScale;
    applyZoom();
  }, { passive: false });

  // Drag = pan
  svg.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startTx = _zoom.tx; startTy = _zoom.ty;
    svg.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    const rect   = svg.getBoundingClientRect();
    const vb     = svg.viewBox.baseVal;
    const ratioX = vb.width  / rect.width;
    const ratioY = vb.height / rect.height;
    _zoom.tx = startTx + (e.clientX - startX) * ratioX;
    _zoom.ty = startTy + (e.clientY - startY) * ratioY;
    applyZoom();
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    svg.style.cursor = "grab";
  });

  // Botão reset
  document.getElementById("btn-zoom-reset")?.addEventListener("click", () => {
    _zoom = { scale: 1, tx: 0, ty: 0 };
    applyZoom();
  });

  svg.style.cursor = "grab";
}

/* ── Theme Toggle ──────────────────────────────────────────── */
function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  const icon   = document.getElementById("theme-icon");
  const html   = document.documentElement;

  const saved = localStorage.getItem("theme") || "light";
  html.setAttribute("data-theme", saved);
  icon.textContent = saved === "dark" ? "☀️" : "🌙";

  toggle.addEventListener("click", () => {
    const cur = html.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    icon.textContent = next === "dark" ? "☀️" : "🌙";
  });
}

init();
initTheme();
