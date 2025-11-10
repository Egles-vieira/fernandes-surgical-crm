import { useEffect } from "react";
import { useThemeConfig } from "@/hooks/useThemeConfig";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeConfig, isLoading } = useThemeConfig();

  useEffect(() => {
    if (isLoading || !themeConfig) return;

    const root = document.documentElement;

    // Aplicar cores
    if (themeConfig.colors) {
      const { primary, secondary, accent, background } = themeConfig.colors;
      
      if (primary) {
        root.style.setProperty('--primary', primary);
      }
      if (secondary) {
        root.style.setProperty('--secondary', secondary);
      }
      if (accent) {
        root.style.setProperty('--accent', accent);
      }
      if (background) {
        root.style.setProperty('--background', background);
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
      const observer = new MutationObserver((mutations) => {
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

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
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
      const observer = new MutationObserver((mutations) => {
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

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }

    // Aplicar cores do menu
    if (themeConfig.menuColors) {
      const { background, icon, text } = themeConfig.menuColors;
      
      if (background) {
        root.style.setProperty('--menu-bg', background);
      }
      if (icon) {
        root.style.setProperty('--menu-icon', icon);
      }
      if (text) {
        root.style.setProperty('--menu-text', text);
      }
    }
  }, [themeConfig, isLoading]);

  return <>{children}</>;
}
