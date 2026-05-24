import NoMatchConversionCard from "@/components/conversion/NoMatchConversionCard";

interface Props {
  service?: string;
  city?: string;
  hasEstimate?: boolean;
  onAlex?: () => void;
}

export default function CardNoMatchFallback({ service, city, hasEstimate, onAlex }: Props = {}) {
  return (
    <NoMatchConversionCard
      variant="inline"
      service={service}
      city={city}
      hasEstimate={hasEstimate}
      onAlex={onAlex}
    />
  );
}
