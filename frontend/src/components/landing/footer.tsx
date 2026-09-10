import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto px-4 sm:px-8 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-xs">
            K
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">karu</span>
          <span className="text-xs text-muted-foreground ml-1">
            • Professional Screenwriting &amp; Film Studio
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link href="/#product" className="hover:text-foreground transition-colors">
            Product
          </Link>
          <Link href="/#structure" className="hover:text-foreground transition-colors">
            Structure
          </Link>
          <Link href="/#shortcuts" className="hover:text-foreground transition-colors">
            Shortcuts
          </Link>
          <Link href="/#security" className="hover:text-foreground transition-colors">
            Protection
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground transition-colors">
            How It Works
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Login
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium text-foreground">
            Start Writing
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Karu. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
