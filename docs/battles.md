# Beat battles

A lobby of Amarula players picks a free marketplace kit, makes a beat against
the clock in their own Amarula, then listens to everyone's beats anonymously
and rates them. The website keeps the battle; the desktop app plays it through
these routes.

## Flow

1. **Lobby.** A subscriber opens a battle (20, 30 or 60 minutes; Awma allowed
   or not) and gets a six-character invite code. Up to 8 players join with it.
   Players are in one battle at a time: opening or joining another leaves the
   last. If the host leaves, the next player to have joined hosts. Lobbies that
   never start close after two hours.
2. **Kit vote** (30 s). The host starts with at least 2 players. Three free
   drum or sound kits from the marketplace are offered; the most votes wins
   (ties at random). With no free kits listed, the battle skips to making beats.
3. **Making.** Players export their beat (MP3 or WAV, up to 100 MB) and upload
   it by `submitBy`; uploads still count for a minute after (`phaseEndsAt`).
   Submitting again replaces the beat. Each submission says whether Awma
   helped; battles without Awma refuse ones that say it did.
4. **Listening.** Beats are shuffled and labeled "Track A", "Track B"… with no
   names. Players rate the others' beats from 1 to 5 (not their own) for 90 s
   per beat, at least 5 minutes.
5. **Results.** Beats ranked by average score (ties share a rank), names
   revealed. Each beat earns a point per beat ranked below it, added to the
   player's leaderboard row with their battles and wins.

Every phase ends early once every player still in the battle is done with it.

## Routes

All take the desktop app's Clerk OAuth token (`Authorization: Bearer`) and an
active DAW subscription, except the leaderboard. Errors are
`{ error: "message" }` with 400 (a battle rule), 401, 403 or 404.

| Route                                                              | What                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `GET /api/battles`                                                 | `{ code }`: the battle the user is still in, or null.                                                       |
| `POST /api/battles { minutes, awma }`                              | Opens a lobby; returns it like the next route.                                                              |
| `GET /api/battles/:code`                                           | `{ battle, serverTime }`: the battle as this player sees it; count down to `phaseEndsAt` from `serverTime`. |
| `POST /api/battles/:code/join`                                     | Joins a lobby.                                                                                              |
| `POST /api/battles/:code/leave`                                    | Leaves (after the start, the player's beat stays in).                                                       |
| `POST /api/battles/:code/start`                                    | Host only.                                                                                                  |
| `POST /api/battles/:code/kit-vote { slug }`                        | Votes for a kit option.                                                                                     |
| `POST /api/battles/:code/upload-url`                               | `{ url }`: POST the beat file there with its `Content-Type`; the reply has its `storageId`.                 |
| `POST /api/battles/:code/submit { storageId, fileName, usedAwma }` | Enters the upload.                                                                                          |
| `POST /api/battles/:code/vote { submissionId, score }`             | Rates someone else's beat, 1 to 5.                                                                          |
| `GET /api/battles/leaderboard`                                     | `{ players }`: the top 50 by points.                                                                        |

The rules are in `convex/battleRules.ts`, the battle itself in
`convex/battles.ts`, and the routes share `lib/battles/api.ts`.
