import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, TouchableOpacity, View } from "react-native";

import type { EventTeam } from "@/src/types/event";

type EventMarkerProps = {
  team: EventTeam;
  visited: boolean;
  selected: boolean;
  onPress: () => void;
};

export function EventMarker({
  team,
  visited,
  selected,
  onPress,
}: EventMarkerProps) {
  const backgroundColor = visited ? "#18a66f" : "#7046ee";

  return (
    <TouchableOpacity
      accessibilityLabel={`${team.nome}, mesa ${team.mesa}${visited ? ", visitada" : ""}`}
      activeOpacity={0.82}
      onPress={onPress}
      style={{
        alignItems: "center",
        left: `${team.x}%`,
        position: "absolute",
        top: `${team.y}%`,
        transform: [{ translateX: -20 }, { translateY: -20 }],
        zIndex: selected ? 3 : 2,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor,
          borderColor: selected ? "#ffffff" : "#d8ccff",
          borderRadius: 20,
          borderWidth: selected ? 3 : 2,
          elevation: selected ? 9 : 5,
          height: 40,
          justifyContent: "center",
          shadowColor: backgroundColor,
          shadowOpacity: 0.85,
          shadowRadius: 8,
          width: 40,
        }}
      >
        <MaterialIcons
          color="#ffffff"
          name={visited ? "check" : "place"}
          size={visited ? 24 : 25}
        />
      </View>
      <View
        style={{
          backgroundColor: "rgba(5, 4, 28, 0.9)",
          borderRadius: 7,
          marginTop: 3,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        <Text style={{ color: "white", fontSize: 10, fontWeight: "900" }}>
          {team.mesa}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
