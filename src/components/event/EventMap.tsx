import { Image, ScrollView, View } from "react-native";

import { EventMarker } from "@/src/components/event/EventMarker";
import type { EventBuilding, EventFloor, EventTeam } from "@/src/types/event";

type EventMapProps = {
  building: EventBuilding;
  floor: EventFloor;
  teams: EventTeam[];
  visitedTeamIds: Set<string>;
  selectedTeamId?: string | null;
  onSelectTeam: (team: EventTeam) => void;
};

const EVENT_MAPS = {
  "predio-2": require("../../../assets/feira/predio-2.png"),
  "predio-3": require("../../../assets/feira/predio-3.png"),
  "predio-4-terreo": require("../../../assets/feira/predio-4-terreo.png"),
  "predio-4-primeiro-piso": require("../../../assets/feira/predio-4-primeiro-piso.png"),
} as const;

const getMapKey = (building: EventBuilding, floor: EventFloor) => {
  if (building !== "predio-4") return building;
  return floor === "primeiro-piso"
    ? "predio-4-primeiro-piso"
    : "predio-4-terreo";
};

export function EventMap({
  building,
  floor,
  teams,
  visitedTeamIds,
  selectedTeamId,
  onSelectTeam,
}: EventMapProps) {
  const mapSource = EVENT_MAPS[getMapKey(building, floor)];

  return (
    <View
      style={{
        backgroundColor: "#09072a",
        borderColor: "#8f6cff",
        borderRadius: 18,
        borderWidth: 1,
        overflow: "hidden",
      }}
    >
      <ScrollView
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ minWidth: "100%" }}
      >
        <View style={{ aspectRatio: 16 / 9, minWidth: 760, width: "100%" }}>
          <Image
            accessibilityLabel="Planta interna do Sapucaí Rotas - Fetin"
            resizeMode="contain"
            source={mapSource}
            style={{ height: "100%", width: "100%" }}
          />
          {teams.map((team) => (
            <EventMarker
              key={team.id}
              onPress={() => onSelectTeam(team)}
              selected={team.id === selectedTeamId}
              team={team}
              visited={visitedTeamIds.has(team.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
