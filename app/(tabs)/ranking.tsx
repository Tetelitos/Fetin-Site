import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { EventRanking } from "@/src/components/event/EventRanking";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { observarRankingEvento } from "@/src/services/eventService";
import type { EventRankingItem } from "@/src/types/event";

export default function EventRankingTab() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const { user, loading } = useAuthUser();
  const [ranking, setRanking] = useState<EventRankingItem[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    return observarRankingEvento(setRanking, () => setRanking([]));
  }, [user]);

  if (loading || !user) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colorScheme === "dark" ? "#070618" : "#f3f1ff",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#7046ee" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, paddingBottom: 36, paddingTop: 28 }}
      style={{
        backgroundColor: colorScheme === "dark" ? "#070618" : "#f3f1ff",
        flex: 1,
      }}
    >
      <EventRanking
        dark={colorScheme === "dark"}
        ranking={ranking}
        user={user}
      />
    </ScrollView>
  );
}
