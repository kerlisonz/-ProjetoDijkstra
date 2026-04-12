"""
Flask backend — Dijkstra RN
Serve a landing page e expõe o algoritmo Python como API REST.
"""

from flask import Flask, jsonify, request, render_template
from implementacao import ARESTAS, construir_grafo, dijkstra, reconstruir_caminho

app = Flask(__name__)

# ------------------------------------------------------------------
# Coordenadas mapeadas pixel a pixel da imagem de referência
# Imagem: ~1024x640px → normalizadas [0..1]
# ------------------------------------------------------------------
COORDS = {
    # Topo
    "Apodi":            (0.05, 0.10),
    "Areia Branca":     (0.20, 0.07),
    "Porto do Mangue":  (0.36, 0.07),
    "Macau":            (0.54, 0.07),
    "Rio do Fogo":      (0.82, 0.07),

    # Segunda faixa
    "Mossoró":          (0.20, 0.24),
    "Guamaré":          (0.46, 0.28),
    "Touros":           (0.64, 0.22),
    "Canguaretama":     (0.84, 0.26),

    # Terceira faixa
    "Assú":             (0.07, 0.36),
    "Itajá":            (0.30, 0.30),
    "João Câmara":      (0.42, 0.42),
    "Natal":            (0.54, 0.42),
    "Parnamirim":       (0.63, 0.48),
    "São José":         (0.74, 0.48),
    "Pipa":             (0.90, 0.48),

    # Quarta faixa
    "Angicos":          (0.19, 0.46),
    "Lajes":            (0.31, 0.50),
    "Ceará Mirim":      (0.42, 0.58),
    "Macaíba":          (0.54, 0.58),

    # Quinta faixa
    "Campo Grande":     (0.06, 0.58),
    "Caiçara":          (0.22, 0.60),
    "Nísia Floresta":   (0.63, 0.70),
    "Goianinha":        (0.79, 0.72),

    # Base
    "Caicó":            (0.06, 0.78),
    "Riachuelo":        (0.22, 0.76),
    "Santa Maria":      (0.38, 0.76),
}

GRAFO = construir_grafo(ARESTAS)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/grafo")
def api_grafo():
    """Retorna todos os nós (com coords) e arestas do grafo."""
    nos = [
        {"id": nome, "x": x, "y": y}
        for nome, (x, y) in COORDS.items()
    ]
    arestas = [
        {"u": u, "v": v, "peso": peso}
        for u, v, peso in ARESTAS
    ]
    return jsonify({"nos": nos, "arestas": arestas})


@app.route("/api/dijkstra", methods=["POST"])
def api_dijkstra():
    """
    Body JSON: { "origem": "Mossoró", "destino": "Pipa" }
    Retorna:   { "distancia": 320, "caminho": [...], "dist_acumulada": {...} }
    """
    body = request.get_json(force=True)
    origem  = body.get("origem", "Mossoró")
    destino = body.get("destino", "Pipa")

    if origem not in GRAFO:
        return jsonify({"erro": f"Cidade '{origem}' não encontrada."}), 400
    if destino not in GRAFO:
        return jsonify({"erro": f"Cidade '{destino}' não encontrada."}), 400

    dist, anterior = dijkstra(GRAFO, origem)
    caminho = reconstruir_caminho(anterior, destino)

    dist_acumulada = {cidade: dist[cidade] for cidade in caminho}

    return jsonify({
        "distancia":      dist[destino],
        "caminho":        caminho,
        "dist_acumulada": dist_acumulada,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
