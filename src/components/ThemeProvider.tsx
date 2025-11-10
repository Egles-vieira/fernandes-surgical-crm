import { useEffect } from "react";
import { useThemeConfig } from "@/hooks/useThemeConfig";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeConfig, isLoading } = useThemeConfig();

  // Função para converter HEX para HSL
  const hexToHSL = (hex: string): string => {
    // Se já está em formato HSL, retorna como está
    if (!hex.startsWith('#')) return hex;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;

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

  useEffect(() => {
    if (isLoading || !themeConfig) return;

    const root = document.documentElement;
    const observers: MutationObserver[] = [];

    // Aplicar cores (convertendo HEX para HSL se necessário)
    if (themeConfig.colors) {
      const { primary, secondary, accent, background } = themeConfig.colors;
      
      if (primary) {
        root.style.setProperty('--primary', hexToHSL(primary));
      }
      if (secondary) {
        root.style.setProperty('--secondary', hexToHSL(secondary));
      }
      if (accent) {
        root.style.setProperty('--accent', hexToHSL(accent));
      }
      if (background) {
        root.style.setProperty('--background', hexToHSL(background));
      }
    }

    // Aplicar fonte
    if (themeConfig.font) {
      root.style.setProperty('--font-family', themeConfig.font);
      document.body.style.fontFamily = themeConfig.font;
    }

    // Aplicar radius
    if (themeConfig.radius) {
      root.style.setProperty('--radius', themeConfig.radius);
    }

    // Aplicar border
    if (themeConfig.border) {
      root.style.setProperty('--border-width', themeConfig.border);
    }

    // Aplicar shadow
    if (themeConfig.shadow) {
      root.style.setProperty('--shadow-default', themeConfig.shadow);
    }

    // Aplicar icon stroke
    if (themeConfig.iconStroke) {
      root.style.setProperty('--icon-stroke-width', themeConfig.iconStroke);
      
      // Aplicar a todos os ícones existentes
      const icons = document.querySelectorAll('svg');
      icons.forEach(icon => {
        icon.style.strokeWidth = themeConfig.iconStroke;
      });

      // Observer para ícones adicionados dinamicamente
      const iconStrokeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const newIcons = node.querySelectorAll('svg');
              newIcons.forEach(icon => {
                (icon as SVGElement).style.strokeWidth = themeConfig.iconStroke!;
              });
              if (node.tagName === 'svg' && node instanceof SVGElement) {
                node.style.strokeWidth = themeConfig.iconStroke!;
              }
            }
          });
        });
      });

      iconStrokeObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      observers.push(iconStrokeObserver);
    }

    // Aplicar icon visual
    if (themeConfig.iconVisual) {
      const icons = document.querySelectorAll('svg');
      icons.forEach(icon => {
        if (themeConfig.iconVisual === 'rounded') {
          icon.style.strokeLinecap = 'round';
          icon.style.strokeLinejoin = 'round';
        } else if (themeConfig.iconVisual === 'sharp') {
          icon.style.strokeLinecap = 'butt';
          icon.style.strokeLinejoin = 'miter';
        } else if (themeConfig.iconVisual === 'filled') {
          icon.style.fill = 'currentColor';
          icon.style.fillOpacity = '0.2';
        }
      });

      // Observer para ícones adicionados dinamicamente
      const iconVisualObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const newIcons = node.querySelectorAll('svg');
              newIcons.forEach(icon => {
                const svgIcon = icon as SVGElement;
                if (themeConfig.iconVisual === 'rounded') {
                  svgIcon.style.strokeLinecap = 'round';
                  svgIcon.style.strokeLinejoin = 'round';
                } else if (themeConfig.iconVisual === 'sharp') {
                  svgIcon.style.strokeLinecap = 'butt';
                  svgIcon.style.strokeLinejoin = 'miter';
                } else if (themeConfig.iconVisual === 'filled') {
                  svgIcon.style.fill = 'currentColor';
                  svgIcon.style.fillOpacity = '0.2';
                }
              });
              if (node.tagName === 'svg' && node instanceof SVGElement) {
                if (themeConfig.iconVisual === 'rounded') {
                  node.style.strokeLinecap = 'round';
                  node.style.strokeLinejoin = 'round';
                } else if (themeConfig.iconVisual === 'sharp') {
                  node.style.strokeLinecap = 'butt';
                  node.style.strokeLinejoin = 'miter';
                } else if (themeConfig.iconVisual === 'filled') {
                  node.style.fill = 'currentColor';
                  node.style.fillOpacity = '0.2';
                }
              }
            }
          });
        });
      });

      iconVisualObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      observers.push(iconVisualObserver);
    }

    // Aplicar cores do menu (convertendo HEX para HSL se necessário)
    if (themeConfig.menuColors) {
      const { background, icon, text } = themeConfig.menuColors;
      
      if (background) {
        root.style.setProperty('--menu-bg', hexToHSL(background));
      }
      if (icon) {
        root.style.setProperty('--menu-icon', hexToHSL(icon));
      }
      if (text) {
        root.style.setProperty('--menu-text', hexToHSL(text));
      }
    }

    // Telemetria em dev
    if (import.meta.env.DEV) {
      console.log('🎨 Theme applied:', {
        primary: themeConfig.colors?.primary,
        secondary: themeConfig.colors?.secondary,
        accent: themeConfig.colors?.accent,
        background: themeConfig.colors?.background,
        font: themeConfig.font,
        radius: themeConfig.radius,
        menuColors: themeConfig.menuColors,
      });
    }

    // Cleanup: desconectar todos os observers
    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [themeConfig, isLoading]);

  return <>{children}</>;
}
