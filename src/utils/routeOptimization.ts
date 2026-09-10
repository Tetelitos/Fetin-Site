import type { Ponto } from "@/src/types/tourism";

export const calcularDistancia = (a: Ponto, b: Ponto) => {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const otimizarPontosPorProximidade = (pontos: Ponto[]) => {
  if (pontos.length <= 2) return pontos;

  const restantes = [...pontos];
  const primeiroPonto = restantes.shift();

  if (!primeiroPonto) return [];

  const ordenados = [primeiroPonto];

  while (restantes.length > 0) {
    const atual = ordenados[ordenados.length - 1];

    let menorIndice = 0;
    let menorDistancia = calcularDistancia(atual, restantes[0]);

    restantes.forEach((ponto, index) => {
      const distancia = calcularDistancia(atual, ponto);

      if (distancia < menorDistancia) {
        menorIndice = index;
        menorDistancia = distancia;
      }
    });

    const proximo = restantes.splice(menorIndice, 1)[0];
    ordenados.push(proximo);
  }

  return ordenados;
};

export const criarCaminhoAberto = (pontos: Ponto[]) => {
  return pontos.map((ponto) => ({
    latitude: ponto.latitude,
    longitude: ponto.longitude,
  }));
};
