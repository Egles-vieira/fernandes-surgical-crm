import { useState, useEffect } from "react";
import { Palette, Check, Upload, Image as ImageIcon, Type } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  },
  {
    name: "Azul Oceano",
    primary: "210 100% 40%",
    secondary: "195 100% 60%",
    accent: "220 80% 50%",
  },
  {
    name: "Roxo Moderno",
    primary: "270 70% 45%",
    secondary: "280 60% 60%",
    accent: "260 65% 50%",
  },
  {
    name: "Laranja Energia",
    primary: "25 95% 50%",
    secondary: "40 90% 60%",
    accent: "15 85% 55%",
  },
  {
    name: "Vermelho Intenso",
    primary: "0 80% 45%",
    secondary: "10 75% 60%",
    accent: "355 70% 50%",
  },
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

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: "#045c53",
    secondary: "#aacb55",
    accent: "#3e867f",
  });
  const [selectedFont, setSelectedFont] = useState("Inter");
  const { empresa, uploadLogo, isUploading } = useEmpresa();

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

    const newColors = {
      primary: hslToHex(primary.h, primary.s, primary.l),
      secondary: hslToHex(secondary.h, secondary.s, secondary.l),
      accent: hslToHex(accent.h, accent.s, accent.l),
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Personalizar Cores">
          <Palette size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalizar Cores do Sistema</DialogTitle>
          <DialogDescription>
            Escolha um tema predefinido ou personalize as cores manualmente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="presets">Temas</TabsTrigger>
            <TabsTrigger value="custom">Cores</TabsTrigger>
            <TabsTrigger value="fonts">Fontes</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {presetSchemes.map((scheme) => (
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

              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-3">Prévia das Cores</p>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: customColors.primary }}
                    >
                      Primária
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: customColors.secondary }}
                    >
                      Secundária
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-16 rounded flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: customColors.accent }}
                    >
                      Destaque
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
      </DialogContent>
    </Dialog>
  );
}
