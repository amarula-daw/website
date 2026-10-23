# Desktop app: usage analytics

The desktop app can share anonymous usage analytics, to learn which features
and Awma tools are used, where people get stuck, and how the app performs.
They're **opt-in**: the app asks on the first launch (and in Settings →
Privacy), records nothing until the user agrees, and turning them off deletes
whatever wasn't sent yet. They never include project contents, track or file
names, paths, plugin settings, command parameters, error messages or audio,
and aren't linked to the account.

The app's side is `native/app/Source/Analytics.cpp` in the desktop
repository; keep it, `AnalyticsEvent` in its `packages/protocol`, and this page
in sync.

## Endpoint

`POST /api/desktop/analytics`, no sign-in. The app sends a batch every ten
minutes while it's on (unsent events wait in its settings file, so a batch can
hold events from earlier launches):

```json
{
  "installId": "0f8fad5b-d9cb-469f-a165-70867728950e",
  "app": {
    "version": "0.3.0a",
    "platform": "mac",
    "os": "Mac OSX 26.0",
    "arch": "arm64"
  },
  "events": [
    {
      "name": "app.launched",
      "at": "2026-10-19T11:50:00.000Z",
      "props": { "launchMs": 1840 }
    }
  ]
}
```

- `installId` is random, made when analytics are turned on and forgotten when
  they're turned off (so turning them back on starts a new one).
- At most 500 events a batch, 16 props an event; props are numbers, booleans
  or strings up to 128 characters (`lib/desktop/analytics.ts`). Events older
  than 90 days are refused.
- 30 batches an hour per install (bursts up to 60). Answers `204`, `400` for a
  malformed batch, `413` over 512 KB, `429` over the limit.
- Stored in Convex (`analyticsDays`) merged, to stay within the free plan's
  database storage: one row per install, UTC day and app version, holding an
  entry per event name and string/boolean props (e.g. per command and
  caller) with how many events it merged (`count`). Numeric props are summed
  (props ending in `Max` keep the largest), so averages are the sum over
  `count`. Rows are deleted 400 days after their day.

## Events

| Event           | When                                                          | Props                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.launched`  | The window's page finished loading after a launch             | `launchMs`: from the app starting to the page loading                                                                                                                                                     |
| `app.crashed`   | Next launch, for each crash macOS reported since the last one | `exception` (e.g. `EXC_BAD_ACCESS`), `signal` (e.g. `SIGSEGV`), `version`: the app version that crashed. No stack or paths                                                                                |
| `command.used`  | Each batch, per Host API command and caller                   | `command` (e.g. `playlist.addTrack`), `caller` (`ui`, or `agent` for Awma's tools), `ok`, `failed`: how many calls worked and failed since the last batch. Failures are where people (and Awma) get stuck |
| `action.used`   | Each batch, per UI action                                     | `action`: the keybind action's id (e.g. `transport.play`), whether run by its key, the menu bar or a button; `count`                                                                                      |
| `usage.summary` | Each batch                                                    | `minutes` the batch covers, `playingSeconds`, `cpuAvg` and `cpuMax` (the audio engine's load, 0–1, sampled every 5 s while playing), `tracksMax`, `clipsMax`, `pluginsMax` (third-party), `awmaTurns`     |
