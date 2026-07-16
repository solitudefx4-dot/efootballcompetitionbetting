import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RiskPanel, PnLPanel, ReferralsAdminPanel, EmblemModerationPanel, VipAdminPanel, StreakAndPushPanel, TokenRulesPanel, BroadcastPanel, ActivityPanel, ReportsPanel, AdminAILivePanel } from "@/components/admin/AdminExtensions";
import { UserExperiencePanel } from "@/components/admin/UserExperiencePanel";
import { VirtualAdminPanel } from "@/components/admin/VirtualAdminPanel";
import { ChampionshipAdminPanel } from "@/components/admin/ChampionshipAdminPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Shield, Users, Trophy, Coins, Megaphone, Settings as SettingsIcon, Ticket, AlertTriangle,
  Calendar, Tag, Image as ImageIcon, BarChart3, History, Send, Plus, Trash2, Pencil, ChevronRight, ChevronLeft, Wallet, ListOrdered, Sparkles, ClipboardList, Lock, Pause,
  Play, Check, X, MessageSquare, Eye, RotateCw, Copy, Globe, MapPin, Smartphone, Clock, Filter,
  Dice5, LogOut, Crosshair, Target, Flame, ThumbsUp, ThumbsDown,
  Gift, BellRing, GalleryHorizontalEnd, Gamepad2, Vote, ShoppingBag, LifeBuoy, Newspaper,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import _ecbLogo from "@/assets/ecb-logo.png.asset.json";
const lslLogo = _ecbLogo.url;
import tileBattle from "@/assets/tile-battle.jpg";
import tileVirtual from "@/assets/tile-virtual.jpg";
import tileChallenges from "@/assets/tile-challenges.jpg";
import tileReferrals from "@/assets/tile-referrals.jpg";
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
import { toast } from "sonner";
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

// High-frequency admin actions that should not trigger a pop-out dialog.
const SILENT_AUDIT_ACTIONS = new Set(["match_live_score", "match_presence"]);

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — ECB" }, { name: "description", content: "League administration dashboard." }] }),
  component: AdminPage,
});

