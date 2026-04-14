/**
 * UNPRO — Affiliate Links Table
 */
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface AffiliateLink {
  id: string;
  label: string | null;
  url: string;
  utm_source: string | null;
  utm_campaign: string | null;
  click_count: number;
  is_active: boolean;
  created_at: string;
}

interface Props {
  links: AffiliateLink[];
}

const TableAffiliateLinks = ({ links }: Props) => {
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  };

  if (!links.length) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Aucun lien créé. Générez votre premier lien affilié.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Clics</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.map((link) => (
          <TableRow key={link.id}>
            <TableCell className="font-medium">{link.label || "Sans nom"}</TableCell>
            <TableCell>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                {link.utm_source || "direct"}
              </span>
            </TableCell>
            <TableCell className="text-right font-semibold">{link.click_count}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(link.url)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TableAffiliateLinks;
