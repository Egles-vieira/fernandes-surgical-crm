import { useState, useEffect } from "react";
import { Palette, Check, Upload, Image as ImageIcon, Type, Shapes, LayoutDashboard } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/hooks/useEmpresa";

interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  category: "Profissional" | "Vibrante" | "Neutro" | "Elegante" | "Pastel" | "Tech";
}

interface FontOption {
  name: string;
  family: string;
  category: string;
}

const presetSchemes: ColorScheme[] = [
  {
    name: "Cirúrgica Verde",
    primary: "176 95% 19%",
    secondary: "73 53% 57%",
    accent: "174 37% 38%",
    background: "176 30% 95%",
    category: "Profissional",
  },
  {
    name: "Azul Oceano",
    primary: "210 100% 40%",
    secondary: "195 100% 60%",
    accent: "220 80% 50%",
    background: "210 40% 96%",
    category: "Profissional",
  },
  {
    name: "Roxo Moderno",
    primary: "270 70% 45%",
    secondary: "280 60% 60%",
    accent: "260 65% 50%",
    background: "270 30% 97%",
    category: "Elegante",
  },
  {
    name: "Laranja Energia",
    primary: "25 95% 50%",
    secondary: "40 90% 60%",
    accent: "15 85% 55%",
    background: "30 40% 96%",
    category: "Vibrante",
  },
  {
    name: "Vermelho Intenso",
    primary: "0 80% 45%",
    secondary: "10 75% 60%",
    accent: "355 70% 50%",
    background: "0 30% 97%",
    category: "Vibrante",
  },
  {
    name: "Rosa Profissional",
    primary: "330 75% 45%",
    secondary: "340 70% 65%",
    accent: "320 65% 55%",
    background: "330 30% 97%",
    category: "Profissional",
  },
  {
    name: "Azul Marinho",
    primary: "220 85% 30%",
    secondary: "210 70% 50%",
    accent: "230 75% 40%",
    background: "220 35% 96%",
    category: "Profissional",
  },
  {
    name: "Verde Esmeralda",
    primary: "160 85% 35%",
    secondary: "150 70% 55%",
    accent: "170 75% 45%",
    background: "160 30% 96%",
    category: "Elegante",
  },
  {
    name: "Dourado Premium",
    primary: "45 90% 45%",
    secondary: "50 85% 60%",
    accent: "40 80% 50%",
    background: "48 35% 96%",
    category: "Elegante",
  },
  {
    name: "Ciano Tech",
    primary: "185 85% 40%",
    secondary: "175 75% 60%",
    accent: "195 70% 50%",
    background: "185 30% 97%",
    category: "Profissional",
  },
  {
    name: "Coral Vibrante",
    primary: "15 90% 55%",
    secondary: "25 85% 70%",
    accent: "10 80% 60%",
    background: "18 35% 97%",
    category: "Vibrante",
  },
  {
    name: "Índigo Profundo",
    primary: "240 75% 40%",
    secondary: "250 65% 60%",
    accent: "235 70% 50%",
    background: "240 30% 97%",
    category: "Elegante",
  },
  {
    name: "Turquesa Tropical",
    primary: "175 90% 38%",
    secondary: "170 75% 58%",
    accent: "180 80% 48%",
    background: "175 32% 96%",
    category: "Vibrante",
  },
  {
    name: "Cinza Elegante",
    primary: "215 25% 35%",
    secondary: "210 20% 55%",
    accent: "220 22% 45%",
    background: "210 15% 97%",
    category: "Neutro",
  },
  {
    name: "Verde Menta",
    primary: "155 65% 45%",
    secondary: "145 60% 65%",
    accent: "165 55% 55%",
    background: "155 28% 96%",
    category: "Vibrante",
  },
  {
    name: "Roxo Royal",
    primary: "285 80% 40%",
    secondary: "275 70% 58%",
    accent: "295 75% 48%",
    background: "285 32% 97%",
    category: "Elegante",
  },
  {
    name: "Vinho Sofisticado",
    primary: "345 75% 38%",
    secondary: "355 65% 55%",
    accent: "340 70% 45%",
    background: "345 28% 96%",
    category: "Elegante",
  },
  {
    name: "Pastel Rosa",
    primary: "340 70% 75%",
    secondary: "320 65% 80%",
    accent: "350 60% 70%",
    background: "340 40% 98%",
    category: "Pastel",
  },
  {
    name: "Pastel Azul",
    primary: "210 60% 75%",
    secondary: "200 55% 80%",
    accent: "220 65% 70%",
    background: "210 35% 98%",
    category: "Pastel",
  },
  {
    name: "Pastel Lavanda",
    primary: "270 50% 75%",
    secondary: "280 45% 80%",
    accent: "260 55% 70%",
    background: "270 30% 98%",
    category: "Pastel",
  },
  {
    name: "Pastel Verde",
    primary: "150 50% 70%",
    secondary: "160 45% 75%",
    accent: "140 55% 65%",
    background: "150 30% 98%",
    category: "Pastel",
  },
  {
    name: "Tech Neon Azul",
    primary: "200 100% 50%",
    secondary: "180 95% 55%",
    accent: "210 100% 45%",
    background: "200 20% 10%",
    category: "Tech",
  },
  {
    name: "Tech Neon Verde",
    primary: "150 100% 45%",
    secondary: "165 95% 50%",
    accent: "140 100% 40%",
    background: "150 15% 10%",
    category: "Tech",
  },
  {
    name: "Tech Cyber Rosa",
    primary: "330 100% 55%",
    secondary: "310 95% 60%",
    accent: "340 100% 50%",
    background: "330 15% 10%",
    category: "Tech",
  },
  {
    name: "Terra Natural",
    primary: "35 60% 45%",
    secondary: "25 55% 55%",
    accent: "45 65% 40%",
    background: "35 30% 95%",
    category: "Neutro",
  },
  {
    name: "Floresta Escura",
    primary: "140 45% 35%",
    secondary: "150 40% 45%",
    accent: "130 50% 30%",
    background: "140 25% 96%",
    category: "Neutro",
  },
  {
    name: "Areia do Deserto",
    primary: "40 55% 60%",
    secondary: "45 50% 70%",
    accent: "35 60% 55%",
    background: "40 35% 97%",
    category: "Neutro",
  },
  {
    name: "Oceano Profundo",
    primary: "200 95% 25%",
    secondary: "190 85% 35%",
    accent: "210 90% 30%",
    background: "200 30% 96%",
    category: "Profissional",
  },
  {
    name: "Pôr do Sol",
    primary: "15 90% 60%",
    secondary: "30 85% 65%",
    accent: "5 95% 55%",
    background: "20 40% 97%",
    category: "Vibrante",
  },
  {
    name: "Aurora Boreal",
    primary: "180 85% 50%",
    secondary: "160 80% 55%",
    accent: "190 90% 45%",
    background: "180 30% 97%",
    category: "Elegante",
  },
  {
    name: "Monochrome Preto",
    primary: "0 0% 15%",
    secondary: "0 0% 30%",
    accent: "0 0% 45%",
    background: "0 0% 98%",
    category: "Neutro",
  },
  {
    name: "Violeta Místico",
    primary: "280 85% 45%",
    secondary: "270 75% 55%",
    accent: "290 90% 40%",
    background: "280 30% 97%",
    category: "Elegante",
  },
  {
    name: "Âmbar Quente",
    primary: "38 92% 50%",
    secondary: "45 88% 60%",
    accent: "30 95% 45%",
    background: "40 35% 97%",
    category: "Vibrante",
  },
  {
    name: "Tech Roxo",
    primary: "270 100% 60%",
    secondary: "280 95% 65%",
    accent: "260 100% 55%",
    background: "270 15% 10%",
    category: "Tech",
  },
  {
    name: "Pastel Pêssego",
    primary: "20 80% 75%",
    secondary: "30 75% 80%",
    accent: "15 85% 70%",
    background: "25 40% 98%",
    category: "Pastel",
  },
  {
    name: "Safira Profunda",
    primary: "220 90% 35%",
    secondary: "210 85% 45%",
    accent: "230 85% 40%",
    background: "220 30% 96%",
    category: "Profissional",
  },
  {
    name: "Limão Neon",
    primary: "65 100% 50%",
    secondary: "75 95% 55%",
    accent: "60 100% 45%",
    background: "70 20% 97%",
    category: "Vibrante",
  },
];