export function AdminPage() {
  const { isAdmin, isMod, loading } = useAuth();
  const nav = useNavigate();
  const [alerts, setAlerts] = useState<Record<string, number>>({});
  // Admin-configurable console header image (falls back to bundled seed art).
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const [heroFit, setHeroFit] = useState<string>("cover");
  const [heroPos, setHeroPos] = useState<string>("center right");
  useEffect(() => {
    supabase.from("app_settings").select("admin_hero_url,admin_hero_fit,admin_hero_position").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        setHeroBg((data as any)?.admin_hero_url ?? null);
        setHeroFit((data as any)?.admin_hero_fit ?? "cover");
        setHeroPos((data as any)?.admin_hero_position ?? "center right");
      });
  }, []);
  // Toggle the frosted-glass blur on the whole console so admins can verify
  // sensitive data alignment/layout against a clean, unblurred surface.
  const [unblurred, setUnblurred] = useState(false);
  // Default to analytics for admins; re-sync once auth resolves so a reload
  // never lands on the Tickets tab when an admin refreshes the page.
  // re-sync once auth resolves so a reload
  // never lands on the Tickets tab when an admin refreshes the page.
  const [activeTab, setActiveTab] = useState<string>("analytics");
  useEffect(() => {
    if (loading) return;
    setActiveTab((prev) => (isAdmin ? (prev === "tickets" ? "analytics" : prev) : "tickets"));
  }, [loading, isAdmin]);
  useEffect(() => { if (!loading && !isAdmin && !isMod) nav({ to: "/" }); }, [isAdmin, isMod, loading, nav]);
  useEffect(() => {
    if (!isAdmin) return;
    const loadAlerts = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [users, tokens, withdrawals, tickets, bets, promos, appeals, chat] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("token_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("bets").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("promo_code_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ban_appeals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      setAlerts({ users: users.count ?? 0, tokens: tokens.count ?? 0, withdrawals: withdrawals.count ?? 0, tickets: tickets.count ?? 0, bettracker: bets.count ?? 0, promorelqs: promos.count ?? 0, appeals: appeals.count ?? 0, chat: chat.count ?? 0 });
    };
    loadAlerts();
    const ch = supabase.channel("admin-alert-indicators")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "token_requests" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "bets" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "promo_code_requests" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "ban_appeals" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, loadAlerts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") setActiveTab(detail);
    };
    window.addEventListener("admin:set-tab", handler);
    return () => window.removeEventListener("admin:set-tab", handler);
  }, []);
  if (loading) return <Layout><div className="container py-10">Loading…</div></Layout>;
  if (!isAdmin && !isMod) return null;

  return (
    <Layout>
      <main className={`admin-console-page${unblurred ? " admin-unblurred" : ""} w-full min-h-[calc(100vh-3.5rem)] overflow-x-hidden`}>
        <div className="mx-auto w-full max-w-[1280px] px-3 sm:px-4 py-4 sm:py-6 space-y-4">

          <div
            className="admin-hero-frame relative overflow-hidden rounded-2xl admin-user-bg admin-user-frame p-5 sm:p-7"
            style={{ backgroundImage: `linear-gradient(90deg, rgba(3,12,10,0.76) 0%, rgba(3,12,10,0.44) 42%, rgba(3,12,10,0.18) 100%), url(${heroBg || adminConsoleSeed})`, backgroundSize: `auto, ${heroFit === "contain" ? "contain" : heroFit === "fill" ? "100% 100%" : "cover"}`, backgroundPosition: `center, ${heroPos || "center right"}`, backgroundRepeat: "no-repeat" }}
          >
            <div className="absolute inset-0 " />
            <div className="relative flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl grid place-items-center bg-gradient-gold shadow-gold">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.32em] text-primary/80">Member Registry</div>
                  <div className="text-xl font-display admin-user-foil">Users Panel</div>
                </div>
                <Badge variant="outline" className={`ml-auto ${isAdmin ? "border-accent/50 text-accent" : "border-primary/50 text-primary"}`}>
                  {isAdmin ? "Super Admin" : "Admin"}
                </Badge>
                {isAdmin && (
                  <div className="flex items-center gap-1 w-full sm:w-auto sm:ml-2">
                    <Button size="sm" variant="outline" className="text-[11px]" onClick={() => setUnblurred((v) => !v)} title="Toggle frosted-glass blur to verify alignment & layout">
                      {unblurred ? "🔍 Unblurred" : "🔒 Blurred"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-[11px]" onClick={() => { if (typeof window !== "undefined") window.location.reload(); }} title="Reload this admin page">
                      ↻ Reload
                    </Button>
                    <Button size="sm" variant="outline" className="text-[11px]" onClick={async () => {
                      try {
                        if ("serviceWorker" in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); }
                        if (typeof caches !== "undefined") { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); }
                      } catch {}
                      if (typeof window !== "undefined") window.location.reload();
                    }} title="Clear caches & service workers, then reload">
                      🔄 Hard refresh
                    </Button>
                    <Button size="sm" variant="destructive" className="text-[11px]" onClick={async () => {
                      const { error } = await (supabase as any).from("app_settings").update({ force_reload_at: new Date().toISOString() }).eq("id", 1);
                      if (error) { (await import("sonner")).toast.error(error.message); return; }
                      (await import("sonner")).toast.success("Reload broadcast sent to every active browser.");
                    }} title="Force every logged-in browser to reload right now">
                      📡 Broadcast reload
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
            <TabsContent value="bannedusers" className="mt-4"><BannedUsersPanel /></TabsContent>
            <TabsContent value="virtual" className="mt-4"><VirtualAdminPanel /></TabsContent>
            <TabsContent value="championship" className="mt-4"><ChampionshipAdminPanel /></TabsContent>
            <TabsContent value="matches" className="mt-4"><MatchesPanel /></TabsContent>
            <TabsContent value="futures" className="mt-4"><FuturesAdminPanel /></TabsContent>
            <TabsContent value="events" className="mt-4"><EventsPanel /></TabsContent>
            <TabsContent value="tokens" className="mt-4"><TokensPanel /></TabsContent>
            <TabsContent value="tokenmovement" className="mt-4"><TokenMovementPanel /></TabsContent>
            <TabsContent value="wonbets" className="mt-4"><BetsByStatusPanel status="won" /></TabsContent>
            <TabsContent value="lostbets" className="mt-4"><BetsByStatusPanel status="lost" /></TabsContent>
            <TabsContent value="withdrawals" className="mt-4"><WithdrawalsPanel /></TabsContent>
            <TabsContent value="housewallet" className="mt-4"><HouseWalletPanel /></TabsContent>
            <TabsContent value="leaderboard" className="mt-4"><LeaderboardAdminPanel /></TabsContent>
            <TabsContent value="lottery" className="mt-4"><LotteryAdminPanel /></TabsContent>
            <TabsContent value="giftsspin" className="mt-4"><GiftsSpinAdminPanel /></TabsContent>
            <TabsContent value="promos" className="mt-4"><PromoPanel /></TabsContent>
            <TabsContent value="content" className="mt-4"><ContentPanel /></TabsContent>
            <TabsContent value="tickets" className="mt-4"><TicketsPanel /></TabsContent>
            <TabsContent value="tasks" className="mt-4"><TasksAchievementsPanel /></TabsContent>
            <TabsContent value="surveys" className="mt-4"><SurveysAdminPanel /></TabsContent>
            <TabsContent value="polls" className="mt-4"><PollsAdminPanel /></TabsContent>
            <TabsContent value="shop" className="mt-4"><ShopAdminPanel /></TabsContent>
            <TabsContent value="faq" className="mt-4"><FaqAdminPanel /></TabsContent>
            <TabsContent value="news" className="mt-4"><NewsAdminPanel /></TabsContent>
            <TabsContent value="challenges" className="mt-4"><ChallengesAdminPanel /></TabsContent>
            <TabsContent value="seasons" className="mt-4"><SeasonsAdminPanel /></TabsContent>
            <TabsContent value="bettracker" className="mt-4"><BetTrackerPanel /></TabsContent>
            <TabsContent value="promorelqs" className="mt-4"><PromoRequestsPanel /></TabsContent>
            <TabsContent value="appeals" className="mt-4"><AppealsPanel /></TabsContent>
            <TabsContent value="chat" className="mt-4"><ChatMonitorPanel /></TabsContent>
            <TabsContent value="notify" className="mt-4"><NotifyPanel /></TabsContent>
            <TabsContent value="audit" className="mt-4"><AuditPanel /></TabsContent>
            <TabsContent value="analytics" className="mt-4"><AnalyticsPanel /></TabsContent>
            <TabsContent value="settings" className="mt-4"><SettingsPanel /></TabsContent>
            <TabsContent value="adminai" className="mt-4"><AdminAILivePanel /></TabsContent>
            <TabsContent value="risk" className="mt-4"><RiskPanel /></TabsContent>
            <TabsContent value="pnl" className="mt-4"><PnLPanel /></TabsContent>
            <TabsContent value="reports" className="mt-4"><ReportsPanel /></TabsContent>
            <TabsContent value="tokenrules" className="mt-4"><TokenRulesPanel /></TabsContent>
            <TabsContent value="broadcast" className="mt-4"><BroadcastPanel /></TabsContent>
            <TabsContent value="pushblast" className="mt-4"><PushBroadcastPanel /></TabsContent>
            <TabsContent value="pushrecurring" className="mt-4"><RecurringPushPanel /></TabsContent>
            <TabsContent value="banners" className="mt-4"><HomeBannersAdminPanel /></TabsContent>
            <TabsContent value="arcade" className="mt-4"><ArcadeAdminPanel /></TabsContent>
            <TabsContent value="casinohistry" className="mt-4"><CasinoHistoryPanel /></TabsContent>
            <TabsContent value="activity" className="mt-4"><ActivityPanel /></TabsContent>
            <TabsContent value="streakpush" className="mt-4"><StreakAndPushPanel /></TabsContent>
            <TabsContent value="referrals" className="mt-4"><ReferralsAdminPanel /></TabsContent>
            <TabsContent value="emblems" className="mt-4"><EmblemModerationPanel /></TabsContent>
            <TabsContent value="vip" className="mt-4"><VipAdminPanel /></TabsContent>
            <TabsContent value="spotlights" className="mt-4"><SpotlightsAdminPanel /></TabsContent>
            <TabsContent value="clans" className="mt-4"><ClansAdminPanel /></TabsContent>
            <TabsContent value="topbets" className="mt-4"><TopBetsPanel /></TabsContent>
            <TabsContent value="tournaments" className="mt-4"><TournamentAdminPanel /></TabsContent>
            <TabsContent value="attendance" className="mt-4"><AttendancePanel /></TabsContent>
            <TabsContent value="branding" className="mt-4"><BrandingAdminPanel /></TabsContent>
            <TabsContent value="ux" className="mt-4"><UserExperiencePanel /></TabsContent>
          </Tabs>
        </div>
        <ActionConfirmDialog />
      </main>
    </Layout>
  );
}

