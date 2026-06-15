import { brandAssets } from "@/lib/brand-assets";

type BrandLogoVariant = "expanded" | "collapsed" | "expanded-white" | "collapsed-white" | "app-icon";

interface BrandLogoProps {
  variant: BrandLogoVariant;
  className?: string;
  alt?: string;
}

const logoByVariant: Record<BrandLogoVariant, string> = {
  expanded: brandAssets.logo.expandedGreen,
  collapsed: brandAssets.logo.collapsedGreen,
  "expanded-white": brandAssets.logo.expandedWhite,
  "collapsed-white": brandAssets.logo.collapsedWhite,
  "app-icon": brandAssets.appIcon,
};

export function BrandLogo({ variant, className, alt = "Dra. Ana Morong" }: BrandLogoProps) {
  return <img src={logoByVariant[variant]} alt={alt} className={className} />;
}
