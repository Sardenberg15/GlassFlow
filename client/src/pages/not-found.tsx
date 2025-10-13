import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Página não encontrada</p>
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
