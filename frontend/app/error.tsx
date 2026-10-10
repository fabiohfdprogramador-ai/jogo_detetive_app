"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg">
      <ErrorPanel
        title="Algo deu errado na central"
        description="Seu progresso salvo não foi alterado. Tente novamente ou volte ao início."
        action={
          <>
            <Button size="sm" onClick={reset}>
              Tentar novamente
            </Button>
            <ButtonLink href="/" size="sm" variant="secondary">
              Voltar ao início
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
