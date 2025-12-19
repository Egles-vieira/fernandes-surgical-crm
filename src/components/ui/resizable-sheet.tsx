import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "resizable-sheet-width-";

interface ResizableSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  overlayClassName?: string;
  hideCloseButton?: boolean;
  isFullscreen?: boolean;
}

const ResizableSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  ResizableSheetContentProps
>(
  (
    {
      className,
      children,
      defaultWidth = 900,
      minWidth = 400,
      maxWidth = 1400,
      storageKey,
      overlayClassName,
      hideCloseButton = true,
      isFullscreen = false,
      ...props
    },
    ref
  ) => {
    const [width, setWidth] = useState(() => {
      if (storageKey && typeof window !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY_PREFIX + storageKey);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) {
            return Math.min(Math.max(parsed, minWidth), maxWidth);
          }
        }
      }
      return defaultWidth;
    });

    const [isResizing, setIsResizing] = useState(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = width;
      },
      [width]
    );

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isResizing) return;

        const delta = startXRef.current - e.clientX;
        const newWidth = Math.min(
          Math.max(startWidthRef.current + delta, minWidth),
          maxWidth
        );
        setWidth(newWidth);
      },
      [isResizing, minWidth, maxWidth]
    );

    const handleMouseUp = useCallback(() => {
      if (isResizing) {
        setIsResizing(false);
        if (storageKey) {
          localStorage.setItem(STORAGE_KEY_PREFIX + storageKey, width.toString());
        }
      }
    }, [isResizing, storageKey, width]);

    useEffect(() => {
      if (isResizing) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            overlayClassName
          )}
        />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 gap-4 bg-background shadow-lg transition-all ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "inset-y-0 right-0 h-full data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            isFullscreen && "!w-full",
            className
          )}
          style={{ width: isFullscreen ? '100%' : `${width}px` }}
          {...props}
        >
          {/* Resize handle - hidden when fullscreen */}
          {!isFullscreen && (
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize group z-10",
                "hover:bg-primary/30 transition-colors",
                isResizing && "bg-primary/50"
              )}
              onMouseDown={handleMouseDown}
            >
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                  "w-1 h-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity",
                  isResizing && "opacity-100 bg-primary"
                )}
              />
            </div>
          )}

          {children}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    );
  }
);
ResizableSheetContent.displayName = "ResizableSheetContent";

export { ResizableSheetContent };
