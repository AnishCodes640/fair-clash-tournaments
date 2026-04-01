

# FairClash Tournaments — Production Rebuild Plan

## Summary
Fix critical bugs (HTML game viewer, Aviator cashout, Ludo stale sessions, leaderboard, tournament game selection) and polish the platform with the Ludo Clash logo, improved Aviator probability, and cleaner UI.

---

## Priority 1: HTML Game Viewer Fix

**Problem**: Users see raw HTML code instead of playable game when clicking "Play".

**Root cause**: The iframe `src` points to the Supabase Storage public URL for `.html` files, but the browser may render it as a download or the storage content-type may not be set correctly. The `sandbox="allow-scripts allow-same-origin allow-popups"` is correct.

**Fix**:
- In `GamePlayPage.tsx`, verify the URL construction and add `?t=timestamp` cache-busting
- Add `type="text/html"` attribute hint
- Ensure the iframe has proper `allow` attributes
- Add error boundary if iframe fails to load

**Admin preview** already works (uses `URL.createObjectURL` on local file). No change needed there.

---

## Priority 2: Aviator Crash Game Rebuild

**File**: `src/pages/AviatorPage.tsx`

**Fixes**:
1. **Controlled multiplier ranges**: Replace `generateCrashPoint()` with weighted distribution:
   - 60% crash between 1.01x–2.5x
   - 25% crash between 2.5x–5x  
   - 12% crash between 5x–8x
   - 3% crash between 8x–15x (cap at 15x, no 20x-50x)

2. **Slower multiplier growth**: Change exponent from `0.12` to `0.08` for more suspense

3. **Quick bet buttons**: Change from `[10, 50, 100, 500]` to `[5, 10, 20, 25, 30]`, min bet ₹1

4. **Cashout button**: Already exists and works — verify `phaseRef` sync. Make it larger with glow animation

5. **Sound effects**: Add Web Audio API sounds for engine start, flight loop, crash boom, cashout cha-ching

6. **Red-themed UI**: Update canvas gradient to dark red tones, crash curve in red

7. **Rename "Ludo Clash"** branding integration with uploaded logo

---

## Priority 3: Ludo Clash — Fix Stale Sessions & Matchmaking

**File**: `src/pages/LudoPage.tsx`

**Bugs to fix**:
1. **Stale player data**: When user leaves matchmaking, their `ludo_players` record persists. Fix by:
   - On cancel/disconnect, DELETE the player row from `ludo_players`
   - On `findOrCreateRoom`, first clean up any existing entries for this user in waiting rooms
   - Add cleanup on component unmount (return from useEffect)

2. **Room cleanup**: Before joining, query and remove user from any previous `waiting` rooms

3. **Rename to "Ludo Clash"**: Update all references, copy uploaded logo to `src/assets/ludo-clash-logo.jpg`

4. **RLS for delete**: Add migration to allow players to delete their own `ludo_players` records

---

## Priority 4: Leaderboard Fix — Show ALL Users

**File**: `src/pages/LeaderboardPage.tsx`

**Current state**: Already queries all profiles and game_sessions. The code looks correct.

**Potential issues**:
- RLS policy on `game_sessions` might filter by `auth.uid()` — but there's already an "Authenticated users can view all game sessions for stats" policy with `USING (true)`. Should work.
- Profiles has "Authenticated users can view active profiles" policy. Should work.

**Verify and fix**:
- Ensure the leaderboard component properly aggregates stats from `game_sessions` for ALL users
- After each game (Aviator, Ludo), ensure a `game_sessions` row is inserted with correct `result`, `bet_amount`, `win_amount`
- Add real-time subscription to refresh on changes (already exists)

---

## Priority 5: Tournament Game Selection Fix

**File**: `src/pages/AdminPage.tsx` (line ~500)

**Problem**: The dropdown filters `games.filter(g => g.tournament_enabled)` — if no games have `tournament_enabled = true`, dropdown is empty. Built-in games (Aviator, Ludo) aren't in the `games` table.

**Fix**:
- Add hardcoded options for "Aviator Crash" and "Ludo Clash" in the tournament game dropdown with special IDs (e.g., `aviator`, `ludo-clash`)
- Show ALL games in dropdown (not just tournament-enabled ones), but mark tournament-enabled ones

---

## Priority 6: Logo Integration

- Copy uploaded `user-uploads://Screenshot_2026-03-20-10-07-38-95_...jpg` to `src/assets/ludo-clash-logo.jpg`
- Use it in LudoPage header, GamesPage Ludo card, and anywhere "Ludo Clash" appears

---

## Priority 7: Minor Fixes

- **Duplicate route** in `App.tsx` line 49-50 (two `/rules` routes) — remove duplicate
- **Game sessions tracking**: Ensure Aviator and Ludo both write to `game_sessions` consistently for leaderboard stats
- **Homepage**: Ludo Clash already shown. Verify total games count includes built-ins

---

## Database Migration

```sql
-- Allow players to delete their own ludo_players records (for cleanup)
CREATE POLICY "Players can delete own entries"
ON public.ludo_players FOR DELETE TO authenticated
USING (auth.uid() = user_id);
```

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `src/assets/ludo-clash-logo.jpg` | Copy from upload |
| `src/pages/AviatorPage.tsx` | Rebuild probability, slower curve, red theme, sounds, quick bets |
| `src/pages/LudoPage.tsx` | Fix stale sessions, rename to Ludo Clash, add logo |
| `src/pages/GamePlayPage.tsx` | Fix iframe URL handling |
| `src/pages/LeaderboardPage.tsx` | Minor verification/fixes |
| `src/pages/AdminPage.tsx` | Fix tournament game dropdown |
| `src/pages/GamesPage.tsx` | Update Ludo branding + logo |
| `src/App.tsx` | Remove duplicate route |
| Migration SQL | Add DELETE policy for ludo_players |

