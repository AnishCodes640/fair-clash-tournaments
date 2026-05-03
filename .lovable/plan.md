# Modular Platform Expansion Plan

Backend foundations (tables + RPCs) for Sports Prediction, Quiz, Themes, Verified Badges, Mailbox, Aviator cash-flow, and Admin Banners are already deployed. This plan covers the remaining frontend wiring, new progression systems, and admin tooling — without touching unrelated features.

## Scope

### 1. Sports Prediction (UI)
- `src/pages/SportsPredictionPage.tsx` — list upcoming/live/resolved matches with thumbnail, fee, multipliers, max-player progress.
- Bet placement modal calling `place_sports_prediction` RPC; hide other users' bets (only show pool counts).
- Admin tab in `AdminPage`: create match (title, datetime, thumbnail upload, entry fee, max players), add prediction options with custom multipliers, resolve via `resolve_sports_match`.

### 2. Quiz Game (UI)
- `src/pages/QuizPage.tsx` — start session via `start_quiz_session` (uses `pickQuizQuestions(10)` from quizBank), question-by-question UI with timer, submit via `submit_quiz_answer`, finalize via `finish_quiz_session`.
- Show running score; at end show reward summary (+₹1.25 / -₹1 logic handled server-side).

### 3. Themes & Store
- `src/pages/StorePage.tsx` (route `/store`) — unified store with tabs: Themes, Verified Badges, Pricing.
- Theme carousel preview on Profile (`ThemeCarousel` component); apply via `purchase_theme` (already exists) or instant switch if owned.
- Premium tier pricing pulled from `app_settings.theme_pricing` (admin-controlled discount %).
- `<ThemedAvatar>` wrapper applies border classes from `themes.ts` (basic = simple, advanced = animated gradient, ultra = golden glow). Use across Leaderboard, Profile, Chat.

### 4. Verified Badges
- `<VerifiedBadge tier=...>` component with check-mark variants (blue/gold/diamond).
- Renewal reminder via mailbox auto-message 3 days before `expires_at`.
- Admin bulk-assign UI calling `admin_grant_verification`.

### 5. Podium Leaderboard
- Refactor `LeaderboardPage` to add tabs: Global / Weekly / Monthly.
- Top-3 podium component with gold/silver/bronze animated borders (CSS keyframes in `index.css`).
- Show stats: games played, wins, streak, earnings, level.

### 6. Player Progression & Streaks (NEW backend + UI)
- Migration: `player_progression` table (user_id, level, xp, current_streak, best_streak, lifetime_wins, lifetime_earnings, achievements jsonb).
- RPC `record_game_result(p_session_id, p_won boolean, p_amount)` — atomically updates profile wallet (if win), increments streak, awards milestone bonuses (3/5/10), levels up Bronze→Silver→Gold→Diamond by lifetime wins thresholds.
- `<ProgressBadge>` on profile showing tier emoji + XP bar.
- Achievements grid on Profile.

### 7. Mailbox UI
- `src/pages/MailboxPage.tsx` — list `mailbox_messages` filtered by audience, mark-read via `mailbox_mark_read`.
- Bell icon with unread count in `AppLayout`.
- Admin tab to broadcast/target messages.

### 8. Admin Banners
- `<BannerCarousel>` on `HomePage` pulling active `admin_banners`.
- Admin CRUD UI.

### 9. Aviator Cash-Flow Control
- Admin panel reading `aviator_daily_pool` and editing `app_settings.aviator_cashflow` (pool_cap, max_bet, max_multiplier).
- Wire `aviator_record_bet` + `aviator_record_payout` into `AviatorPage` flow.

### 10. Bubble Shooter Tournament
- Add tournament room hookup using existing `tournaments` table; reward distribution via `add_winnings` to top 3.

### 11. Real-time
- Subscribe to `tournaments`, `sports_matches`, `admin_banners`, `mailbox_messages` channels in their respective pages.

## Technical Notes

- All wallet mutations stay in SECURITY DEFINER RPCs with `FOR UPDATE` locking (pattern already used).
- Leaderboard derives stats from `game_sessions` + new `player_progression` joins.
- New CSS keyframes added to `index.css`: `podium-gold`, `podium-silver`, `podium-bronze`, `theme-border-advanced`, `theme-border-ultra`.
- Routing additions in `App.tsx`: `/store`, `/quiz`, `/sports`, `/mailbox`.
- Sidebar additions in `AppLayout`: Progress 🚀, Streak 🔥, Store 🛒, Ranking 🏆, Pricing 💰, Achievements 🎯 (using Lucide icons per design rules).

## Out of Scope
- No changes to existing game logic (Aviator math, Ludo, Memory, TicTacToe gameplay) beyond hooking cash-flow guard and progression recorder.
- No removal of any existing feature.

## Delivery Order
1. Progression migration + record_game_result RPC.
2. Theme/Badge components + Store page.
3. Sports Prediction page + admin.
4. Quiz page.
5. Podium leaderboard refactor.
6. Mailbox + Banners.
7. Aviator admin + Bubble tournament.
8. Realtime subscriptions + polish.
