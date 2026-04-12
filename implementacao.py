"""
Mapa Rodoviário - Rio Grande do Norte
Algoritmo de Dijkstra: Mossoró → Praia de Pipa

Grafo extraído do arquivo "grafo com Dijkstra implementado.dot"
  - 27 vértices (cidades)
  - 37 arestas bidirecionais (rodovias com distâncias em km)

Aqui o grafo é representado como lista de adjacência e o Dijkstra
é implementado do zero, usando heap (fila de prioridade).
"""

import heapq

ARESTAS = [
    #caminho mínimo 
    ("Mossoró",      "Assú",           67),
    ("Assú",         "Itajá",          15),
    ("Itajá",        "Lajes",          40),
    ("Lajes",        "Caiçara",        22),
    ("Caiçara",      "Riachuelo",      32),
    ("Riachuelo",    "Santa Maria",    18),
    ("Santa Maria",  "Macaíba",        42),
    ("Macaíba",      "Parnamirim",     13),
    ("Parnamirim",   "São José",       18),
    ("São José",     "Goianinha",      28),
    ("Goianinha",    "Pipa",           25),

    #rotas secudarias
    ("Mossoró",      "Areia Branca",   47),
    ("Mossoró",      "Apodi",         110),
    ("Areia Branca", "Porto do Mangue", 52),
    ("Porto do Mangue", "Macau",       58),
    ("Macau",        "Guamaré",        42),
    ("Guamaré",      "João Câmara",    80),
    ("Assú",         "Angicos",        55),
    ("Angicos",      "Lajes",          30),
    ("Angicos",      "Campo Grande",   78),
    ("Campo Grande", "Caicó",          90),
    ("Lajes",        "João Câmara",    65),
    ("João Câmara",  "Natal",          80),
    ("João Câmara",  "Touros",         75),
    ("João Câmara",  "Ceará Mirim",    42),
    ("Touros",       "Rio do Fogo",    22),
    ("Rio do Fogo",  "Natal",          62),
    ("Ceará Mirim",  "Natal",          44),
    ("Ceará Mirim",  "Macaíba",        35),
    ("Macaíba",      "Natal",          18),
    ("Natal",        "Parnamirim",     15),
    ("São José",     "Nísia Floresta", 10),
    ("Nísia Floresta","Goianinha",     25),
    ("Goianinha",    "Canguaretama",   18),
    ("Canguaretama", "Pipa",           22),
    ("São José",     "Canguaretama",   32),
]


def construir_grafo(arestas: list[tuple]) -> dict:
    """
    Constrói uma lista de adjacência a partir de uma lista de arestas.
    Como as rodovias são de mão dupla, cada aresta vira dois registros.

    Retorna:
        grafo: dict { cidade: [(vizinho, peso), ...] }
    """
    grafo = {}
    for u, v, peso in arestas:
        grafo.setdefault(u, []).append((v, peso))
        grafo.setdefault(v, []).append((u, peso))
    return grafo


#dijkstra

def dijkstra(grafo: dict, origem: str) -> tuple[dict, dict]:
    """
    Algoritmo de Dijkstra com heap mínimo.

    Parâmetros:
        grafo   : lista de adjacência { nó: [(vizinho, peso), ...] }
        origem  : nó de partida

    Retorna:
        dist    : dict {nó: menor distância a partir da origem}
        anterior: dict {nó: nó anterior no caminho mínimo}
    """
    # Distâncias iniciais: infinito para todos, 0 para a origem
    dist = {no: float("inf") for no in grafo}
    dist[origem] = 0

    # anterior[v] = u -> chegamos a v vindo de u no caminho mínimo
    anterior = {no: None for no in grafo}

    # Heap: (distância acumulada, cidade)
    heap = [(0, origem)]

    visitados = set()

    while heap:
        custo_atual, u = heapq.heappop(heap)

        if u in visitados:
            continue
        visitados.add(u)

        for v, peso in grafo.get(u, []):
            novo_custo = custo_atual + peso
            if novo_custo < dist[v]:
                dist[v] = novo_custo
                anterior[v] = u
                heapq.heappush(heap, (novo_custo, v))

    return dist, anterior


def reconstruir_caminho(anterior: dict, destino: str) -> list[str]:
    """
    Reconstrói o caminho mínimo do destino até a origem
    percorrendo o dicionário 'anterior' de trás para frente.
    """
    caminho = []
    no = destino
    while no is not None:
        caminho.append(no)
        no = anterior[no]
    caminho.reverse()
    return caminho


#execucao principal

if __name__ == "__main__":
    ORIGEM  = "Mossoró"
    DESTINO = "Pipa"

    grafo = construir_grafo(ARESTAS)

    print("=" * 60)
    print("  Mapa Rodoviário RN — Algoritmo de Dijkstra")
    print(f"  Origem : {ORIGEM}")
    print(f"  Destino: {DESTINO}")
    print("=" * 60)

    dist, anterior = dijkstra(grafo, ORIGEM)

    caminho = reconstruir_caminho(anterior, DESTINO)

    print(f"\nDistância mínima: {dist[DESTINO]} km\n")
    print("Caminho percorrido:")

    acumulado = 0
    for i, cidade in enumerate(caminho):
        if i == 0:
            print(f"  {cidade} (0 km)")
        else:
            trecho = dist[cidade] - dist[caminho[i - 1]]
            acumulado = dist[cidade]
            print(f"  → {cidade} (+{trecho} km  |  acumulado: {acumulado} km)")

    print("\n" + "=" * 60)
    print("Distâncias de Mossoró para todas as cidades:")
    print("=" * 60)
    for cidade, d in sorted(dist.items(), key=lambda x: x[1]):
        print(f"  {cidade:<22} {d:>5} km")