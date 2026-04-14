/**
 * UNPRO — Banner showing confirmed referral status
 */
import { UserCheck } from "lucide-react";

interface Props {
  affiliateName: string;
  status: "pending" | "confirmed" | "rejected";
}

const BannerReferralConfirmation = ({ affiliateName, status }: Props) => {
  if (status === "rejected") return null;

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
      status === "confirmed"
        ? "bg-primary/10 border border-primary/20 text-primary"
        : "bg-muted/50 border border-border/20 text-muted-foreground"
    }`}>
      <UserCheck className="h-4 w-4 shrink-0" />
      <span>
        {status === "confirmed"
          ? `Référé par ${affiliateName}`
          : `Référence en attente — ${affiliateName}`}
      </span>
    </div>
  );
};

export default BannerReferralConfirmation;