const categories = ["Todos", "Profissional", "Vibrante", "Neutro", "Elegante", "Pastel", "Tech"] as const;

const radiusPresets = [
  { name: "Nenhum", value: "0rem", description: "Sem arredondamento" },
  { name: "Suave", value: "0.375rem", description: "Levemente arredondado" },
  { name: "Médio", value: "0.75rem", description: "Arredondamento padrão" },
  { name: "Alto", value: "1.5rem", description: "Muito arredondado" },
];

const borderPresets = [
  { name: "Fina", value: "1px", description: "Borda sutil e discreta" },
  { name: "Normal", value: "2px", description: "Borda padrão" },
  { name: "Média", value: "3px", description: "Borda destacada" },
  { name: "Grossa", value: "4px", description: "Borda proeminente" },
];

const shadowPresets = [
  { name: "Nenhuma", value: "none", description: "Sem sombra", preview: "0 0 0 transparent" },
  { name: "Suave", value: "sm", description: "Sombra leve e sutil", preview: "0 1px 2px rgba(0,0,0,0.05)" },
  { name: "Média", value: "md", description: "Sombra moderada", preview: "0 4px 6px rgba(0,0,0,0.1)" },
  { name: "Forte", value: "lg", description: "Sombra pronunciada", preview: "0 10px 15px rgba(0,0,0,0.15)" },
  { name: "Extra", value: "xl", description: "Sombra muito intensa", preview: "0 20px 25px rgba(0,0,0,0.2)" },
];

