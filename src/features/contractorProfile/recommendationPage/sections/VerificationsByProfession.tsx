/**
 * VerificationsByProfession — Adaptive verification list. RBQ shown per profession.
 */
import { Check, Info } from "lucide-react";
import { getVerificationsForCategory } from "../logic/verificationMatrix";

interface Props {
  categorySlug: string | null;
  contractor: any;
}

export default function VerificationsByProfession({ categorySlug, contractor: c }: Props) {
  const checks = getVerificationsForCategory(categorySlug);

  const active = (id: string): boolean => {
    switch (id) {
      case "identity":
        return !!c.admin_verified;
      case "phone":
        return !!c.phone;
      case "email":
        return !!c.email;
      case "neq":
        return !!c.neq;
      case "insurance":
        return !!c.insurance_info;
      case "rbq":
        return !!c.rbq_number;
      default:
        return false;
    }
  };

  return (
    <section aria-labelledby="verif-heading" className="space-y-3">
      <h2 id="verif-heading" className="text-lg font-semibold text-foreground">
        Vérifications UNPRO
      </h2>
      <p className="text-sm text-muted-foreground">
        Un élément non coché n'a pas encore été validé par UNPRO. Aucun statut n'est présumé.
      </p>
      <ul className="rounded-2xl border border-border bg-card divide-y divide-border">
        {checks.map((check) => {
          const isActive = active(check.id);
          const isOptional = !check.required;
          return (
            <li key={check.id} className="flex items-start gap-3 px-4 py-3">
              {isOptional ? (
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              ) : isActive ? (
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-muted-foreground/40 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {check.label}
                </div>
                {check.hint && (
                  <div className="text-xs text-muted-foreground mt-0.5">{check.hint}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
