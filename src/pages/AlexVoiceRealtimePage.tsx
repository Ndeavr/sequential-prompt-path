/**
 * AlexVoiceRealtimePage — Full-screen real-time voice conversation with Alex
 */
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AlexVoiceRealtime from "@/components/voice/AlexVoiceRealtime";
import { useAuth } from "@/hooks/useAuth";

export default function AlexVoiceRealtimePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(" ")[0] || null;

  return (
    <>
      <Helmet>
        <title>Alex Voice Temps Réel — UNPRO</title>
        <meta name="description" content="Conversation vocale en temps réel avec Alex, votre assistant IA." />
      </Helmet>
      <div className="fixed inset-0 z-50 bg-background">
        <AlexVoiceRealtime
          onClose={() => navigate(-1)}
          userName={userName || undefined}
        />
      </div>
    </>
  );
}
