import type { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { Image, Text, View } from "react-native";

import type { EventRankingItem } from "@/src/types/event";

type EventRankingProps = {
  ranking: EventRankingItem[];
  user: User;
  dark: boolean;
};

const medals = ["🥇", "🥈", "🥉"];

const getUserName = (user: User) =>
  user.displayName?.trim() || user.email?.split("@")[0] || "Visitante";

function EventAvatar({
  item,
  size,
  background,
}: {
  item: EventRankingItem;
  size: number;
  background: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [item.photoURL]);

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: background,
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        overflow: "hidden",
        width: size,
      }}
    >
      {item.photoURL && !imageFailed ? (
        <Image
          onError={() => setImageFailed(true)}
          source={{ uri: item.photoURL }}
          style={{ height: "100%", width: "100%" }}
        />
      ) : (
        <Text style={{ color: "white", fontSize: size * 0.42, fontWeight: "900" }}>
          {(item.userName[0] || "U").toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function RankingRow({
  item,
  position,
  current,
  dark,
}: {
  item: EventRankingItem;
  position: number;
  current: boolean;
  dark: boolean;
}) {
  const podium = position <= 3;
  const backgrounds = dark
    ? ["#332b12", "#24243a", "#342019"]
    : ["#fff7d9", "#f2f1f7", "#fff0e7"];
  const baseCard = dark ? "#12102b" : "#ffffff";
  const currentCard = dark ? "#172f35" : "#e9f9f2";
  const border = current ? "#24b47e" : podium ? "#aa89ff" : dark ? "#332d57" : "#ded8f2";
  const text = dark ? "#f8f5ff" : "#19142d";
  const secondary = dark ? "#b8afd2" : "#665f80";

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: current ? currentCard : podium ? backgrounds[position - 1] : baseCard,
        borderColor: border,
        borderRadius: 16,
        borderWidth: current ? 2 : 1,
        flexDirection: "row",
        gap: 12,
        marginBottom: 10,
        padding: 14,
      }}
    >
      <Text
        style={{
          color: text,
          fontSize: podium ? 28 : 16,
          fontWeight: "900",
          textAlign: "center",
          width: 42,
        }}
      >
        {podium ? medals[position - 1] : `${position}º`}
      </Text>
      <EventAvatar background="#7046ee" item={item} size={50} />
      <View style={{ flex: 1 }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 7 }}>
          <Text numberOfLines={1} style={{ color: text, flexShrink: 1, fontSize: 16, fontWeight: "900" }}>
            {item.userName}
          </Text>
          {current ? (
            <Text style={{ color: "#159363", fontSize: 11, fontWeight: "900" }}>
              VOCÊ
            </Text>
          ) : null}
        </View>
        <Text style={{ color: text, fontSize: 17, fontWeight: "900", marginTop: 4 }}>
          {item.points.toLocaleString("pt-BR")} XP
        </Text>
        <Text style={{ color: secondary, marginTop: 3 }}>
          {item.teamsVisited} {item.teamsVisited === 1 ? "equipe visitada" : "equipes visitadas"}
        </Text>
      </View>
    </View>
  );
}

export function EventRanking({ ranking, user, dark }: EventRankingProps) {
  const text = dark ? "#f8f5ff" : "#19142d";
  const secondary = dark ? "#b8afd2" : "#665f80";
  const currentBackground = dark ? "#172f35" : "#e9f9f2";
  const currentItem = useMemo(() => {
    const saved = ranking.find((item) => item.userId === user.uid);

    return saved
      ? {
          ...saved,
          userName: user.displayName?.trim() || saved.userName,
          photoURL: user.photoURL?.trim() || saved.photoURL,
        }
      : {
          id: user.uid,
          userId: user.uid,
          userName: getUserName(user),
          userEmail: user.email ?? undefined,
          photoURL: user.photoURL ?? undefined,
          points: 0,
          teamsVisited: 0,
        };
  }, [ranking, user]);
  const currentPosition = ranking.findIndex((item) => item.userId === user.uid) + 1;

  return (
    <View>
      <Text style={{ color: text, fontSize: 25, fontWeight: "900", marginBottom: 14 }}>
        🏆 Ranking da Mostra
      </Text>

      <View
        style={{
          backgroundColor: currentBackground,
          borderColor: "#24b47e",
          borderRadius: 18,
          borderWidth: 2,
          marginBottom: 20,
          padding: 15,
        }}
      >
        <Text style={{ color: "#159363", fontSize: 12, fontWeight: "900" }}>
          SUA POSIÇÃO
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12, marginTop: 11 }}>
          <Text style={{ color: text, fontSize: 23, fontWeight: "900" }}>
            {currentPosition > 0 ? `#${currentPosition}` : "#—"}
          </Text>
          <EventAvatar background="#7046ee" item={currentItem} size={50} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: text, fontSize: 16, fontWeight: "900" }}>
              {currentItem.userName}
            </Text>
            <Text style={{ color: text, fontSize: 18, fontWeight: "900", marginTop: 3 }}>
              {currentItem.points.toLocaleString("pt-BR")} XP
            </Text>
            <Text style={{ color: secondary, marginTop: 2 }}>
              {currentItem.teamsVisited} equipes visitadas
            </Text>
          </View>
        </View>
      </View>

      {ranking.length === 0 ? (
        <View
          style={{
            backgroundColor: dark ? "#12102b" : "#ffffff",
            borderColor: dark ? "#332d57" : "#ded8f2",
            borderRadius: 15,
            borderWidth: 1,
            padding: 18,
          }}
        >
          <Text style={{ color: secondary }}>
            Nenhuma visita registrada ainda. Seja o primeiro no ranking!
          </Text>
        </View>
      ) : (
        ranking.map((item, index) => (
          <RankingRow
            current={item.userId === user.uid}
            dark={dark}
            item={item}
            key={item.id}
            position={index + 1}
          />
        ))
      )}
    </View>
  );
}
