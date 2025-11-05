import { useEffect, useState } from "react";
import { LucideIcon } from "lucide-react";

export type IconLibrary = "lucide" | "heroicons" | "feather" | "material" | "phosphor";

interface IconLibraryStyle {
  strokeWidth: number;
  borderRadius: string;
  fillOpacity: number;
  scale: number;
  className: string;
}

const libraryStyles: Record<IconLibrary, IconLibraryStyle> = {
  lucide: {
    strokeWidth: 2,
    borderRadius: "0",
    fillOpacity: 0,
    scale: 1,
    className: "icon-lucide"
  },
  heroicons: {
    strokeWidth: 1.5,
    borderRadius: "2px",
    fillOpacity: 0,
    scale: 1,
    className: "icon-heroicons"
  },
  feather: {
    strokeWidth: 2,
    borderRadius: "3px",
    fillOpacity: 0,
    scale: 0.95,
    className: "icon-feather"
  },
  material: {
    strokeWidth: 2.5,
    borderRadius: "4px",
    fillOpacity: 0.15,
    scale: 1.05,
    className: "icon-material"
  },
  phosphor: {
    strokeWidth: 1.5,
    borderRadius: "2px",
    fillOpacity: 0.1,
    scale: 1,
    className: "icon-phosphor"
  }
};

export function useIconLibrary() {
  const [library, setLibrary] = useState<IconLibrary>("lucide");
  const [style, setStyle] = useState<IconLibraryStyle>(libraryStyles.lucide);

  useEffect(() => {
    const savedLibrary = localStorage.getItem("icon-library") as IconLibrary;
    if (savedLibrary && libraryStyles[savedLibrary]) {
      setLibrary(savedLibrary);
      setStyle(libraryStyles[savedLibrary]);
      applyLibraryStyle(savedLibrary);
    }

    // Escutar mudanças
    const handleLibraryChange = () => {
      const newLibrary = localStorage.getItem("icon-library") as IconLibrary;
      if (newLibrary && libraryStyles[newLibrary]) {
        setLibrary(newLibrary);
        setStyle(libraryStyles[newLibrary]);
      }
    };

    window.addEventListener('icon-library-changed', handleLibraryChange);
    return () => window.removeEventListener('icon-library-changed', handleLibraryChange);
  }, []);

  const applyLibraryStyle = (lib: IconLibrary) => {
    const style = libraryStyles[lib];
    document.documentElement.style.setProperty("--icon-stroke-width", style.strokeWidth.toString());
    document.documentElement.style.setProperty("--icon-border-radius", style.borderRadius);
    document.documentElement.style.setProperty("--icon-fill-opacity", style.fillOpacity.toString());
    document.documentElement.style.setProperty("--icon-scale", style.scale.toString());
    
    // Remove classes antigas
    document.documentElement.classList.remove(...Object.values(libraryStyles).map(s => s.className));
    // Adiciona nova classe
    document.documentElement.classList.add(style.className);
  };

  const changeLibrary = (newLibrary: IconLibrary) => {
    setLibrary(newLibrary);
    setStyle(libraryStyles[newLibrary]);
    localStorage.setItem("icon-library", newLibrary);
    applyLibraryStyle(newLibrary);
    window.dispatchEvent(new Event('icon-library-changed'));
  };

  const getIconProps = (size: number = 20) => ({
    size,
    strokeWidth: style.strokeWidth,
    fill: style.fillOpacity > 0 ? "currentColor" : "none",
    fillOpacity: style.fillOpacity,
    style: {
      transform: `scale(${style.scale})`,
      borderRadius: style.borderRadius
    },
    className: style.className
  });

  return {
    library,
    style,
    changeLibrary,
    getIconProps,
    availableLibraries: Object.keys(libraryStyles) as IconLibrary[]
  };
}