const fontOptions: FontOption[] = [
  // Modernas
  { name: "Inter (Padrão)", family: "Inter", category: "sans-serif" },
  { name: "Poppins", family: "Poppins", category: "sans-serif" },
  { name: "Montserrat", family: "Montserrat", category: "sans-serif" },
  { name: "Space Grotesk", family: "Space Grotesk", category: "sans-serif" },
  { name: "Plus Jakarta Sans", family: "Plus Jakarta Sans", category: "sans-serif" },
  { name: "DM Sans", family: "DM Sans", category: "sans-serif" },
  { name: "Manrope", family: "Manrope", category: "sans-serif" },
  { name: "Urbanist", family: "Urbanist", category: "sans-serif" },
  { name: "Outfit", family: "Outfit", category: "sans-serif" },
  { name: "Sora", family: "Sora", category: "sans-serif" },
  { name: "League Spartan", family: "League Spartan", category: "sans-serif" },
  { name: "Lexend", family: "Lexend", category: "sans-serif" },
  { name: "IBM Plex Sans", family: "IBM Plex Sans", category: "sans-serif" },
  { name: "Red Hat Display", family: "Red Hat Display", category: "sans-serif" },
  { name: "Quicksand", family: "Quicksand", category: "sans-serif" },
  { name: "Rubik", family: "Rubik", category: "sans-serif" },
  { name: "Archivo", family: "Archivo", category: "sans-serif" },
  { name: "Karla", family: "Karla", category: "sans-serif" },
  { name: "Raleway", family: "Raleway", category: "sans-serif" },
  { name: "Nunito", family: "Nunito", category: "sans-serif" },
  { name: "Work Sans", family: "Work Sans", category: "sans-serif" },
  
  // Clássicas
  { name: "Roboto", family: "Roboto", category: "serif" },
  { name: "Open Sans", family: "Open Sans", category: "serif" },
  { name: "Lato", family: "Lato", category: "serif" },
  { name: "Playfair Display", family: "Playfair Display", category: "serif" },
  { name: "Merriweather", family: "Merriweather", category: "serif" },
  { name: "Lora", family: "Lora", category: "serif" },
  { name: "PT Serif", family: "PT Serif", category: "serif" },
  { name: "Crimson Text", family: "Crimson Text", category: "serif" },
  
  // Monoespaçadas
  { name: "Source Code Pro", family: "Source Code Pro", category: "monospace" },
  { name: "JetBrains Mono", family: "JetBrains Mono", category: "monospace" },
  { name: "Fira Code", family: "Fira Code", category: "monospace" },
];

const fontCategories = {
  modernas: fontOptions.filter(f => f.category === "sans-serif"),
  classicas: fontOptions.filter(f => f.category === "serif"),
  monoespacadas: fontOptions.filter(f => f.category === "monospace"),
};

interface IconStrokeStyle {
  name: string;
  value: string;
  description: string;
  strokeWidth: number;
  example: string;
}

interface IconVisualStyle {
  name: string;
  value: string;
  description: string;
  borderRadius: string;
  fillOpacity: number;
}

const iconStrokeStyles: IconStrokeStyle[] = [
  { 
    name: "Padrão", 
    value: "default", 
    description: "Estilo equilibrado, ideal para uso geral",
    strokeWidth: 2,
    example: "Lucide Icons padrão"
  },
  { 
    name: "Fino", 
    value: "thin", 
    description: "Ícones delicados e minimalistas",
    strokeWidth: 1.5,
    example: "Estilo leve e elegante"
  },
  { 
    name: "Grosso", 
    value: "thick", 
    description: "Ícones fortes e destacados",
    strokeWidth: 2.5,
    example: "Máxima visibilidade"
  },
  { 
    name: "Muito Grosso", 
    value: "bold", 
    description: "Ícones robustos e chamativos",
    strokeWidth: 3,
    example: "Estilo bold e impactante"
  },
];

