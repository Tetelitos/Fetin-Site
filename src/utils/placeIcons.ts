import type { TipoPonto } from "@/src/types/tourism";

export const getIconePonto = (tipo: TipoPonto) => {
  switch (tipo) {
    case "cafe":
      return "☕";
    case "religioso":
      return "⛪";
    case "tecnologia":
      return "💻";
    case "gastronomia":
      return "🍔";
    default:
      return "📍";
  }
};
