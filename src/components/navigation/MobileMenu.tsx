/**
 * UNPRO — Mobile Menu Sections (Accordion)
 * Used inside the mobile slide-out menu.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { getMegaMenuConfig } from "./MegaMenu";

const menuKeys = [
  { key: "maison", label: "Maison", labelEn: "Home" },
  { key: "entreprises", label: "Entreprises", labelEn: "Business" },
  { key: "condo", label: "Condo", labelEn: "Condo" },
  { key: "explorer", label: "Explorer", labelEn: "Explore" },
];

interface MobileMenuSectionProps {
  lang: "fr" | "en";
  onClose: () => void;
}

export default function MegaMenuMobileSection({ lang, onClose }: MobileMenuSectionProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">
        {lang === "en" ? "Navigation" : "Navigation"}
      </p>
      {menuKeys.map(({ key, label, labelEn }) => {
        const config = getMegaMenuConfig(key);
        const isOpen = openSection === key;

        return (
          <div key={key}>
            <button
              onClick={() => setOpenSection(isOpen ? null : key)}
              className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-body font-medium text-foreground hover:bg-muted/40 transition-colors"
              aria-expanded={isOpen}
            >
              {lang === "en" && labelEn ? labelEn : label}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isOpen && config && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-3 pb-2 space-y-3">
                    {config.sections.map((section) => (
                      <div key={section.title}>
                        <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                          {lang === "en" && section.titleEn ? section.titleEn : section.title}
                        </p>
                        {section.items.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                          >
                            <item.icon className="h-3.5 w-3.5" />
                            {lang === "en" && item.labelEn ? item.labelEn : item.label}
                            {item.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-auto">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
