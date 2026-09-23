import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { PlaceDetailsCard } from "@/components/tourism/place-details-card";
import { QrScannerModal } from "@/components/tourism/qr-scanner-modal";
import { RoutePointList } from "@/components/tourism/route-point-list";
import { RouteSelector } from "@/components/tourism/route-selector";
import { TourismMap } from "@/components/tourism/tourism-map";
import { useAppTheme } from "@/hooks/use-app-theme";
import { UNIVERSAL_TEST_QR_CODE } from "@/src/constants/project";
import { ROTA_INICIAL, rotasBase } from "@/src/data/routes";
import { auth } from "@/src/firebaseConfig";
import {
  avaliarLocal as salvarAvaliacao,
  carregarDadosDoLocal as buscarDadosDoLocal,
  concederPremioSeRotaCompleta,
  enviarComentario as salvarComentario,
  validarVisita,
} from "@/src/services/tourismService";
import { buscarRotaPorRuas } from "@/src/services/roadRoutingService";
import type { Comentario, Ponto, RotasPorId } from "@/src/types/tourism";
import type { MapCoordinate, TourismMapHandle } from "@/src/types/tourismMap";
import { otimizarPontosPorProximidade } from "@/src/utils/routeOptimization";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const DURACAO_VISITA_MS = 24 * 60 * 60 * 1000;
const VISITAS_STORAGE_PREFIX = "@turismo/visitas-24h";

