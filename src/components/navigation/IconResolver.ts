/**
 * UNPRO — Lucide Icon Resolver
 * Maps string icon names to Lucide components for navigation config.
 */

import {
  Home, Building, Building2, FolderOpen, Briefcase, Sparkles, Search,
  User, TrendingUp, CalendarDays, CalendarCheck, BarChart3, Star, FileText,
  Shield, ShieldCheck, MessageSquare, MapPin, CreditCard,
  LayoutDashboard, Users, Brain, Palette, Plus, UserPlus,
  Scale, Bell, Settings, HelpCircle, LogOut, LogIn, Globe, Menu, X,
  ChevronDown, ArrowRightLeft, Compass, AlertTriangle, Wrench,
  BookOpen, Wallet,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Home, Building, Building2, FolderOpen, Briefcase, Sparkles, Search,
  User, TrendingUp, CalendarDays, CalendarCheck, BarChart3, Star, FileText,
  Shield, ShieldCheck, MessageSquare, MapPin, CreditCard,
  LayoutDashboard, Users, Brain, Palette, Plus, UserPlus,
  Scale, Bell, Settings, HelpCircle, LogOut, LogIn, Globe, Menu, X,
  ChevronDown, ArrowRightLeft, Compass, AlertTriangle, Wrench,
  BookOpen, Wallet,
};

export function resolveIcon(name: string): LucideIcon {
  return iconMap[name] || Sparkles;
}

export {
  Home, Building, Building2, FolderOpen, Briefcase, Sparkles, Search,
  User, TrendingUp, CalendarDays, CalendarCheck, BarChart3, Star, FileText,
  Shield, ShieldCheck, MessageSquare, MapPin, CreditCard,
  LayoutDashboard, Users, Brain, Palette, Plus, UserPlus,
  Scale, Bell, Settings, HelpCircle, LogOut, LogIn, Globe, Menu, X,
  ChevronDown, ArrowRightLeft, Compass, AlertTriangle, Wrench,
  BookOpen, Wallet,
};
