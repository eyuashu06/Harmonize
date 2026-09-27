import Link from "next/link";
import { Music4 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10 text-center">
      <div>
        <Music4 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          We couldn't find what you were looking for. The page may have moved or never existed.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/songs">Browse songs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