export default function HomeScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const mapRef = useRef<TourismMapHandle | null>(null);
  const validacaoEmAndamentoRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const rotas: RotasPorId = rotasBase;
  const [rotaAtual, setRotaAtual] = useState<string>(ROTA_INICIAL);
  const [pontoSelecionadoId, setPontoSelecionadoId] = useState<string | null>(
    null
  );
  const [listaAberta, setListaAberta] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(0);
  const [mediaAvaliacoes, setMediaAvaliacoes] = useState(0);
  const [totalAvaliacoes, setTotalAvaliacoes] = useState(0);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [expiracaoPorPonto, setExpiracaoPorPonto] = useState<
    Record<string, number>
  >({});
  const [agora, setAgora] = useState(Date.now());
  const [coordenadasRota, setCoordenadasRota] = useState<MapCoordinate[]>([]);
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(true);

  const rota = rotas[rotaAtual] ?? rotasBase[ROTA_INICIAL];
  const pontosDaRota = rota.pontos;

  const pontosOrdenados = useMemo(
    () => otimizarPontosPorProximidade(pontosDaRota),
    [pontosDaRota]
  );

  const localSelecionado = useMemo(
    () =>
      pontosOrdenados.find((ponto) => ponto.id === pontoSelecionadoId) || null,
    [pontosOrdenados, pontoSelecionadoId]
  );

  const rotaDoMapa = coordenadasRota;
  const mapAppearance = colorScheme === "dark" ? "light" : "dark";
  const locaisVisitados = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(expiracaoPorPonto)
          .filter(([, expiraEm]) => expiraEm > agora)
          .map(([pontoId]) => [pontoId, true])
      ),
    [agora, expiracaoPorPonto]
  );
  const pontosVisitadosEmOrdem = useMemo(
    () =>
      pontosOrdenados
        .filter((ponto) => locaisVisitados[ponto.id])
        .sort(
          (a, b) =>
            expiracaoPorPonto[a.id] - expiracaoPorPonto[b.id]
        ),
    [expiracaoPorPonto, locaisVisitados, pontosOrdenados]
  );
  const assinaturaDoCaminho = pontosVisitadosEmOrdem
    .map((ponto) => `${ponto.id}:${expiracaoPorPonto[ponto.id]}`)
    .join("|");

  const visitasStorageKey = `${VISITAS_STORAGE_PREFIX}:${auth.currentUser?.uid ?? "anonimo"}`;

  const limparDadosLocal = useCallback(() => {
    setPontoSelecionadoId(null);
    setNotaSelecionada(0);
    setMediaAvaliacoes(0);
    setTotalAvaliacoes(0);
    setComentarios([]);
    setNovoComentario("");
    setListaAberta(false);
  }, []);

  const atualizarDadosDoLocal = useCallback(async (placeId: string) => {
    try {
      const dados = await buscarDadosDoLocal(placeId, auth.currentUser?.uid);
      setNotaSelecionada(dados.notaSelecionada);
      setTotalAvaliacoes(dados.totalAvaliacoes);
      setMediaAvaliacoes(dados.mediaAvaliacoes);
      setComentarios(dados.comentarios);
    } catch {
      setNotaSelecionada(0);
      setTotalAvaliacoes(0);
      setMediaAvaliacoes(0);
      setComentarios([]);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    AsyncStorage.getItem(visitasStorageKey)
      .then((valorSalvo) => {
        if (!ativo || !valorSalvo) return;

        const dados = JSON.parse(valorSalvo) as Record<string, unknown>;
        const momentoAtual = Date.now();
        const visitasValidas = Object.fromEntries(
          Object.entries(dados).filter(
            (entrada): entrada is [string, number] =>
              typeof entrada[1] === "number" && entrada[1] > momentoAtual
          )
        );

        setAgora(momentoAtual);
        setExpiracaoPorPonto(visitasValidas);
        void AsyncStorage.setItem(
          visitasStorageKey,
          JSON.stringify(visitasValidas)
        ).catch(() => undefined);
      })
      .catch(() => {
        if (ativo) setExpiracaoPorPonto({});
      });

    return () => {
      ativo = false;
    };
  }, [visitasStorageKey]);

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!rotas[rotaAtual]) {
      setRotaAtual(ROTA_INICIAL);
    }
  }, [rotaAtual, rotas]);

  useEffect(() => {
    limparDadosLocal();
    setCoordenadasRota([]);
  }, [rotaAtual, limparDadosLocal]);

  useEffect(() => {
    let ativo = true;

    if (pontosVisitadosEmOrdem.length < 2) {
      setCoordenadasRota([]);
      setCalculandoRota(false);
      return;
    }

    const coordenadasDosPontos = pontosVisitadosEmOrdem.map((ponto) => ({
      latitude: ponto.latitude,
      longitude: ponto.longitude,
    }));

    setCalculandoRota(true);
    buscarRotaPorRuas(coordenadasDosPontos, "driving")
      .then((caminho) => {
        if (ativo) setCoordenadasRota(caminho);
      })
      .catch(() => {
        if (ativo) setCoordenadasRota(coordenadasDosPontos);
      })
      .finally(() => {
        if (ativo) setCalculandoRota(false);
      });

    return () => {
      ativo = false;
    };
    // A assinatura muda apenas quando um ponto é validado ou expira.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaDoCaminho, rotaAtual]);

  useEffect(() => {
    if (rotaDoMapa.length > 0) {
      mapRef.current?.fitToCoordinates(rotaDoMapa, {
        edgePadding: { top: 140, right: 60, bottom: 120, left: 60 },
        animated: true,
      });
    }
  }, [rotaDoMapa]);

  useEffect(() => {
    if (localSelecionado) {
      void atualizarDadosDoLocal(localSelecionado.id);
    }
  }, [atualizarDadosDoLocal, localSelecionado]);

  const selecionarPonto = useCallback((ponto: Ponto) => {
    setPontoSelecionadoId(ponto.id);
    setListaAberta(false);

    mapRef.current?.animateToRegion(
      {
        latitude: ponto.latitude,
        longitude: ponto.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      800
    );
  }, []);

  const abrirNoMaps = useCallback((lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    void Linking.openURL(url);
  }, []);

  const handleAvaliarLocal = useCallback(
    async (nota: number) => {
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Login necessário", "Você precisa estar logado para avaliar.");
        return;
      }

      if (!localSelecionado) {
        Alert.alert("Selecione um local", "Escolha um ponto no mapa primeiro.");
        return;
      }

      try {
        await salvarAvaliacao(user, rotaAtual, localSelecionado, nota);
        setNotaSelecionada(nota);
        await atualizarDadosDoLocal(localSelecionado.id);
      } catch (error) {
        Alert.alert(
          "Erro ao avaliar",
          getErrorMessage(error, "Não foi possível salvar sua avaliação.")
        );
      }
    },
    [atualizarDadosDoLocal, localSelecionado, rotaAtual]
  );

  const handleEnviarComentario = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Login necessário", "Você precisa estar logado para comentar.");
      return;
    }

    if (!localSelecionado) {
      Alert.alert("Selecione um local", "Escolha um ponto no mapa primeiro.");
      return;
    }

    if (!novoComentario.trim()) {
      Alert.alert("Comentário vazio", "Digite um comentário antes de enviar.");
      return;
    }

    try {
      await salvarComentario(
        user.uid,
        rotaAtual,
        localSelecionado,
        novoComentario.trim()
      );
      setNovoComentario("");
      await atualizarDadosDoLocal(localSelecionado.id);
    } catch (error) {
      Alert.alert(
        "Erro ao comentar",
        getErrorMessage(error, "Não foi possível enviar seu comentário.")
      );
    }
  }, [atualizarDadosDoLocal, localSelecionado, novoComentario, rotaAtual]);

  const abrirScanner = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();

      if (!result.granted) {
        Alert.alert(
          "Permissão negada",
          "Você precisa permitir o uso da câmera para validar a visita."
        );
        return;
      }
    }

    validacaoEmAndamentoRef.current = false;
    setScannerAtivo(true);
    setScannerAberto(true);
  }, [cameraPermission?.granted, requestCameraPermission]);

  const verificarPremioDaRota = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) return;

    await concederPremioSeRotaCompleta(
      user,
      rotaAtual,
      rota
    );
  }, [rota, rotaAtual]);

  const validarQrCode = useCallback(
    async (conteudoQr: string) => {
      if (validacaoEmAndamentoRef.current) return;

      const user = auth.currentUser;
      if (!user) return;

      validacaoEmAndamentoRef.current = true;
      setScannerAtivo(false);
      setScannerAberto(false);

      const qrCodeLido = conteudoQr.trim();
      const pontoIdentificado =
        pontosOrdenados.find((ponto) => ponto.qrCode === qrCodeLido) ??
        (qrCodeLido === UNIVERSAL_TEST_QR_CODE ? localSelecionado : null);

      if (!pontoIdentificado) {
        validacaoEmAndamentoRef.current = false;
        Alert.alert(
          "QR Code inválido",
          qrCodeLido === UNIVERSAL_TEST_QR_CODE
            ? "Selecione um ponto antes de usar o QR universal."
            : "Este QR Code não pertence à rota selecionada."
        );
        return;
      }

      if (locaisVisitados[pontoIdentificado.id]) {
        validacaoEmAndamentoRef.current = false;
        const expiraEm = expiracaoPorPonto[pontoIdentificado.id];
        const minutosRestantes = Math.max(
          1,
          Math.ceil((expiraEm - Date.now()) / 60_000)
        );
        Alert.alert(
          "Local já validado",
          `Este QR Code poderá ser lido novamente em aproximadamente ${minutosRestantes} minutos.`
        );
        return;
      }

      const novaExpiracao = Date.now() + DURACAO_VISITA_MS;
      setAgora(Date.now());
      setExpiracaoPorPonto((visitasAtuais) => {
        const novasVisitas = {
          ...visitasAtuais,
          [pontoIdentificado.id]: novaExpiracao,
        };
        void AsyncStorage.setItem(
          visitasStorageKey,
          JSON.stringify(novasVisitas)
        ).catch(() => undefined);
        return novasVisitas;
      });
      setPontoSelecionadoId(pontoIdentificado.id);

      mapRef.current?.animateToRegion(
        {
          latitude: pontoIdentificado.latitude,
          longitude: pontoIdentificado.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        800
      );

      try {
        await validarVisita(user, rotaAtual, pontoIdentificado);

        await verificarPremioDaRota().catch(() => undefined);
      } catch {
        // O caminho local continua funcionando quando a sincronização falha.
      }

      validacaoEmAndamentoRef.current = false;
    },
    [
      localSelecionado,
      locaisVisitados,
      expiracaoPorPonto,
      pontosOrdenados,
      rotaAtual,
      visitasStorageKey,
      verificarPremioDaRota,
    ]
  );

  return (
    <View style={{ flex: 1 }}>
      <TourismMap
        ref={mapRef}
        mapAppearance={mapAppearance}
        rota={rota}
        rotaAtual={rotaAtual}
        pontos={pontosOrdenados}
        rotaCircular={rotaDoMapa}
        pontoSelecionadoId={pontoSelecionadoId}
        locaisVisitados={locaisVisitados}
        onSelecionarPonto={selecionarPonto}
      />

      <RouteSelector
        rotas={rotas}
        rotaAtual={rotaAtual}
        onChangeRota={setRotaAtual}
      />

      {!localSelecionado && !listaAberta ? (
        <TouchableOpacity
          accessibilityLabel="Explorar o Sapucaí Rotas - Fetin"
          activeOpacity={0.9}
          onPress={() => router.push("/feira")}
          style={{
            backgroundColor: "rgba(20, 12, 62, 0.94)",
            borderColor: "#a98cff",
            borderRadius: 18,
            borderWidth: 1,
            elevation: 6,
            maxWidth: 190,
            padding: 14,
            position: "absolute",
            right: 12,
            top: 50,
          }}
        >
          <Text style={{ color: "#cdbfff", fontSize: 12, fontWeight: "900" }}>
            🎓 Sapucaí Rotas - Fetin
          </Text>
          <Text style={{ color: "white", fontSize: 12, lineHeight: 17, marginTop: 6 }}>
            Visite as equipes e dispute o ranking do dia.
          </Text>
          <Text style={{ color: "#8ff0c0", fontSize: 12, fontWeight: "900", marginTop: 9 }}>
            EXPLORAR →
          </Text>
        </TouchableOpacity>
      ) : null}

      {!localSelecionado && !listaAberta && (
        <TouchableOpacity
          disabled={calculandoRota}
          onPress={abrirScanner}
          style={{
            position: "absolute",
            bottom: 30,
            left: 16,
            backgroundColor: rota.cor,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 24,
            opacity: calculandoRota ? 0.65 : 1,
            elevation: 4,
          }}
        >
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "bold" }}
          >
            {calculandoRota ? "Desenhando caminho..." : "Ler QR Code"}
          </Text>
        </TouchableOpacity>
      )}

      <RoutePointList
        aberta={listaAberta}
        rota={rota}
        pontos={pontosOrdenados}
        pontoSelecionadoId={pontoSelecionadoId}
        locaisVisitados={locaisVisitados}
        onToggle={() => setListaAberta((aberta) => !aberta)}
        onSelecionarPonto={selecionarPonto}
      />

      {localSelecionado && !listaAberta && (
        <PlaceDetailsCard
          local={localSelecionado}
          rota={rota}
          visitado={Boolean(locaisVisitados[localSelecionado.id])}
          notaSelecionada={notaSelecionada}
          mediaAvaliacoes={mediaAvaliacoes}
          totalAvaliacoes={totalAvaliacoes}
          comentarios={comentarios}
          novoComentario={novoComentario}
          onNovoComentarioChange={setNovoComentario}
          onAvaliar={handleAvaliarLocal}
          onEnviarComentario={handleEnviarComentario}
          onAbrirNoMaps={() =>
            abrirNoMaps(localSelecionado.latitude, localSelecionado.longitude)
          }
          onValidarVisita={abrirScanner}
          onClose={() => setPontoSelecionadoId(null)}
        />
      )}

      <QrScannerModal
        visible={scannerAberto}
        cameraPermission={cameraPermission}
        scannerAtivo={scannerAtivo}
        onRequestPermission={requestCameraPermission}
        onQrCodeRead={validarQrCode}
        onClose={() => {
          setScannerAberto(false);
          setScannerAtivo(false);
        }}
      />
    </View>
  );
}
