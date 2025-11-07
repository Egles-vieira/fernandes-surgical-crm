import { useState, useEffect } from "react";
import { Check, Upload, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmpresa } from "@/hooks/useEmpresa";
import { useThemeConfig } from "@/hooks/useThemeConfig";

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
];

const categories = ["Todos", "Profissional", "Vibrante", "Neutro", "Elegante", "Pastel"] as const;

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
  { name: "Inter (Padrão)", family: "Inter", category: "modernas" },
  { name: "Poppins", family: "Poppins", category: "modernas" },
  { name: "Montserrat", family: "Montserrat", category: "modernas" },
  { name: "Roboto", family: "Roboto", category: "classicas" },
  { name: "Open Sans", family: "Open Sans", category: "classicas" },
];

export function PersonalizarCores() {
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
  const [selectedShadow, setSelectedShadow] = useState("md");
  const [menuColors, setMenuColors] = useState({
    background: "#47ccd8",
    icon: "#ffffff",
    text: "#ffffff",
  });
  
  const { empresa, uploadLogo, isUploading } = useEmpresa();
  const { themeConfig, updateThemeConfig, isLoading: isLoadingTheme } = useThemeConfig();

  const filteredSchemes = selectedCategory === "Todos" 
    ? presetSchemes 
    : presetSchemes.filter(scheme => scheme.category === selectedCategory);

  // Carregar configurações do banco de dados
  useEffect(() => {
    if (isLoadingTheme) return;
    
    if (themeConfig.colors) {
      setCustomColors(themeConfig.colors);
      applyColors(themeConfig.colors);
    }

    if (themeConfig.font) {
      setSelectedFont(themeConfig.font);
      applyFont(themeConfig.font);
    }

    if (themeConfig.radius) {
      setSelectedRadius(themeConfig.radius);
      applyRadius(themeConfig.radius);
    }

    if (themeConfig.border) {
      setSelectedBorder(themeConfig.border);
      applyBorder(themeConfig.border);
    }

    if (themeConfig.shadow) {
      setSelectedShadow(themeConfig.shadow);
      applyShadow(themeConfig.shadow);
    }

    if (themeConfig.menuColors) {
      setMenuColors(themeConfig.menuColors);
      applyMenuColors(themeConfig.menuColors);
    }
  }, [themeConfig, isLoadingTheme]);

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
    updateThemeConfig({ colors: newColors });
  };

  const handleColorChange = (color: keyof typeof customColors, value: string) => {
    const newColors = { ...customColors, [color]: value };
    setCustomColors(newColors);
    applyColors(newColors);
    updateThemeConfig({ colors: newColors });
  };

  const applyFont = (fontFamily: string) => {
    const existingLink = document.getElementById("custom-font-link");
    if (existingLink) {
      existingLink.remove();
    }

    if (fontFamily !== "Inter") {
      const link = document.createElement("link");
      link.id = "custom-font-link";
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }

    document.body.style.fontFamily = `"${fontFamily}", system-ui, -apple-system, sans-serif`;
  };

  const handleFontChange = (fontFamily: string) => {
    setSelectedFont(fontFamily);
    applyFont(fontFamily);
    updateThemeConfig({ font: fontFamily });
  };

  const applyRadius = (radius: string) => {
    document.documentElement.style.setProperty("--radius", radius);
  };

  const handleRadiusChange = (radius: string) => {
    setSelectedRadius(radius);
    applyRadius(radius);
    updateThemeConfig({ radius });
  };

  const applyBorder = (border: string) => {
    document.documentElement.style.setProperty("--border-width", border);
  };

  const handleBorderChange = (border: string) => {
    setSelectedBorder(border);
    applyBorder(border);
    updateThemeConfig({ border });
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
    updateThemeConfig({ shadow });
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
    updateThemeConfig({ menuColors: newColors });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>, tipo: 'fechado' | 'aberto') => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo({ file, tipo });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Personalizar Cores</h2>
          <p className="text-sm text-muted-foreground">
            Personalize as cores, fontes e estilos do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="presets">Temas</TabsTrigger>
          <TabsTrigger value="custom">Cores</TabsTrigger>
          <TabsTrigger value="fonts">Fontes</TabsTrigger>
          <TabsTrigger value="styles">Estilos</TabsTrigger>
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
          <div className="space-y-4">
            <Label>Selecione uma Fonte</Label>
            <div className="grid grid-cols-2 gap-3">
              {fontOptions.map((font) => (
                <Button
                  key={font.family}
                  variant={selectedFont === font.family ? "default" : "outline"}
                  className="h-auto py-4"
                  onClick={() => handleFontChange(font.family)}
                  style={{ fontFamily: font.family }}
                >
                  {font.name}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="styles" className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Arredondamento</Label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {radiusPresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedRadius === preset.value ? "default" : "outline"}
                  onClick={() => handleRadiusChange(preset.value)}
                  className="h-auto flex-col items-start p-4"
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Espessura da Borda</Label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {borderPresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedBorder === preset.value ? "default" : "outline"}
                  onClick={() => handleBorderChange(preset.value)}
                  className="h-auto flex-col items-start p-4"
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Sombra</Label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {shadowPresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedShadow === preset.value ? "default" : "outline"}
                  onClick={() => handleShadowChange(preset.value)}
                  className="h-auto flex-col items-start p-4"
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs text-muted-foreground">{preset.description}</span>
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4">
          <div className="space-y-6">
            <div>
              <Label htmlFor="logo-fechado" className="text-base font-semibold">
                Logo Menu Fechado
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Logo exibida quando o menu lateral está recolhido
              </p>
              <div className="flex items-center gap-4">
                {empresa?.url_logo && (
                  <img
                    src={empresa.url_logo}
                    alt="Logo Fechado"
                    className="h-12 w-12 object-contain border rounded"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id="logo-fechado"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'fechado')}
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="logo-aberto" className="text-base font-semibold">
                Logo Menu Aberto
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Logo exibida quando o menu lateral está expandido
              </p>
              <div className="flex items-center gap-4">
                {empresa?.url_logo_expandido && (
                  <img
                    src={empresa.url_logo_expandido}
                    alt="Logo Aberto"
                    className="h-12 object-contain border rounded"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id="logo-aberto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'aberto')}
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
