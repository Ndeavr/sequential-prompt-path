import { ReactNode } from "react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4"
    >
      {icon && <div className="text-muted-foreground/30">{icon}</div>}
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
      {action}
    </motion.div>
  );
}