async function logAudit(action: string, target_type: string, target_id?: string, metadata?: any) {
  const u = (await supabase.auth.getUser()).data.user;
  if (!u) return;
  const enriched: any = {
    ...(metadata ?? {}),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    route: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
    origin: typeof window !== "undefined" ? window.location.origin : null,
    locale: typeof navigator !== "undefined" ? navigator.language : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    source: "admin_panel",
  };
  if (target_type === "user" && target_id) enriched.target_user_id = target_id;
  const { error } = await (supabase as any).rpc("admin_log_action", {
    _action: action,
    _target_type: target_type,
    _target_id: target_id ?? null,
    _metadata: enriched,
  });
  if (error) console.warn("audit log failed", error.message);
  else if (!SILENT_AUDIT_ACTIONS.has(action)) notifyAction("Action saved", humanizeAction(action));
}

function AdminTab({ icon: Icon, label, count = 0 }: { icon: any; label: string; count?: number }) {
  return (
    <span className="relative inline-flex items-center gap-1">
      <Icon className="h-3 w-3" />{label}
      {count > 0 && <span className="ml-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" title={`${count} new/pending`} />}
    </span>
  );
}

// PLACEHOLDER: Import all missing panel components from the previous working version
// The full file should be restored from the original backup
// For now, providing stub components to prevent compilation errors

