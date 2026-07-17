import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ativelo",
    short_name: "Ativelo",
    description: "Treinos, evolução e gestão de academias em um só elo.",
    start_url: "/app/inicio",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0f6b5c",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [
      { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/app-icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