const iconVisualStyles: IconVisualStyle[] = [
  {
    name: "Padrão (Lucide)",
    value: "lucide",
    description: "Ícones lineares clássicos do Lucide",
    borderRadius: "0",
    fillOpacity: 0
  },
  {
    name: "Arredondado",
    value: "rounded",
    description: "Ícones com cantos suavemente arredondados",
    borderRadius: "4px",
    fillOpacity: 0
  },
  {
    name: "Circular",
    value: "circular",
    description: "Ícones com máximo arredondamento",
    borderRadius: "50%",
    fillOpacity: 0
  },
  {
    name: "Preenchido",
    value: "filled",
    description: "Ícones com preenchimento sólido",
    borderRadius: "0",
    fillOpacity: 1
  },
  {
    name: "Suave",
    value: "soft",
    description: "Ícones com preenchimento suave e translúcido",
    borderRadius: "2px",
    fillOpacity: 0.2
  },
];

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("colors");
  const [colorTab, setColorTab] = useState("presets");
  const [fontTab, setFontTab] = useState("modernas");
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>("Todos");
  const [customColors, setCustomColors] = useState({
    primary: "#045c53",
    secondary: "#aacb55",
    accent: "#3e867f",
    background: "#f0f9f7",
  });
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [selectedRadius, setSelectedRadius] = useState("0.75rem");
  const [selectedBorder, setSelectedBorder] = useState("2px");
  const [menuColors, setMenuColors] = useState({
    background: "#47ccd8",
    icon: "#ffffff",
    text: "#ffffff",
  });
  const [menuPreviewCollapsed, setMenuPreviewCollapsed] = useState(false);
  const [selectedShadow, setSelectedShadow] = useState("md");
  const [selectedIconStroke, setSelectedIconStroke] = useState("default");
  const [selectedIconVisual, setSelectedIconVisual] = useState("lucide");
  const { empresa, uploadLogo, isUploading } = useEmpresa();

  const filteredSchemes = selectedCategory === "Todos" 
    ? presetSchemes 
    : presetSchemes.filter(scheme => scheme.category === selectedCategory);

  useEffect(() => {
    const saved = localStorage.getItem("theme-colors");
    if (saved) {
      const colors = JSON.parse(saved);
      setCustomColors(colors);
      applyColors(colors);
    }

    const savedFont = localStorage.getItem("theme-font");
    if (savedFont) {
      setSelectedFont(savedFont);
      applyFont(savedFont);
    }

    const savedRadius = localStorage.getItem("theme-radius");
    if (savedRadius) {
      setSelectedRadius(savedRadius);
      applyRadius(savedRadius);
    }

    const savedBorder = localStorage.getItem("theme-border");
    if (savedBorder) {
      setSelectedBorder(savedBorder);
      applyBorder(savedBorder);
    }

    const savedShadow = localStorage.getItem("theme-shadow");
    if (savedShadow) {
      setSelectedShadow(savedShadow);
      applyShadow(savedShadow);
    }

    const savedIconStroke = localStorage.getItem("theme-icon-stroke");
    if (savedIconStroke) {
      setSelectedIconStroke(savedIconStroke);
      applyIconStroke(savedIconStroke);
    }

    const savedIconVisual = localStorage.getItem("theme-icon-visual");
    if (savedIconVisual) {
      setSelectedIconVisual(savedIconVisual);
      applyIconVisual(savedIconVisual);
    }

    const savedMenuColors = localStorage.getItem("theme-menu-colors");
    if (savedMenuColors) {
      const colors = JSON.parse(savedMenuColors);
      setMenuColors(colors);
      applyMenuColors(colors);
    }
  }, []);

  const hexToHSL = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "0 0% 0%";

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const applyColors = (colors: typeof customColors) => {
    const root = document.documentElement;
    root.style.setProperty("--primary", hexToHSL(colors.primary));
    root.style.setProperty("--secondary", hexToHSL(colors.secondary));
    root.style.setProperty("--accent", hexToHSL(colors.accent));
    root.style.setProperty("--background", hexToHSL(colors.background));
    root.style.setProperty("--ring", hexToHSL(colors.primary));
    
    // Update gradients
    const primaryHSL = hexToHSL(colors.primary);
    const accentHSL = hexToHSL(colors.accent);
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${accentHSL}))`
    );
  };

  const handlePresetClick = (scheme: ColorScheme) => {
    const hslToHex = (h: number, s: number, l: number): string => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    const parseHSL = (hsl: string) => {
      const parts = hsl.split(' ');
      return {
        h: parseInt(parts[0]),
        s: parseInt(parts[1]),
        l: parseInt(parts[2])
      };
    };

    const primary = parseHSL(scheme.primary);
    const secondary = parseHSL(scheme.secondary);
    const accent = parseHSL(scheme.accent);

    const background = parseHSL(scheme.background);

    const newColors = {
      primary: hslToHex(primary.h, primary.s, primary.l),
      secondary: hslToHex(secondary.h, secondary.s, secondary.l),
      accent: hslToHex(accent.h, accent.s, accent.l),
      background: hslToHex(background.h, background.s, background.l),
    };

    setCustomColors(newColors);
    applyColors(newColors);
    localStorage.setItem("theme-colors", JSON.stringify(newColors));
  };

  const handleColorChange = (color: keyof typeof customColors, value: string) => {
    const newColors = { ...customColors, [color]: value };
    setCustomColors(newColors);
    applyColors(newColors);
    localStorage.setItem("theme-colors", JSON.stringify(newColors));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>, tipo: 'fechado' | 'aberto') => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo({ file, tipo });
    }
  };

  const applyFont = (fontFamily: string) => {
    // Remove fonte anterior do head
    const existingLink = document.getElementById("custom-font-link");
    if (existingLink) {
      existingLink.remove();
    }

    // Adiciona nova fonte do Google Fonts
    if (fontFamily !== "Inter") {
      const link = document.createElement("link");
      link.id = "custom-font-link";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }

    // Aplica a fonte no body
    document.body.style.fontFamily = `"${fontFamily}", system-ui, -apple-system, sans-serif`;
  };

  const handleFontChange = (fontFamily: string) => {
    setSelectedFont(fontFamily);
    applyFont(fontFamily);
    localStorage.setItem("theme-font", fontFamily);
  };

  const applyRadius = (radius: string) => {
    document.documentElement.style.setProperty("--radius", radius);
  };

  const handleRadiusChange = (radius: string) => {
    setSelectedRadius(radius);
    applyRadius(radius);
    localStorage.setItem("theme-radius", radius);
  };

  const applyBorder = (border: string) => {
    document.documentElement.style.setProperty("--border-width", border);
  };

  const handleBorderChange = (border: string) => {
    setSelectedBorder(border);
    applyBorder(border);
    localStorage.setItem("theme-border", border);
  };

  const applyShadow = (shadow: string) => {
    const shadowMap: Record<string, string> = {
      none: "none",
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.1)",
      lg: "0 10px 15px rgba(0,0,0,0.15)",
      xl: "0 20px 25px rgba(0,0,0,0.2)",
    };
    document.documentElement.style.setProperty("--shadow-default", shadowMap[shadow] || shadowMap.md);
  };

  const handleShadowChange = (shadow: string) => {
    setSelectedShadow(shadow);
    applyShadow(shadow);
    localStorage.setItem("theme-shadow", shadow);
  };

  const applyIconStroke = (style: string) => {
    const iconStyle = iconStrokeStyles.find(s => s.value === style);
    if (iconStyle) {
      document.documentElement.style.setProperty("--icon-stroke-width", iconStyle.strokeWidth.toString());
    }
  };

  const handleIconStrokeChange = (style: string) => {
    setSelectedIconStroke(style);
    applyIconStroke(style);
    localStorage.setItem("theme-icon-stroke", style);
    window.dispatchEvent(new Event('icon-style-changed'));
  };

  const applyIconVisual = (style: string) => {
    const visualStyle = iconVisualStyles.find(s => s.value === style);
    if (visualStyle) {
      document.documentElement.style.setProperty("--icon-border-radius", visualStyle.borderRadius);
      document.documentElement.style.setProperty("--icon-fill-opacity", visualStyle.fillOpacity.toString());
    }
  };

  const handleIconVisualChange = (style: string) => {
    setSelectedIconVisual(style);
    applyIconVisual(style);
    localStorage.setItem("theme-icon-visual", style);
    window.dispatchEvent(new Event('icon-style-changed'));
  };

  const applyMenuColors = (colors: typeof menuColors) => {
    const root = document.documentElement;
    root.style.setProperty("--menu-background", hexToHSL(colors.background));
    root.style.setProperty("--menu-icon", hexToHSL(colors.icon));
    root.style.setProperty("--menu-text", hexToHSL(colors.text));
  };

  const handleMenuColorChange = (color: keyof typeof menuColors, value: string) => {
    const newColors = { ...menuColors, [color]: value };
    setMenuColors(newColors);
    applyMenuColors(newColors);
    localStorage.setItem("theme-menu-colors", JSON.stringify(newColors));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" title="Personalizar Cores">
          <Palette size={18} />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Personalizar Cores do Sistema</SheetTitle>
          <SheetDescription>
            Escolha um tema predefinido ou personalize as cores manualmente
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="presets" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="presets">Temas</TabsTrigger>
            <TabsTrigger value="custom">Cores</TabsTrigger>
            <TabsTrigger value="fonts">Fontes</TabsTrigger>
            <TabsTrigger value="icons">Ícones</TabsTrigger>
            <TabsTrigger value="styles">Estilos</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {filteredSchemes.map((scheme) => (
                <button
                  key={scheme.name}
                  onClick={() => handlePresetClick(scheme)}
                  className="relative p-4 border-2 rounded-lg hover:border-primary transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">{scheme.name}</span>
                    <Check className="opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="h-8 flex-1 rounded"
                      style={{ backgroundColor: `hsl(${scheme.primary})` }}
                    />
                    <div
                      className="h-8 flex-1 rounded"
                      style={{ backgroundColor: `hsl(${scheme.secondary})` }}
                    />
                    <div
                      className="h-8 flex-1 rounded"
                      style={{ backgroundColor: `hsl(${scheme.accent})` }}
                    />
                    <div
                      className="h-8 flex-1 rounded"
                      style={{ backgroundColor: `hsl(${scheme.background})` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="primary">Cor Primária</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="primary"
                    type="color"
                    value={customColors.primary}
                    onChange={(e) => handleColorChange("primary", e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.primary}
                    onChange={(e) => handleColorChange("primary", e.target.value)}
                    className="flex-1"
                    placeholder="#045c53"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="secondary">Cor Secundária</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="secondary"
                    type="color"
                    value={customColors.secondary}
                    onChange={(e) => handleColorChange("secondary", e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.secondary}
                    onChange={(e) => handleColorChange("secondary", e.target.value)}
                    className="flex-1"
                    placeholder="#aacb55"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="accent">Cor de Destaque</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="accent"
                    type="color"
                    value={customColors.accent}
                    onChange={(e) => handleColorChange("accent", e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.accent}
                    onChange={(e) => handleColorChange("accent", e.target.value)}
                    className="flex-1"
                    placeholder="#3e867f"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="background">Cor de Fundo</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="background"
                    type="color"
                    value={customColors.background}
                    onChange={(e) => handleColorChange("background", e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColors.background}
                    onChange={(e) => handleColorChange("background", e.target.value)}
                    className="flex-1"
                    placeholder="#f0f9f7"
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-3">Prévia das Cores</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: customColors.primary }}
                    >
                      Primária
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: customColors.secondary }}
                    >
                      Secundária
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: customColors.accent }}
                    >
                      Destaque
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: customColors.background, color: customColors.primary }}
                    >
                      Fundo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-4">
            <Tabs defaultValue="modernas" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="modernas">Modernas</TabsTrigger>
                <TabsTrigger value="classicas">Clássicas</TabsTrigger>
                <TabsTrigger value="monoespacadas">Monoespaçadas</TabsTrigger>
              </TabsList>

              <TabsContent value="modernas" className="space-y-3 max-h-[400px] overflow-y-auto pr-2 mt-4">
                {fontCategories.modernas.map((font) => (
                  <button
                    key={font.family}
                    onClick={() => handleFontChange(font.family)}
                    className={`w-full p-4 border-2 rounded-lg hover:border-primary transition-all text-left ${
                      selectedFont === font.family ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{font.name}</span>
                      {selectedFont === font.family && (
                        <Check className="text-primary" size={16} />
                      )}
                    </div>
                    <p
                      className="text-base"
                      style={{ fontFamily: `"${font.family}", ${font.category}` }}
                    >
                      The quick brown fox jumps over the lazy dog
                    </p>
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      style={{ fontFamily: `"${font.family}", ${font.category}` }}
                    >
                      0123456789 - ABCDEFGabcdefg
                    </p>
                  </button>
                ))}
              </TabsContent>

              <TabsContent value="classicas" className="space-y-3 max-h-[400px] overflow-y-auto pr-2 mt-4">
                {fontCategories.classicas.map((font) => (
                  <button
                    key={font.family}
                    onClick={() => handleFontChange(font.family)}
                    className={`w-full p-4 border-2 rounded-lg hover:border-primary transition-all text-left ${
                      selectedFont === font.family ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{font.name}</span>
                      {selectedFont === font.family && (
                        <Check className="text-primary" size={16} />
                      )}
                    </div>
                    <p
                      className="text-base"
                      style={{ fontFamily: `"${font.family}", ${font.category}` }}
                    >
                      The quick brown fox jumps over the lazy dog
                    </p>
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      style={{ fontFamily: `"${font.family}", ${font.category}` }}
                    >
                      0123456789 - ABCDEFGabcdefg
                    </p>
                  </button>
                ))}
              </TabsContent>

              <TabsContent value="monoespacadas" className="space-y-3 max-h-[400px] overflow-y-auto pr-2 mt-4">
                {fontCategories.monoespacadas.map((font) => (
                  <button
                    key={font.family}
                    onClick={() => handleFontChange(font.family)}
                    className={`w-full p-4 border-2 rounded-lg hover:border-primary transition-all text-left ${
                      selectedFont === font.family ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{font.name}</span>
                      {selectedFont === font.family && (
                        <Check className="text-primary" size={16} />
                      )}
                    </div>
                    <p
                      className="text-base"
                      style={{ fontFamily: `"${font.family}", ${font.category}` }}
                    >
                      The quick brown fox jumps over the lazy dog
                    </p>
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      style={{ fontFamily: `"${font.family}", ${font.category}` }}
                    >
                      0123456789 - ABCDEFGabcdefg
                    </p>
                  </button>
                ))}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="icons" className="space-y-6">
            {/* Estilo Visual */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Shapes className="w-5 h-5" />
                  Estilo Visual dos Ícones
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escolha o tipo visual dos ícones
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {iconVisualStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => handleIconVisualChange(style.value)}
                    className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                      selectedIconVisual === style.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2 items-center">
                          <div 
                            className="p-2 bg-primary/10 transition-all"
                            style={{ 
                              borderRadius: style.borderRadius,
                            }}
                          >
                            <Check 
                              className="text-primary" 
                              size={20} 
                              strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                              fill={style.fillOpacity > 0 ? "currentColor" : "none"}
                              fillOpacity={style.fillOpacity}
                            />
                          </div>
                          <div 
                            className="p-2 bg-primary/10 transition-all"
                            style={{ 
                              borderRadius: style.borderRadius,
                            }}
                          >
                            <Palette 
                              className="text-primary" 
                              size={20} 
                              strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                              fill={style.fillOpacity > 0 ? "currentColor" : "none"}
                              fillOpacity={style.fillOpacity}
                            />
                          </div>
                          <div 
                            className="p-2 bg-primary/10 transition-all"
                            style={{ 
                              borderRadius: style.borderRadius,
                            }}
                          >
                            <Upload 
                              className="text-primary" 
                              size={20} 
                              strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                              fill={style.fillOpacity > 0 ? "currentColor" : "none"}
                              fillOpacity={style.fillOpacity}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="font-medium block">{style.name}</span>
                          <span className="text-xs text-muted-foreground">{style.description}</span>
                        </div>
                      </div>
                      {selectedIconVisual === style.value && (
                        <Check className="text-primary" size={20} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Espessura */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Espessura dos Ícones</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajuste a espessura das linhas dos ícones
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {iconStrokeStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => handleIconStrokeChange(style.value)}
                    className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                      selectedIconStroke === style.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          <Check className="text-primary" size={20} strokeWidth={style.strokeWidth} />
                          <Palette className="text-primary" size={20} strokeWidth={style.strokeWidth} />
                          <Upload className="text-primary" size={20} strokeWidth={style.strokeWidth} />
                        </div>
                        <div>
                          <span className="font-medium block">{style.name}</span>
                          <span className="text-xs text-muted-foreground">{style.example}</span>
                        </div>
                      </div>
                      {selectedIconStroke === style.value && (
                        <Check className="text-primary" size={20} strokeWidth={style.strokeWidth} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prévia Completa */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <p className="text-sm font-medium">Prévia Combinada (Visual + Espessura)</p>
              <div className="flex gap-4 items-center justify-center p-6 bg-background rounded">
                <div 
                  className="p-3 bg-primary/10 transition-all"
                  style={{ 
                    borderRadius: iconVisualStyles.find(s => s.value === selectedIconVisual)?.borderRadius,
                  }}
                >
                  <Palette 
                    size={28} 
                    strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                    fill={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity ? "currentColor" : "none"}
                    fillOpacity={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity}
                    className="text-primary"
                  />
                </div>
                <div 
                  className="p-3 bg-primary/10 transition-all"
                  style={{ 
                    borderRadius: iconVisualStyles.find(s => s.value === selectedIconVisual)?.borderRadius,
                  }}
                >
                  <Type 
                    size={28} 
                    strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                    fill={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity ? "currentColor" : "none"}
                    fillOpacity={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity}
                    className="text-primary"
                  />
                </div>
                <div 
                  className="p-3 bg-primary/10 transition-all"
                  style={{ 
                    borderRadius: iconVisualStyles.find(s => s.value === selectedIconVisual)?.borderRadius,
                  }}
                >
                  <Upload 
                    size={28} 
                    strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                    fill={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity ? "currentColor" : "none"}
                    fillOpacity={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity}
                    className="text-primary"
                  />
                </div>
                <div 
                  className="p-3 bg-primary/10 transition-all"
                  style={{ 
                    borderRadius: iconVisualStyles.find(s => s.value === selectedIconVisual)?.borderRadius,
                  }}
                >
                  <ImageIcon 
                    size={28} 
                    strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                    fill={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity ? "currentColor" : "none"}
                    fillOpacity={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity}
                    className="text-primary"
                  />
                </div>
                <div 
                  className="p-3 bg-primary/10 transition-all"
                  style={{ 
                    borderRadius: iconVisualStyles.find(s => s.value === selectedIconVisual)?.borderRadius,
                  }}
                >
                  <Check 
                    size={28} 
                    strokeWidth={iconStrokeStyles.find(s => s.value === selectedIconStroke)?.strokeWidth}
                    fill={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity ? "currentColor" : "none"}
                    fillOpacity={iconVisualStyles.find(s => s.value === selectedIconVisual)?.fillOpacity}
                    className="text-primary"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="styles" className="space-y-4">
            <div className="space-y-8">
              {/* Arredondamento */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Arredondamento dos Componentes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escolha o nível de arredondamento aplicado globalmente aos botões, cards e outros componentes
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {radiusPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleRadiusChange(preset.value)}
                      className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                        selectedRadius === preset.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{preset.name}</span>
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                        </div>
                        {selectedRadius === preset.value && (
                          <Check className="text-primary" size={20} />
                        )}
                      </div>
                      
                      {/* Preview visual do arredondamento */}
                      <div className="flex gap-3 mt-3">
                        <div 
                          className="w-16 h-16 bg-primary"
                          style={{ borderRadius: preset.value }}
                        />
                        <div 
                          className="w-24 h-16 bg-secondary flex items-center justify-center text-xs text-white font-medium"
                          style={{ borderRadius: preset.value }}
                        >
                          Preview
                        </div>
                        <div 
                          className="flex-1 h-16 bg-accent"
                          style={{ borderRadius: preset.value }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Espessura da Borda */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Espessura das Bordas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Defina a espessura padrão das bordas dos componentes
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {borderPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleBorderChange(preset.value)}
                      className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                        selectedBorder === preset.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{preset.name}</span>
                          <p className="text-xs text-muted-foreground">{preset.description}</p>
                        </div>
                        {selectedBorder === preset.value && (
                          <Check className="text-primary" size={18} />
                        )}
                      </div>
                      
                      {/* Preview visual da borda */}
                      <div 
                        className="w-full h-12 bg-background border-primary rounded-md"
                        style={{ borderWidth: preset.value }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Sombras */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Sombras dos Componentes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escolha a intensidade das sombras aplicadas aos cards e elementos elevados
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {shadowPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleShadowChange(preset.value)}
                      className={`relative p-4 border-2 rounded-lg transition-all text-left ${
                        selectedShadow === preset.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{preset.name}</span>
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                        </div>
                        {selectedShadow === preset.value && (
                          <Check className="text-primary" size={20} />
                        )}
                      </div>
                      
                      {/* Preview visual da sombra */}
                      <div className="flex gap-3 mt-3">
                        <div 
                          className="w-20 h-20 bg-white rounded-lg border"
                          style={{ boxShadow: preset.preview }}
                        />
                        <div 
                          className="flex-1 h-20 bg-card rounded-lg border flex items-center justify-center text-sm font-medium"
                          style={{ boxShadow: preset.preview }}
                        >
                          Card Preview
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Personalizar Menu Lateral</h3>
              <p className="text-sm text-muted-foreground">
                Customize as cores do menu lateral (ícones, texto e fundo)
              </p>

              {/* Controles de Cor */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="menu-background">Cor de Fundo do Menu</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="menu-background"
                      type="color"
                      value={menuColors.background}
                      onChange={(e) => handleMenuColorChange("background", e.target.value)}
                      className="w-20 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={menuColors.background}
                      onChange={(e) => handleMenuColorChange("background", e.target.value)}
                      className="flex-1"
                      placeholder="#47ccd8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="menu-icon">Cor dos Ícones</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="menu-icon"
                      type="color"
                      value={menuColors.icon}
                      onChange={(e) => handleMenuColorChange("icon", e.target.value)}
                      className="w-20 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={menuColors.icon}
                      onChange={(e) => handleMenuColorChange("icon", e.target.value)}
                      className="flex-1"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="menu-text">Cor do Texto</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="menu-text"
                      type="color"
                      value={menuColors.text}
                      onChange={(e) => handleMenuColorChange("text", e.target.value)}
                      className="w-20 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={menuColors.text}
                      onChange={(e) => handleMenuColorChange("text", e.target.value)}
                      className="flex-1"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* Preview do Menu */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Preview do Menu</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={!menuPreviewCollapsed ? "default" : "outline"}
                      onClick={() => setMenuPreviewCollapsed(false)}
                    >
                      Aberto
                    </Button>
                    <Button
                      size="sm"
                      variant={menuPreviewCollapsed ? "default" : "outline"}
                      onClick={() => setMenuPreviewCollapsed(true)}
                    >
                      Fechado
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex gap-4">
                    {/* Preview Menu */}
                    <div
                      className={`${menuPreviewCollapsed ? "w-16" : "w-56"} transition-all duration-300 rounded-lg overflow-hidden shadow-lg`}
                      style={{
                        backgroundColor: menuColors.background,
                        color: menuColors.text,
                      }}
                    >
                      {/* Header */}
                      <div className="p-3 border-b border-white/10 h-16 flex items-center justify-center">
                        {menuPreviewCollapsed ? (
                          <div className="w-8 h-8 bg-white/20 rounded"></div>
                        ) : (
                          <div className="w-32 h-6 bg-white/20 rounded"></div>
                        )}
                      </div>

                      {/* Menu Items */}
                      <div className="p-2 space-y-1">
                        {[1, 2, 3, 4].map((item) => (
                          <div
                            key={item}
                            className={`${
                              menuPreviewCollapsed
                                ? "flex flex-col items-center py-3 px-1"
                                : "flex items-center gap-2 px-3 py-2"
                            } rounded-lg transition-all`}
                            style={{
                              backgroundColor: item === 1 ? "rgba(255,255,255,0.2)" : "transparent",
                            }}
                          >
                            <LayoutDashboard
                              size={menuPreviewCollapsed ? 20 : 18}
                              style={{ color: menuColors.icon }}
                            />
                            {!menuPreviewCollapsed && (
                              <span className="text-sm font-medium" style={{ color: menuColors.text }}>
                                Item {item}
                              </span>
                            )}
                            {menuPreviewCollapsed && (
                              <span
                                className="text-[9px] text-center mt-1"
                                style={{ color: menuColors.text }}
                              >
                                Item
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Descrição */}
                    <div className="flex-1 flex items-center justify-center text-center p-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {menuPreviewCollapsed ? "Menu Fechado (Compacto)" : "Menu Aberto (Expandido)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Alterne entre os estados para ver como as cores ficam em cada modo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logo" className="space-y-4">
            <div className="space-y-6">
              {/* Logo para menu fechado */}
              <div className="space-y-2">
                <Label htmlFor="logo-fechado">Logo para Menu Fechado (Ícone)</Label>
                <p className="text-sm text-muted-foreground">
                  Logo quadrado ou ícone exibido quando o menu está recolhido
                </p>
                
                {empresa?.url_logo && (
                  <div className="mb-3 p-4 border rounded-lg bg-muted/30">
                    <p className="text-xs font-medium mb-2">Preview - Menu Fechado:</p>
                    <div className="flex items-center gap-4">
                      <img 
                        src={empresa.url_logo} 
                        alt="Logo menu fechado" 
                        className="h-12 w-12 object-contain bg-white p-2 rounded-lg border"
                      />
                      <div className="text-xs text-muted-foreground">
                        <p>Usado como favicon e ícone do menu</p>
                      </div>
                    </div>
                  </div>
                )}

                <Input
                  id="logo-fechado"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'fechado')}
                  disabled={isUploading}
                />
              </div>

              {/* Logo para menu aberto */}
              <div className="space-y-2">
                <Label htmlFor="logo-aberto">Logo para Menu Aberto (Completo)</Label>
                <p className="text-sm text-muted-foreground">
                  Logo horizontal exibido quando o menu está expandido
                </p>
                
                {empresa?.url_logo_expandido && (
                  <div className="mb-3 p-4 border rounded-lg bg-muted/30">
                    <p className="text-xs font-medium mb-2">Preview - Menu Aberto:</p>
                    <div className="flex items-center gap-4">
                      <img 
                        src={empresa.url_logo_expandido} 
                        alt="Logo menu aberto" 
                        className="h-10 w-auto max-w-[200px] object-contain bg-white p-2 rounded border"
                      />
                      <div className="text-xs text-muted-foreground">
                        <p>Logo completo exibido no menu expandido</p>
                      </div>
                    </div>
                  </div>
                )}

                <Input
                  id="logo-aberto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'aberto')}
                  disabled={isUploading}
                />
              </div>

              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <p className="font-medium mb-1">📌 Dica:</p>
                <p>• Para menu fechado: use um ícone/logo quadrado (ideal 512x512px)</p>
                <p>• Para menu aberto: use um logo horizontal/retangular</p>
                <p>• Formatos aceitos: PNG, JPG, WEBP (máx. 2MB)</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
