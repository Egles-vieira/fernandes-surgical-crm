import { useState, useEffect } from "react";
import { Palette, Check } from "lucide-react";
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

interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
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

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: "#045c53",
    secondary: "#aacb55",
    accent: "#3e867f",
  });

  useEffect(() => {
    const saved = localStorage.getItem("theme-colors");
    if (saved) {
      const colors = JSON.parse(saved);
      setCustomColors(colors);
      applyColors(colors);
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Temas Predefinidos</TabsTrigger>
            <TabsTrigger value="custom">Cores Personalizadas</TabsTrigger>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
