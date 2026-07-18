import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DatePicker } from "@/components/DatePicker";
import { 
  Search, Plus, Pencil, Trash2, Lock, X, Filter, ChevronLeft, ChevronRight,
  Users, Shield, Coins, Award, TrendingUp, AlertCircle, CheckCircle, Clock, Crosshair, Target, Trophy
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import tileBattle from "@/assets/tile-battle.jpg";
import tileVirtual from "@/assets/tile-virtual.jpg";
import tileChallenges from "@/assets/tile-challenges.jpg";
import tileUsers from "@/assets/tile-users.jpg";
import tileClans from "@/assets/tile-clans.jpg";
const tileBattleAsset = { url: tileBattle };
const tileVirtualAsset = { url: tileVirtual };
const tileChallengesAsset = { url: tileChallenges };
const tileUsersAsset = { url: tileUsers };
const tileClansAsset = { url: tileClans };
import adminConsoleSeed from "@/assets/admin-console-seed.jpg";
import leagueSkullFire from "@/assets/league-skull-fire.jpg";
import { Countdown } from "@/components/Countdown";
import { useAuth, ROLE_LABELS, type AppRole } from "@/contexts/AuthContext";
import { fetchTeams } from "@/lib/queries";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from "recharts";
import { useConfirm } from "@/components/ConfirmDialog";
import { ActionConfirmDialog } from "@/components/ActionConfirmDialog";
import { notifyAction, humanizeAction } from "@/lib/notify-action";
import { SpotlightsAdminPanel } from "@/components/Spotlight";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ImageSettingControl } from "@/components/admin/ImageSettingControl";
import { ClansAdminPanel } from "@/components/admin/ClansAdminPanel";
import { LotteryAdminPanel } from "@/components/admin/LotteryAdminPanel";
import { GiftsSpinAdminPanel } from "@/components/admin/GiftsSpinAdminPanel";
import { SurveysAdminPanel } from "@/components/admin/SurveysAdminPanel";
import { PollsAdminPanel, ShopAdminPanel, FaqAdminPanel } from "@/components/admin/CommunityAdminPanel";
import { NewsAdminPanel } from "@/components/admin/NewsAdminPanel";
import { PushBroadcastPanel } from "@/components/admin/PushBroadcastPanel";
import { RecurringPushPanel } from "@/components/admin/RecurringPushPanel";
import { HomeBannersAdminPanel } from "@/components/admin/HomeBannersAdminPanel";
import { ArcadeAdminPanel } from "@/components/admin/ArcadeAdminPanel";
import { CasinoHistoryPanel } from "@/components/admin/CasinoHistoryPanel";
import { TopBetsPanel } from "@/components/admin/TopBetsPanel";
import { TournamentAdminPanel } from "@/components/admin/TournamentAdminPanel";
import { BrandingAdminPanel } from "@/components/admin/BrandingAdminPanel";
import { seedLegacyUsers } from "@/lib/seed-users.functions";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { loadStandings, type LbRow } from "@/lib/leaderboard";
import { MatchWizard } from "@/components/admin/MatchWizard";

// High-frequency admin actions that should not trigger a pop-out dialog.
const SILENT_AUDIT_ACTIONS = new Set(["match_live_score", "match_presence"]);

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — ECB" }, { name: "description", content: "League administration dashboard." }] }),
  component: AdminPage,
});
