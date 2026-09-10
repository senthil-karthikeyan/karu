import type { Metadata } from "next";
import { ShieldCheck, Lock, EyeOff, KeyRound, Database, UserCheck, AlertTriangle } from "lucide-react";
import { MainNav } from "@/components/navigation/main-nav";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Privacy Policy & Security Overview — Karu",
  description:
    "Learn how Karu protects your screenplays with client-side encryption, zero cloud surveillance, and total creative intellectual property ownership.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav isPublic={true} />

      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-8 max-w-5xl">
          {/* Header */}
          <div className="space-y-4 border-b border-border/80 pb-10 mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-border bg-muted/60 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Privacy &amp; Security Commitment</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Privacy Policy &amp; Creative Security
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
              Effective Date: September 2026. Karu is built on a fundamental principle: your stories, dialogue, and creative intellectual property belong exclusively to you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar Table of Contents */}
            <aside className="lg:col-span-4 hidden lg:block">
              <div className="sticky top-24 p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Table of Contents
                </p>
                <nav className="space-y-1.5 text-xs">
                  <a href="#philosophy" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    1. Core Privacy Philosophy
                  </a>
                  <a href="#client-encryption" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    2. Client-Side Protection
                  </a>
                  <a href="#data-collection" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    3. Information We Collect
                  </a>
                  <a href="#never-collected" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    4. What We Never See
                  </a>
                  <a href="#no-ai-training" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    5. No AI Training or Profiling
                  </a>
                  <a href="#data-storage" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    6. Storage &amp; Infrastructure
                  </a>
                  <a href="#recovery-limitations" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    7. Recovery &amp; Key Safeguards
                  </a>
                  <a href="#user-rights" className="block py-1 text-muted-foreground hover:text-foreground transition-colors">
                    8. Your Rights &amp; Deletion
                  </a>
                </nav>
              </div>
            </aside>

            {/* Main Policy Content */}
            <div className="lg:col-span-8 space-y-12 text-sm leading-relaxed text-foreground/90">
              {/* Section 1 */}
              <section id="philosophy" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <h2>1. Our Core Privacy Philosophy</h2>
                </div>
                <p>
                  Screenwriters and filmmakers entrust their most valuable unproduced concepts, dialogue, and outlines to writing software. Unlike mainstream cloud services that scan user documents for ad targeting or artificial intelligence training, Karu is architected so that we cannot read your screenplays even if compelled to do so.
                </p>
                <p>
                  You retain 100% copyright and intellectual property ownership of every character, line of dialogue, scene heading, and story draft you create on Karu.
                </p>
              </section>

              {/* Section 2 */}
              <section id="client-encryption" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2>2. Client-Side Protection Architecture</h2>
                </div>
                <p>
                  When you write in Karu Studio, your screenplay text is encrypted directly inside your browser before transmission.
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Browser-Only Decryption:</strong> Screenplay content keys are held exclusively in browser memory during an active, unlocked session.
                  </li>
                  <li>
                    <strong className="text-foreground">Opaque Cloud Storage:</strong> Our database and servers store only opaque encrypted ciphertext. No plain text screenplay lines or dialogue are ever saved on our backend disks.
                  </li>
                  <li>
                    <strong className="text-foreground">Encrypted Version Checkpoints:</strong> Milestone version snapshots are encrypted in your browser using the same protection standards.
                  </li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="data-collection" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <Database className="h-5 w-5 text-primary" />
                  <h2>3. Information We Collect</h2>
                </div>
                <p>
                  To provide our services, Karu processes limited operational data:
                </p>
                <div className="p-4 rounded-xl bg-card border border-border space-y-2 text-xs">
                  <p>
                    <strong className="text-foreground">Account Information:</strong> Your email address, display name, and securely hashed passwords (using industry-standard bcrypt). If you sign in with Google, we receive your verified email and profile name.
                  </p>
                  <p>
                    <strong className="text-foreground">Project Metadata:</strong> Unencrypted structural metadata necessary for workspace navigation: project titles, loglines, genres, formats, and created/updated timestamps.
                  </p>
                  <p>
                    <strong className="text-foreground">Screenplay Metrics:</strong> Client-calculated document metrics (page count, scene count, word count) stored with your project for studio dashboard display.
                  </p>
                  <p>
                    <strong className="text-foreground">Technical Logs:</strong> Server request logs, IP addresses, and error telemetry used solely for service reliability and abuse prevention.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section id="never-collected" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <EyeOff className="h-5 w-5 text-primary" />
                  <h2>4. What Karu Never Sees</h2>
                </div>
                <p>
                  Our security model guarantees that the following sensitive creative assets are never visible to Karu staff, server administrators, or third parties:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                    <p className="font-semibold text-foreground text-xs">Your Screenplay Content</p>
                    <p className="text-[11px] text-muted-foreground">Every scene, character name, dialogue block, and revision is locked.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                    <p className="font-semibold text-foreground text-xs">Your Encryption Passphrase</p>
                    <p className="text-[11px] text-muted-foreground">Your passphrase is used only in your browser and is never transmitted.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                    <p className="font-semibold text-foreground text-xs">Your Recovery Code</p>
                    <p className="text-[11px] text-muted-foreground">Your offline recovery file (.txt) is stored on your device alone.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                    <p className="font-semibold text-foreground text-xs">Third-Party Trackers</p>
                    <p className="text-[11px] text-muted-foreground">Zero advertising SDKs, zero data brokers, zero tracking pixels.</p>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="no-ai-training" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2>5. No AI Training Guarantee</h2>
                </div>
                <p>
                  Karu explicitly does not use, inspect, or license user screenplay content to train machine learning models or artificial intelligence algorithms. Your screenplays remain your confidential creative output.
                </p>
              </section>

              {/* Section 6 */}
              <section id="data-storage" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <Database className="h-5 w-5 text-primary" />
                  <h2>6. Storage &amp; Infrastructure Security</h2>
                </div>
                <p>
                  All network communication between your browser and Karu is strictly protected via TLS 1.3/HTTPS. Database records are maintained in secured PostgreSQL clusters with daily encrypted backups and strict access controls.
                </p>
              </section>

              {/* Section 7 */}
              <section id="recovery-limitations" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2>7. Recovery Safeguards &amp; Responsibilities</h2>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2 text-xs">
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    Important Zero-Knowledge Responsibility:
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Because Karu servers do not hold your encryption passphrase, Karu customer support cannot reset your encryption passphrase or recover your screenplay text if you lose both your passphrase and your downloaded Recovery Code (.txt). We strongly advise saving your Recovery Code in a secure password manager or safe offline location.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section id="user-rights" className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <h2>8. Your Rights &amp; Account Deletion</h2>
                </div>
                <p>
                  You have full rights over your data:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-foreground">
                  <li>You may update your profile or change your credentials at any time.</li>
                  <li>You may delete any project, which permanently purges all associated encrypted screenplay contents and versions.</li>
                  <li>You may request complete account deletion, which permanently erases your user credentials and all associated database records.</li>
                </ul>
                <p className="pt-2">
                  For privacy inquiries or account deletion requests, contact us at{" "}
                  <a href="mailto:privacy@karu.studio" className="underline text-foreground">
                    privacy@karu.studio
                  </a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
