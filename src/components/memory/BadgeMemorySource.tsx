import { cn } from '@/lib/utils';
import { MessageSquare, Mic, FileText, Camera, FormInput } from 'lucide-react';

const SOURCE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  chat: { icon: MessageSquare, label: 'Chat' },
  voice: { icon: Mic, label: 'Voix' },
  form: { icon: FormInput, label: 'Formulaire' },
  upload: { icon: Camera, label: 'Upload' },
  document: { icon: FileText, label: 'Document' },
};

interface BadgeMemorySourceProps {
  sourceType: string;
  className?: string;
}

export function BadgeMemorySource({ sourceType, className }: BadgeMemorySourceProps) {
  const config = SOURCE_CONFIG[sourceType] ?? { icon: FileText, label: sourceType };
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      'bg-secondary text-secondary-foreground',
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
