import { motion } from 'framer-motion';

interface AlexConnectionQualityIndicatorProps {
  quality: 'excellent' | 'good' | 'degraded' | 'poor';
}

const config = {
  excellent: { bars: 4, color: 'bg-green-500', label: 'Excellent' },
  good: { bars: 3, color: 'bg-green-400', label: 'Bon' },
  degraded: { bars: 2, color: 'bg-yellow-500', label: 'Instable' },
  poor: { bars: 1, color: 'bg-destructive', label: 'Faible' },
};

export function AlexConnectionQualityIndicator({ quality }: AlexConnectionQualityIndicatorProps) {
  const { bars, color, label } = config[quality];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5"
      title={label}
    >
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-1 rounded-full transition-colors ${
              i <= bars ? color : 'bg-muted'
            }`}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </div>
      {(quality === 'degraded' || quality === 'poor') && (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
    </motion.div>
  );
}
