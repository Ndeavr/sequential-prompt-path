/**
 * UNPRO — Lucide Icon Resolver
 * Maps string icon names to Lucide components for navigation config.
 */

import {
  Home, Building2, FolderOpen, Briefcase, Sparkles, Search,
  User, TrendingUp, CalendarDays, BarChart3, Star, FileText,
  Shield, ShieldCheck, MessageSquare, MapPin, CreditCard,
  LayoutDashboard, Users, Brain, Palette, Plus, UserPlus,
  Scale, Bell, Settings, HelpCircle, LogOut, Globe, Menu, X,
  ChevronDown, ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Home, Building2, FolderOpen, Briefcase, Sparkles, Search,
  User, TrendingUp, CalendarDays, BarChart3, Star, FileText,
  Shield, ShieldCheck, MessageSquare, MapPin, CreditCard,
  LayoutDashboard, Users, Brain, Palette, Plus, UserPlus,
  Scale, Bell, Settings, HelpCircle, LogOut, Globe, Menu, X,
  ChevronDown, ArrowRightLeft,
};

export function resolveIcon(name: string): LucideIcon {
  return iconMap[name] || Sparkles;
}

export {
  Home, Building2, FolderOpen, Briefcase, Sparkles, Search,
  User, TrendingUp, CalendarDays, BarChart3, Star, FileText,
  Shield, ShieldCheck, MessageSquare, MapPin, CreditCard,
  LayoutDashboard, Users, Brain, Palette, Plus, UserPlus,
  Scale, Bell, Settings, HelpCircle, LogOut, Globe, Menu, X,
  ChevronDown, ArrowRightLeft,
};
