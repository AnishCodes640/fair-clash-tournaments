# FairClash — Sports Prediction, Quiz, Themes, Badges, Mailbox, Aviator Control, Banners

## Scope
A self-contained feature pack added on top of the existing app. **No existing wallet, auth, leaderboard, Ludo, Aviator gameplay logic is rewritten** — only extended where necessary (Aviator gets a cash-flow guard layer, themes get avatar borders, settings page gets carousel preview).

---

## 1. Sports Prediction
- New tables: `sports_matches`, `prediction_options`, `user_predictions`.
- Admin: create/edit/delete match (title, datetime, entry fee, max players, thumbnail URL, status). Add 2-N options per market with payout multiplier each.
- User: list of upcoming matches, place a single prediction per market by paying entry fee from wallet (atomic RPC `place_sports_prediction`).
- Resolution: admin marks the winning option per market → server RPC `resolve_sports_match` credits winners (`bet × multiplier`) and records loss for others, all via existing wallet rails.
- RLS: matches/options publicly readable; users see only their own `user_predictions`. Admin sees all.

## 2. Quiz Game
- New table: `quiz_sessions` (user_id, entry_fee, correct_count, wrong_count, reward, status).
- Static client-side question bank (`src/lib/quizBank.ts`) with 60+ questions tagged easy/medium/hard. Per-session random pick of 10 (mixed difficulty), seeded server-side via RPC `start_quiz_session` which deducts entry fee and returns the session id + question ids.
- RPC `submit_quiz_answer(session_id, q_id, answer)` validates server-side (server keeps the correct answers, never sent to client) and increments counters. Wrong = ₹0.50 penalty (configurable in `app_settings`), correct = ₹1.25 reward (configurable).
- RPC `finish_quiz_session` settles wallet with final net reward.

## 3. Theme System (extended)
- Existing `user_themes` + `purchase_theme` RPC kept.
- Add **Default** (free, auto-owned by everyone) and a **Premium** tier alongside existing Basic/Advanced/Ultra.
- Settings page gets a **carousel preview** (shadcn Carousel) showing each theme's avatar border + leaderboard highlight.
- New file `src/lib/themes.ts` with theme tokens + `useActiveTheme` hook.
- Apply across:
  - Profile avatar border (animated by tier)
  - Leaderboard row highlight
  - Chat bubble (AI page) accent
  - Floating AI button glow

## 4. Verified Badge System
- New tables: `verification_tiers` (catalog: basic/medium/premium × monthly/yearly with price), `user_verifications` (user_id, tier, expires_at, source).
- RPC `purchase_verification(tier, duration)` — atomic wallet deduction, sets expires_at.
- Daily cleanup via DB trigger on read: a SECURITY DEFINER function `get_active_verification(user_id)` returns null if expired (no cron needed).
- 7-day-before-expiry banner on profile + auto in-app notification (created on read).
- Admin: bulk assign by usernames with optional wallet deduction toggle.
- Display: small icon next to username everywhere (leaderboard, profile, AI chat header).

## 5. Mailbox Notifications
- New tables: `mailbox_messages` (sender=admin, title, body, audience='all'|'user', target_user_id, scheduled_at, expires_at), `mailbox_reads` (user_id, message_id, read_at).
- RLS: user reads messages where audience='all' OR target_user_id = auth.uid(), and `scheduled_at <= now()` and (`expires_at IS NULL OR expires_at > now()`).
- Bell icon in `AppHeader` with unread count + dropdown list.
- Mark-read RPC `mailbox_mark_read`.
- Admin page: compose, schedule, target by username, list & delete.

## 6. Aviator Cash-Flow Control
- New row in `app_settings` key='aviator_cashflow' with:
  - `pool_cap` (max net payout per day)
  - `min_bet`, `max_bet` (already enforced client-side, now server-enforced)
  - `max_slots_per_user` (concurrent active bets)
  - `max_payout_multiplier` (hard cap)
- New table: `aviator_daily_pool` (date PK, total_in, total_out).
- Existing Aviator RPCs (`place_bet`, `add_winnings`) gain wrappers `aviator_place_bet`, `aviator_cashout` that check the cap; if today's net payout would breach `pool_cap`, the multiplier is throttled or cashout denied with a clear message.
- Admin reset button → zeros today's row.

## 7. Admin Banners
- New table: `admin_banners` (title, body, image_url, cta_text, cta_link, starts_at, ends_at, is_active, priority).
- Public read for active+in-window banners; admin-only write.
- Home page renders a dismissible carousel at the top.

## 8. Real-time Tournament Broadcasting
- Add `tournaments` to `supabase_realtime` publication.
- `TournamentsPage` subscribes to `postgres_changes` on `tournaments` and `tournament_participants` to refresh live.

## 9. Avatar Border Animations
- New CSS keyframes in `index.css`: `theme-border-basic`, `theme-border-advanced` (animated gradient), `theme-border-ultra` (golden glow).
- New component `<ThemedAvatar>` wrapping shadcn Avatar that picks the border class from the user's `active_theme`.
- Replace avatar usages in Profile, Leaderboard, AI chat, AppHeader.

---

## Database Migration Summary
**New tables:** `sports_matches`, `prediction_options`, `user_predictions`, `quiz_sessions`, `verification_tiers`, `user_verifications`, `mailbox_messages`, `mailbox_reads`, `aviator_daily_pool`, `admin_banners`.
**New RPCs:** `place_sports_prediction`, `resolve_sports_match`, `start_quiz_session`, `submit_quiz_answer`, `finish_quiz_session`, `purchase_verification`, `admin_grant_verification`, `mailbox_mark_read`, `aviator_place_bet`, `aviator_cashout`, `get_active_verification`.
**Settings rows:** `aviator_cashflow`, `quiz_config`.
All RPCs use `SECURITY DEFINER` and lock balances via `FOR UPDATE` like existing wallet RPCs.

## Frontend Files
- New pages: `src/pages/SportsPredictionPage.tsx`, `src/pages/QuizPage.tsx`, `src/pages/MailboxPage.tsx`, `src/pages/VerificationPage.tsx`.
- New admin tabs in `AdminPage.tsx`: Sports, Mailbox, Banners, Aviator Control, Verifications.
- New components: `ThemedAvatar`, `VerifiedBadge`, `BannerCarousel`, `MailboxBell`, `ThemeCarousel`.
- New libs: `src/lib/themes.ts`, `src/lib/quizBank.ts`, `src/lib/sportsApi.ts`, `src/lib/mailboxApi.ts`.
- Updated: `App.tsx` (routes), `AppHeader.tsx` (bell), `HomePage.tsx` (banner + new game cards), `SettingsPage.tsx` (carousel), `ProfilePage.tsx` (verification status), `LeaderboardPage.tsx` (badge + themed avatar), `TournamentsPage.tsx` (realtime), `AviatorPage.tsx` (server-side cap calls).

## Out of Scope (explicit)
- No changes to existing Ludo, Tic Tac Toe, Snake, Sudoku, Memory, Doodle Jump gameplay.
- No payment-provider changes; all flows use existing wallet rails.
- Quiz uses a static question bank — no external trivia API.
- Sports matches are admin-curated — no live scores feed.

---

## Estimated Footprint
~1 large migration, ~10 new files, ~8 edited files. The work is sequenced: DB → core libs → pages → admin → header/home polish.