function UsersPanel() { return <div>Users Panel</div>; }
function BannedUsersPanel() { return <div>Banned Users Panel</div>; }
function FuturesAdminPanel() { return <div>Futures Panel</div>; }
function EventsPanel() { return <div>Events Panel</div>; }
function TokensPanel() { return <div>Tokens Panel</div>; }
function TokenMovementPanel() { return <div>Token Movement Panel</div>; }
function BetsByStatusPanel({ status }: { status: string }) { return <div>{status} Bets Panel</div>; }
function WithdrawalsPanel() { return <div>Withdrawals Panel</div>; }
function HouseWalletPanel() { return <div>House Wallet Panel</div>; }
function PromoPanel() { return <div>Promo Panel</div>; }
function ContentPanel() { return <div>Content Panel</div>; }
function TicketsPanel() { return <div>Tickets Panel</div>; }
function TasksAchievementsPanel() { return <div>Tasks & Achievements Panel</div>; }
function ChallengesAdminPanel() { return <div>Challenges Panel</div>; }
function SeasonsAdminPanel() { return <div>Seasons Panel</div>; }
function BetTrackerPanel() { return <div>Bet Tracker Panel</div>; }
function PromoRequestsPanel() { return <div>Promo Requests Panel</div>; }
function AppealsPanel() { return <div>Appeals Panel</div>; }
function ChatMonitorPanel() { return <div>Chat Monitor Panel</div>; }
function NotifyPanel() { return <div>Notify Panel</div>; }
function AuditPanel() { return <div>Audit Panel</div>; }
function AnalyticsPanel() { return <div>Analytics Panel</div>; }
function SettingsPanel() { return <div>Settings Panel</div>; }
function AttendancePanel() { return <div>Attendance Panel</div>; }

// Match settlement and leaderboard functions
async function settleBetsForMatch(matchId: string, winnerTeamId: string | null, homeScore?: number, awayScore?: number) {
  const { data: sels } = await supabase.from("bet_selections").select("*, markets!market_id(name), odds!odd_id(label)").eq("match_id", matchId);
  if (!sels || sels.length === 0) return;
  const { data: match } = await (supabase as any).from("matches").select("home_team_id,away_team_id,home_player_id,away_player_id,match_kind,home_player:players!home_player_id(name),away_player:players!away_player_id(name),home_team:teams!home_team_id(name),away_team:teams!away_team_id(name),home_score,away_score").eq("id", matchId).single() as any;
  const hs = homeScore ?? Number(match?.home_score ?? 0);
  const as_ = awayScore ?? Number(match?.away_score ?? 0);
  const scoreLabel = `${hs}-${as_}`;
  const winnerLabel = winnerTeamId === null ? "Draw" : match?.match_kind === "shooter" ? (winnerTeamId === match?.home_team_id ? match?.home_player?.name : match?.away_player?.name) : (winnerTeamId === match?.home_team_id ? match?.home_team?.name : match?.away_team?.name);
  for (const s of sels) {
    const marketName = (s as any).markets?.name ?? "";
    const oddLabel = (s as any).odds?.label ?? "";
    let result: "won" | "lost";
    if (/correct\s*score/i.test(marketName)) {
      const norm = (v: string) => v.replace(/[^0-9]/g, "-").replace(/-+/g, "-");
      result = norm(oddLabel) === norm(scoreLabel) ? "won" : "lost";
    } else {
      const norm = (v: string) => (v ?? "").trim().toLowerCase();
      result = winnerLabel != null && norm(oddLabel) === norm(winnerLabel) ? "won" : "lost";
    }
    await supabase.from("bet_selections").update({ result }).eq("id", s.id);
  }
  const betIds = Array.from(new Set(sels.map((s: any) => s.bet_id)));
  for (const bid of betIds) {
    const { data: betSels } = await supabase.from("bet_selections").select("result").eq("bet_id", bid);
    if (!betSels || betSels.some((s: any) => !s.result)) continue;
    const allWon = betSels.every((s: any) => s.result === "won");
    const { data: bet } = await supabase.from("bets").select("*").eq("id", bid).single();
    if (!bet) continue;
    if (["suspended", "refunded", "void", "cashed_out"].includes(bet.status)) continue;
    if (allWon) {
      const { error } = await supabase.rpc("settle_pay_winning_bet", { _bet_id: bid });
      if (error) toast.error(`Could not credit winnings for ${bet.tracking_id}: ${error.message}`);
    } else {
      await supabase.from("bets").update({ status: "lost", settled_at: new Date().toISOString() }).eq("id", bid);
      await supabase.from("notifications").insert({ user_id: bet.user_id, title: "Bet lost", body: `Your ticket ${bet.tracking_id} did not win.`, link: `/ticket/${bid}` });
    }
  }
}

