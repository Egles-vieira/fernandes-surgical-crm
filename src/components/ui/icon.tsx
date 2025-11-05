import { LucideIcon } from "lucide-react";
import { useIconLibrary } from "@/hooks/useIconLibrary";
import { cn } from "@/lib/utils";

interface IconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  [key: string]: any;
}

export function Icon({ icon: IconComponent, size = 20, className, ...props }: IconProps) {
  const { getIconProps } = useIconLibrary();
  const iconProps = getIconProps(size);

  return (
    <IconComponent
      {...iconProps}
      {...props}
      className={cn(iconProps.className, className)}
      style={{
        ...iconProps.style,
        ...props.style
      }}
    />
  );
}
