"use client";

import * as React from "react";
import Link from "next/link";
import { Music4, Moon, Search, Sun, User as UserIcon, LogOut, Guitar, ListMusic, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { cn, initials } from "@/lib/utils";

export function SiteHeader() {
  const { resolvedTheme, toggle } = useTheme();
  const { status, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Music4 className="h-5 w-5" />
          </span>
          <span className="hidden text-base sm:inline">HarmonyHub</span>
        </Link>

        <form action="/songs" className="ml-2 hidden flex-1 md:block">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search songs, artists, albums..."
              className="pl-9"
              aria-label="Search"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <NavLink href="/songs" icon={<ListMusic className="h-4 w-4" />} label="Songs" />
          <NavLink href="/playlists" icon={<ListMusic className="h-4 w-4" />} label="Playlists" />
          <NavLink href="/practice" icon={<Guitar className="h-4 w-4" />} label="Practice" />
          <NavLink href="/audio" icon={<History className="h-4 w-4" />} label="Audio" />

          <Button
            variant="ghost"
            size="icon"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            onClick={toggle}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {status === "loading" ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : status === "authenticated" && user ? (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open user menu"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(user.display_name)}
                </span>
              </Button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md"
                >
                  <div className="px-3 py-2 text-sm">
                    <p className="font-medium">{user.display_name}</p>
                    <p className="truncate text-muted-foreground">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserIcon className="h-4 w-4" /> Profile
                  </Link>
                  <Link
                    href="/favorites"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ListMusic className="h-4 w-4" /> Favorites
                  </Link>
                  <button
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
