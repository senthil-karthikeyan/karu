import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto px-4 sm:px-8 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-black text-xs">
            K
          </div>
          <span className="font-bold text-base tracking-tight">karu</span>
          <span className="text-xs text-muted-foreground ml-2">
            The film workspace for storytellers
          </span>
        </div>

        <nav className="flex items-center gap-6 text-xs text-muted-foreground">
          <a href="#product" className="hover:text-foreground transition-colors">
            Product
          </a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Login
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Start Writing
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Karu Studio Inc.
        </p>
      </div>
    </footer>
  );
}
