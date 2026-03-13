/**
 * UNPRO — Featured Contractors Rotating Carousel
 * Auto-rotates through featured contractors with images.
 * In production, data comes from agent-selected contractors based on geo/user context.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Star, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicContractorSearch } from "@/hooks/usePublicContractors";
import heroHouse from "@/assets/hero-house.jpg";

/* Fallback data when no contractors in DB yet */
const fallbackContractors = [
  { id: "1", business_name: "TOITURE EXPERT", specialty: "Toiture & Couverture", city: "Montréal", province: "QC", aipp_score: 92, rating: 4.9, review_count: 47, years_experience: 18, verification_status: "verified", description: null, logo_url: null },
  { id: "2", business_name: "PLOMBERIE PRO", specialty: "Plomberie", city: "Laval", province: "QC", aipp_score: 88, rating: 4.8, review_count: 34, years_experience: 12, verification_status: "verified", description: null, logo_url: null },
  { id: "3", business_name: "RÉNO MAÎTRE", specialty: "Rénovation générale", city: "Québec", province: "QC", aipp_score: 85, rating: 4.7, review_count: 29, years_experience: 15, verification_status: "verified", description: null, logo_url: null },
  { id: "4", business_name: "ÉLECTRO PLUS", specialty: "Électricité", city: "Gatineau", province: "QC", aipp_score: 90, rating: 4.9, review_count: 52, years_experience: 20, verification_status: "verified", description: null, logo_url: null },
  { id: "5", business_name: "CUISINE DESIGN", specialty: "Ébénisterie", city: "Sherbrooke", province: "QC", aipp_score: 87, rating: 4.6, review_count: 23, years_experience: 10, verification_status: "verified", description: null, logo_url: null },
];

const AUTOPLAY_MS = 4000;

const FeaturedCarousel = () => {
  const { data: dbContractors } = usePublicContractorSearch({ sort: "aipp" });
  const contractors = dbContractors && dbContractors.length >= 3 ? dbContractors.slice(0, 6) : fallbackContractors;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % contractors.length), [contractors.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + contractors.length) % contractors.length), [contractors.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [next, paused]);

  const c = contractors[current];

  return (
    <section className="px-5 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-caption font-semibold text-primary tracking-widest uppercase mb-2">Entrepreneurs vedettes</p>
            <h2 className="font-display text-title text-foreground">Vérifiés, certifiés, recommandés</h2>
          </div>
          <Link to="/search" className="hidden sm:flex items-center gap-1.5 text-meta font-semibold text-primary hover:gap-2.5 transition-all">
            Voir tous <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="glass-card-elevated rounded-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                {/* Image area */}
                <div className="relative h-44 sm:h-56 overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/5">
                  <img
                    src={c.logo_url || heroHouse}
                    alt={`${c.business_name} — ${c.city}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />

                  {/* AIPP badge overlay */}
                  {c.aipp_score != null && (
                    <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-md border border-border/30 rounded-xl px-3 py-2 text-center">
                      <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">AIPP</div>
                      <div className="text-xl font-display font-bold text-primary leading-tight">{c.aipp_score}</div>
                    </div>
                  )}

                  {/* City tag */}
                  {c.city && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-card/80 backdrop-blur-md border border-border/30 rounded-lg px-2.5 py-1.5">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span className="text-caption font-semibold text-foreground">{c.city}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-section font-bold text-foreground truncate">{c.business_name}</h3>
                        {c.verification_status === "verified" && (
                          <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                        )}
                      </div>
                      {c.specialty && (
                        <p className="text-meta text-muted-foreground mt-1">{c.specialty}</p>
                      )}
                    </div>
                    <Link
                      to={`/contractors/${c.id}`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-caption font-semibold hover:shadow-glow transition-shadow"
                    >
                      Voir profil <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border/20">
                    {c.rating != null && c.rating > 0 && (
                      <span className="flex items-center gap-1.5 text-meta">
                        <Star className="h-3.5 w-3.5 fill-current text-warning" />
                        <span className="font-bold text-foreground">{c.rating.toFixed(1)}</span>
                        {c.review_count != null && <span className="text-muted-foreground">({c.review_count} avis)</span>}
                      </span>
                    )}
                    {c.years_experience != null && c.years_experience > 0 && (
                      <span className="flex items-center gap-1.5 text-meta text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {c.years_experience}+ ans
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Nav arrows */}
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/80 backdrop-blur-md border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {contractors.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCarousel;
