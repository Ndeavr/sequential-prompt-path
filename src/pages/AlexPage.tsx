/**
 * Alex 100M — Sample Page
 * Full assistant mounted and working.
 */

import { AlexProvider, AlexAssistant } from "@/features/alex";

export default function AlexPage() {
  return (
    <AlexProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-lg">
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            Alex
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Votre assistante IA premium. Décrivez votre projet, envoyez une photo ou explorez les options ci-dessous.
          </p>
        </div>

        <AlexAssistant />
      </div>
    </AlexProvider>
  );
}
