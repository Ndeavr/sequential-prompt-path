import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function PageScanIAActivationSuccess() {
  const [sp] = useSearchParams();
  const token = sp.get("st");

  return (
    <div className="alex-immersive flex min-h-screen items-center justify-center bg-[#050816] px-6 text-readable">
      <Helmet>
        <title>Activation confirmée — UNPRO</title>
      </Helmet>

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur">
        <CheckCircle2 className="mx-auto mb-6 h-14 w-14 text-emerald-400" />
        <h1 className="mb-3 text-3xl font-semibold text-white">Activation confirmée</h1>
        <p className="mb-8 text-white/70">
          Votre profil IA est en cours d'activation. Créez votre compte pour finaliser
          votre configuration et commencer à recevoir des rendez-vous.
        </p>
        <Link
          to={`/register?scan=${encodeURIComponent(token ?? "")}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[#050816] transition hover:-translate-y-0.5"
        >
          Créer mon compte <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
