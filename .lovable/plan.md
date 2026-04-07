

# FairClash Tournaments — Debug & Enhancement Plan

## Overview
Fix critical bugs across wallet, games, matchmaking, and UI. Add Doodle Jump game, integrate uploaded game logos, improve Memory Match visuals, and polish the platform.

---

## 1. Game Logo Integration
Copy all 5 uploaded images to `src/assets/`:
- `tic-tac-toe-logo.jpg` (Tic Tac Toe)
- `snake-logo.jpg` (Snake)
- `sudoku-logo.png` (Sudoku)
- `memory-logo.jpg` (Memory Match)
- `doodle-jump-logo.jpg` (Doodle Jump)

Update `GamesPage.tsx` practice games section to display these logos as images instead of Lucide icons. Also update each game page header to show its logo.

---

## 2. Doodle Jump Game
Create `src/pages/DoodleJumpPage.tsx` — a canvas-based platformer with:
- Physics: gravity, jump velocity, platform collision
- Procedurally generated platforms (normal, moving, breakable)
- Accelerometer/touch tilt controls on mobile, arrow keys on desktop
- Score tracking and high score via localStorage
- Practice mode only (no betting)

Add route `/doodle-jump` in `App.tsx`. Add to GamesPage and HomePage built-in count.

---

## 3. Memory Match Visual Upgrade
Replace emoji-based cards with image-based cards using CSS 3D flip animation:
- Use `transform-style: preserve-3d` and `rotateY(180deg)` for flip
- Card back: colorful pattern/gradient
- Card front: distinct colorful icons (geometric shapes rendered as styled divs or SVG)
- Smooth 0.4s flip transition

---

## 4. Wallet Transaction Type Fix
Current DB constraint allows: `deposit, withdrawal, winning, entry_fee, refund, admin_credit, admin_debit, bet, platform_fee`. The code uses matching types, so the constraint is fine.

**Actual wallet bug**: In `walletApi.ts`, `placeBet()` and `addWinnings()` do client-side balance read + update (race condition). Fix by ensuring `refreshProfile()` is called after every wallet mutation in Aviator and Ludo pages to sync UI balance.

---

## 5. Aviator Cashout & Wallet Sync
The cashout button and logic already exist (line 197-214 in AviatorPage). The issue is likely that `refreshProfile()` isn't being awaited properly or the balance state gets stale.

**Fixes**:
- After `placeBet()` succeeds, call `await refreshProfile()` and also `setBalance(result.newBalance)`
- After `handleCashout()` succeeds, call `await refreshProfile()` and update local balance
- Make the CASHOUT button more prominent with pulsing glow animation
- These fixes are already partially in place — verify the `addWinnings` wallet API call uses type `"winning"` (it does)

---

## 6. Ludo Clash — Stale Session Cleanup
The matchmaking cleanup logic exists but may not execute reliably. Strengthen it:
- On component mount, delete ALL existing `ludo_players` entries for current user
- On `beforeunload` event, attempt cleanup
- When `findOrCreateRoom` is called, first clean up user's stale entries
- Add a "Practice vs AI" mode that uses local state only (no DB matchmaking)

---

## 7. Snake Game Mobile Fix
Fix touch controls to prevent:
- Double-input on swipe (debounce direction changes)
- Page zoom on double-tap (add `touch-action: none` to game container)
- Swipe direction detection using `touchstart`/`touchend` delta calculation

---

## 8. Admin Panel Fixes
- **Tournament edit**: Add edit button that populates form with existing tournament data
- **Tournament delete**: Already exists — verify it works
- **Game upload preview**: Already uses `URL.createObjectURL` — verify admin preview renders in iframe
- **Ban user**: Verify the ban toggle updates `profiles.status` to "banned" and that game pages check `profile?.status === "banned"` before allowing play

---

## 9. Leaderboard Profile Detail
When clicking a user on leaderboard, show a modal/drawer with:
- Avatar, username, bio
- Stats: total games, wins, losses, total bets, total winnings
- Recent game history (last 20 game_sessions)
This logic may already exist — verify and fix if the query isn't returning data.

---

## 10. AI Assistant
Already implemented with streaming via Lovable AI gateway. The chat edge function and AIPage both work. No changes needed unless the branding text is missing — verify "Powered by Fair Fun Studios" appears in the UI.

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `src/assets/*.jpg/png` | Copy 5 game logos from uploads |
| `src/pages/DoodleJumpPage.tsx` | New game |
| `src/pages/MemoryPage.tsx` | CSS 3D flip cards, remove emojis |
| `src/pages/SnakePage.tsx` | Fix mobile touch controls |
| `src/pages/GamesPage.tsx` | Add logos, add Doodle Jump |
| `src/pages/HomePage.tsx` | Update built-in count to 7 |
| `src/pages/AviatorPage.tsx` | Strengthen wallet sync after bet/cashout |
| `src/pages/LudoPage.tsx` | Cleanup stale sessions, add AI practice |
| `src/pages/AdminPage.tsx` | Tournament edit, verify ban/preview |
| `src/pages/LeaderboardPage.tsx` | Verify profile detail modal |
| `src/App.tsx` | Add `/doodle-jump` route |

## Database
No migration needed — current constraint already supports all required transaction types.

