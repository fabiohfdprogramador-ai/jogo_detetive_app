import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState
        title="Pista falsa"
        description="A página que você procura não existe nos arquivos da agência."
        action={<ButtonLink href="/">Voltar ao início</ButtonLink>}
      />
    </Card>
  );
}
