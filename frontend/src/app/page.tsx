import type { Metadata } from "next";
import { MainNav } from "@/components/navigation/main-nav";
import { LandingHero } from "@/components/landing/hero";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { ScreenplayStructure } from "@/components/landing/screenplay-structure";
import { KeyboardShortcuts } from "@/components/landing/keyboard-shortcuts";
import { SecuritySection } from "@/components/landing/security-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Karu — Professional Screenplay Studio for Filmmakers",
  description:
    "Write, structure, and develop your screenplays with authentic 8.5\" × 11\" physical pages, Courier Prime formatting, customizable shortcuts, and protected writing.",
  openGraph: {
    title: "Karu — Professional Screenplay Studio for Filmmakers",
    description:
      "A distraction-free, professional screenwriting studio with physical page layout, intelligent structure, and protected writing.",
    url: "https://karu.studio",
    siteName: "Karu",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav isPublic={true} />
      <main className="flex-1">
        <LandingHero />
        <ProductShowcase />
        <ScreenplayStructure />
        <KeyboardShortcuts />
        <SecuritySection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