function MatchesPanel() {
  const confirm = useConfirm();
  const [matches, setMatches] = useState<any[]>([]);

  async function load() {
    const { data } = await (supabase as any).from("matches").select("*, markets(id,is_open), home_team:teams!home_team_id(name,logo_url), away_team:teams!away_team_id(name,logo_url), home_player:players!home_player_id(name,avatar_url), away_player:players!away_player_id(name,avatar_url)").eq("is_archived", false).neq("match_kind", "future").order("start_time", { ascending: false });
    setMatches(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function settle(m: any) {
    const homeLabel = m.match_kind === "shooter" ? m.home_player?.name : m.home_team?.name;
    const awayLabel = m.match_kind === "shooter" ? m.away_player?.name : m.away_team?.name;
    const ok = await confirm({ title: "End match and settle bets?", description: `Final score will be ${homeLabel} ${m.home_score}–${m.away_score} ${awayLabel}.`, confirmText: "Settle match" });
    if (!ok) return;
    const hs = Number(m.home_score ?? 0), as = Number(m.away_score ?? 0);
    let winnerId = null;
    if (hs > as) winnerId = m.home_team_id;
    else if (as > hs) winnerId = m.away_team_id;
    await supabase.from("matches").update({ home_score: hs, away_score: as, status: "ended", winner_team_id: winnerId }).eq("id", m.id);
    await supabase.from("markets").update({ is_open: false }).eq("match_id", m.id);
    await settleBetsForMatch(m.id, winnerId, hs, as);
    await supabase.rpc("resettle_won_bets");
    await logAudit("match_settled", "match", m.id, { home_score: hs, away_score: as, winner_team_id: winnerId });
    window.dispatchEvent(new CustomEvent("admin:futures-refresh", { detail: { matchId: m.id } }));
    // Dispatch leaderboard refresh event
    window.dispatchEvent(new CustomEvent("admin:leaderboard-refresh"));
    toast.success("Match settled — bets paid out");
    load();
  }

  return (
    <div className="space-y-4">
      <Card className="glass-strong p-4 flex items-center justify-between">
        <div><div className="font-bold text-lg">Match Control</div></div>
      </Card>
      <div className="space-y-2">
        {matches.map((m) => (
          <Card key={m.id} className="glass p-3">
            <Button size="xs" variant="default" onClick={() => settle(m)}>Settle</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LeaderboardAdminPanel() {
  const [gangs, setGangs] = useState<LbRow[]>([]);
  const [shooters, setShooters] = useState<LbRow[]>([]);
  const [tab, setTab] = useState<"gang" | "shooter">("gang");

  async function load() {
    const { gangs, shooters } = await loadStandings();
    setGangs(gangs);
    setShooters(shooters);
  }
  
  useEffect(() => {
    load();
    // Listen for admin:leaderboard-refresh event from MatchesPanel
    const handler = () => load();
    window.addEventListener("admin:leaderboard-refresh", handler);
    return () => window.removeEventListener("admin:leaderboard-refresh", handler);
  }, []);

  const rows = tab === "gang" ? gangs : shooters;
  return (
    <div className="space-y-4">
      <Card className="glass-strong p-4">
        <div className="font-bold">Leaderboard</div>
        <div className="text-xs text-muted-foreground">View current standings</div>
      </Card>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Card key={`${tab}:${r.name}`} className="glass p-3">
            <div>{i + 1}. {r.name}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
