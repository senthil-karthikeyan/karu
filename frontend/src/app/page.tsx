import { MainNav } from "@/components/navigation/main-nav";
import { LandingHero } from "@/components/landing/hero";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav isPublic={true} />
      <main className="flex-1">
        <LandingHero />
        <ProductShowcase />
      </main>
      <LandingFooter />
    </div>
  );
}
