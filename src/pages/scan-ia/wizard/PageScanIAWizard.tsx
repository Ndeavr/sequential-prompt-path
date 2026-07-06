import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useScanWizardState } from "./useScanWizardState";
import Step1Discovery from "./Step1Discovery";
import Step2Reveal from "./Step2Reveal";
import Step3Position from "./Step3Position";
import Step4Revenue from "./Step4Revenue";
import Step5Territory from "./Step5Territory";
import Step6Goal from "./Step6Goal";
import Step7Capacity from "./Step7Capacity";
import Step8Strategy from "./Step8Strategy";
import Step9Recommendations from "./Step9Recommendations";
import Step10Projection from "./Step10Projection";
import StepActivate from "./StepActivate";

const STEPS = [
  Step1Discovery,
  Step2Reveal,
  Step3Position,
  Step4Revenue,
  Step5Territory,
  Step6Goal,
  Step7Capacity,
  Step8Strategy,
  Step9Recommendations,
  Step10Projection,
  StepActivate,
];

export default function PageScanIAWizard() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get("st");
  const { report, step, setReport } = useScanWizardState();

  useEffect(() => {
    if (!token) {
      navigate("/scan-ia");
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("scan_ia_reports")
        .select("*")
        .eq("session_token", token)
        .maybeSingle();
      if (error || !data) {
        navigate("/scan-ia");
        return;
      }
      setReport(data as any);
    })();
  }, [token, navigate, setReport]);

  if (!report) {
    return (
      <div className="min-h-[100dvh] bg-[#050816] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  const Current = STEPS[step - 1] ?? STEPS[0];

  return (
    <>
      <Helmet>
        <title>{report.business_name ?? "Votre profil IA"} — UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Current />
    </>
  );
}
