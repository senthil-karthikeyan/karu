import type { Metadata } from "next";
import { MainNav } from "@/components/navigation/main-nav";
import { LandingFooter } from "@/components/landing/footer";
import { HowItWorksView } from "@/components/how-it-works/how-it-works-view";

export const metadata: Metadata = {
  title: "How It Works — Karu Screenplay Studio",
  description:
    "Discover the step-by-step filmmaker workflow in Karu: from account setup and screenplay protection to authentic 8.5\" × 11\" formatting, keyboard shortcuts, and scene tracking.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav isPublic={true} />
      <main className="flex-1 py-16 md:py-24">
        <HowItWorksView />
      </main>
      <LandingFooter />
    </div>
  );
}
