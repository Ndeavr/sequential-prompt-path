/**
 * UNPRO — /project/:slug
 * Before/after project page (Phase 2 will populate from contractor portfolios).
 */
import { useParams } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SchemaStack from "@/seo/components/SchemaStack";
import { canonicals } from "@/seo/services/canonicalManager";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const canonical = canonicals.project(slug || "");
  const title = `Projet ${slug} — Avant / Après | UNPRO`;
  const description = `Réalisation détaillée : ${slug?.replace(/-/g, " ")}. Photos avant-après, coûts réels, entrepreneur certifié.`;

  return (
    <MainLayout>
      <SeoHead title={title} description={description} canonical={canonical} />
      <SchemaStack
        breadcrumbs={[
          { name: "Accueil", url: "https://unpro.ca" },
          { name: "Projets", url: "https://unpro.ca/project" },
          { name: slug || "", url: canonical },
        ]}
      />
      <article className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-bold text-foreground capitalize">{slug?.replace(/-/g, " ")}</h1>
        <p className="text-muted-foreground">Cette page projet sera enrichie avec les photos avant-après, les coûts réels et l'entrepreneur en charge.</p>
      </article>
    </MainLayout>
  );
}
