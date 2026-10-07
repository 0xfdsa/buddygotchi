# Boop mood graph v2 — JEV, animation and voice handover

2026-09-28. The approved graph, not a new intensity or vector system. Jev is the System 1 selector: the small model that picks among the options. This replaces the earlier V1 topology; only the V2 graph is in this repository.

## Character and inventory

Boop is overconfident, emotionally transparent, dramatic, easily wounded and secretly needy. It keeps doing the job while performing its feelings. Comedy and clear body language should carry the drama; constant sound must not.

| Disposition | Moods | Asset treatment |
| --- | --- | --- |
| Retain verbatim | happy, excited, proud, curious, determined, grumpy, sad | Reuse the seven existing art moods and their 308 performances. |
| Add | calm, engaged, annoyed, irritated, whiny, wounded | Six new faces and acting profiles, across all 22 states. |
| Delete | none | No migration loses an existing mood. |

There were **seven art moods**, although the inspected production selector exposed six and omitted curious. Curious needs enum/selector integration, not newly invented art. All seven legacy names map to themselves. Do not collapse grumpy into irritated or sad into whiny. There is no automatic saved-state migration for unsupported experimental names: log them and explicitly choose a fallback (calm is a suggested boot fallback, not a forced reset on every task).

| Mood | Visual / acting signature | Voice direction (not final scripts) |
| --- | --- | --- |
| calm | Big relaxed eyes, small level mouth, slow settled movements; awake, not asleep. | Content soft exhale; unhurried rounded syllables; generous silence. |
| happy | Sparkling big eyes and small cute smile; stars/music outside the eyes. | Warm, lilting and friendly. |
| excited | XD squeeze eyes, wide laughing mouth, energetic overshoot. | Quick bright bursts and delighted squeaks. |
| proud | Asymmetric eyes, obvious smirk, theatrical confident reveal. | Self-important flourish and little victory cackle. |
| curious | Unequal eye sizes actively swap; scan, peer, compare. | Upward questioning shapes and exploratory syllables. |
| engaged | Even attentive eyes track the task; compact productive flow. | Low, focused, brisk little acknowledgments, not strained. |
| determined | Slight upward brows, squared pose and sustained effort. | Firm, resolute, measured accents. |
| annoyed | Side-eye, compressed mouth, deliberate reluctant correction. | Dry short huff; restrained displeasure. |
| irritated | Eye twitch, clipped uneven corrections, control beginning to fray. | Tight staccato grumbles; more agitation than annoyed. |
| grumpy | Red anger mark, heavy fast impacts, breaking and throwing props. | Comically forceful grumbling, not abusive toward the user. |
| whiny | Baby pout, watery eyes, cube tears while still working; active bid for sympathy. | Nasal rising complaint, little sob-hiccups, imploring endings. |
| wounded | Inward flinch, glassy eyes, hesitant glance back, protective posture. | Breath catches, fragile short phrases; hurt rather than active protest. |
| sad | Deflated posture, abundant blue cube tears and splashes. | Slower drooping cadence and restrained sobs. |

## How traversal works

`mood-graph.json` is the authoritative **directed** adjacency list: 13 nodes, 98 directed edges, 6–8 outgoing choices per mood. Every mood is reachable from every other using ordinary edges alone. Self-hold is implicit and always available, not a stored edge. An edge's reverse may have a different category or not exist.

**Ordinary edges** are small plausible changes. **Dramatic edges** are story-justified jumps; they are not a second numeric intensity axis. The full topology is connected, but event gating means not every destination is available on every decision.

Example ordinary recovery: grumpy → irritated → annoyed → engaged → calm. Another legitimate route: grumpy → whiny → sad. A fresh, clearly hurtful interaction can enable grumpy → sad directly. Do not require a wounded waypoint when the story supports the direct jump. A strong earned recovery may enable sad → determined.

### What JEV receives

JEV does **not** memorize this graph, output vectors, call a graph explorer, or plan a multi-hop journey. For each mood decision the Mood action/policy prepares:

1. Current persistent mood and a version/token identifying this decision snapshot.
2. Recent sanitized event evidence, current activity state, prior mood/change age and a short personality reminder.
3. `hold` plus all ordinary neighbors permitted by pacing, plus only the dramatic neighbors justified by fresh evidence. At most eight destination choices plus hold.
4. A one-line acting meaning and optional short reason next to each offered choice.

JEV returns **one offered choice ID**. The existing multiple-choice harness remains generic; mood graph rules belong in the Mood action, not in a harness that infers policy from tool logs.

Example when current mood is grumpy and explicit fresh emotional evidence supports hurt:

```json
{
  "decision_id": "mood-v42-event-610",
  "current_mood": "grumpy",
  "activity": "terminal",
  "options": [
    {"id": "hold", "meaning": "Stay grumpy; no change is also a good choice"},
    {"id": "irritated", "meaning": "Still tense, regaining some control"},
    {"id": "annoyed", "meaning": "Settle into restrained displeasure"},
    {"id": "whiny", "meaning": "Turn protest into a plea for sympathy"},
    {"id": "determined", "meaning": "Channel frustration into effort"},
    {"id": "wounded", "meaning": "Fresh hurt makes Boop withdraw"},
    {"id": "sad", "meaning": "Fresh hurt breaks the bravado"}
  ]
}
```

This example deliberately excludes calm/proud dramatic jumps: the same event does not justify every dramatic edge. Response: `{"choice":"sad"}` in the host's actual choice protocol. No chain-of-thought or verbose rationale is required.

### Validation and continuity

- Validate membership in the exact offered set, graph edge and snapshot version before applying. Missing, invalid or stale answers leave the current mood unchanged.
- One accepted edge per mood decision. No hidden two-hop shortcut or random mood hopping for novelty.
- Ordinary changes should use a configurable dwell and reverse-transition cooldown, checked by the Mood policy. Initial tuning suggestion: 20–45 seconds ordinary dwell, 45–90 seconds immediate-reversal cooldown. These are **not approved final constants**; test pacing in real use. Suppress reevaluation until a relevant event or scheduled dwell evaluation, not every animation frame.
- Dramatic changes can bypass routine dwell once for a **fresh, sufficiently strong** event. Persist the consumed evidence sequence/version; do not replay the same event into repeated jumps. Application failures and successful completions are evidence of task events, not proof the user is angry or pleased.
- Being corrected, denied permission or told “no” is not user aggression. Pokes contain timing, not force or intent. Rapid taps can justify a comic startled/protesting response, not an inference of cruelty. Do not invent harm from silence or diagnose the human's emotion.
- Persist mood across terminal → tool_use → searching. Activity changes do not automatically change mood. Hold is expected and useful. Quiet states can suppress expression without resetting the stored mood.
- A momentary reaction can have its own pose, but must not become an undocumented path around persistent-mood continuity.
- Task outcome is a host fact, never inferred from mood. Happy + failed task remains a failure animation, not a victory. Unknown completion outcome selects reply_ready, not success.
- Needs-you is rule-owned priority. JEV cannot approve, clear permission, or turn an unresolved request into a task success. Tapping Boop never approves tools.

## Activity states and coverage

The state API remains orthogonal to mood. No new state names are introduced here:

`no_app`, `asleep`, `idle`, `listening`, `starting`, `planning`, `working`, `terminal`, `tool_use`, `searching`, `analyzing`, `testing`, `delegating`, `helper_return`, `waiting`, `needs_you`, `reply_ready`, `task_complete`, `error`, `stopped`, `poked`, `tap_spam`.

Specific tool types win: terminal for Bash/CLI; searching for outbound web search; analyzing for source inspection; testing for a reliable tests topic; delegating/helper_return for helper lifecycle. tool_use is the fallback, not an extra reaction layered over every specific call. Never fabricate helper spawning from an end-only hook. An event adapter must use actual available evidence. Boop action/heartbeat logs are bookkeeping/context, not instructions to recursively spawn new announcements. Ignore duplicate hook notifications using session/tool/event identity.

Host-only factual selection context: `starting` uses `startContext` = new_task/session/continuation; `task_complete` uses `completionOutcome` = success/failure. These are not additional mood axes or JEV-controlled results.

### V4 animation work in this chat

Built locally in `../boop-sound-bank-v4/`, with V3 and V2 preserved. New-mood coverage: 3 distinct actions for each state, 5 for working; starting has 3 actions for **each** of its 3 factual contexts (9); task_complete has 3 success and 3 failure actions (6). Verified against the generated manifest: 77 selections per new mood, **462 additions**, 770 total with the preserved 308. Quiet asleep/no_app choreography is deliberately shared, not six different angry sleeps. New art remains a review candidate, not user-approved production art. Review in `../studio/` (Pixel Boop); machine-readable selection/cue/voice-window data is in `../boop-sound-bank-v4/manifest.json`.

The seven retained moods preserve their existing 44 performances each. Their newer V3 states sometimes have only one base action: this work fills the six missing moods, and does **not** claim to backfill every older mood/state to three variants. Such a legacy-variation expansion is a separate review scope.

Animation variants must change actions/props, not just speed or particle counts. Pixel blocks, big minimal eyes, no detailed human hands. Loops return to the same pose. Reserve bottom 48 pixels of 320×240 for host text; use stepped pixel speech bubbles and short readable text. No gray outer frame. Dramatic motion does not authorize dense routine sound.

## Sound-chat handoff / ElevenLabs recording scope

The user explicitly requested this handoff to **【Buddygotchi】Sound** so recording design can begin. Work there on the **13 × 22 mood/state matrix**, not just the six additions. Reuse existing drafts where fitting; retain separate semantic phrases, emotional performances and mumble connectors. A visual variant does not require an exclusive recording; reuse compatible sound families and vary assembly.

- For each supported voiced mood/state family, plan 3–5 keyword performances and 3–5 compatible mumble takes as a starting target. Do not automatically voice every state: no_app/asleep are silent by default; idle/listening/waiting are opt-in sparse reactions. These are explicit silent cells, not missing recordings.
- Split task_complete success/failure and starting factual contexts. Tool errors are not terminal task failures. Keywords must not claim unsupported outcomes. Use simple intelligible keywords inside playful multilingual-sounding gibberish; avoid long ordinary English narration.
- Same recognizable character/voice identity across moods; no 13 unrelated speakers. Whiny versus wounded, annoyed versus irritated and engaged versus determined need deliberate audition contrasts.
- Record full mini-utterances for the most common reactions; also optional lead-in, keyword and tail modules. Preserve natural breath and coarticulation. Stitch at quiet/breath boundaries, not mid-phoneme; record “bridge” versions for high-use joints. Do not assume every arbitrary Cartesian concatenation sounds natural.
- Store semantic intent, mood, state, outcome/context restrictions, variation ID, duration, cue-safe windows, entry/exit join type, voice/model/settings and audition status. Randomize within validated compatibility groups; keep a playback ledger and recency penalty outside JEV context. Months of uniqueness is not a guarantee from combinatorics alone.
- Animation has sparse procedural **material SFX**, not vocal recordings. Keep the existing notification ding identity for all needs_you variants; tap rhythm/strength changes with mood. Preserve task success/failure and error attention identity. Voice should enter after the attention cue or an authored gap; duck routine accents while speech plays, not the signature alert.
- No additional background music under mumbling. Use one sound clock with animation cues; do not retime voice/animation independently and accidentally desynchronize impacts. Later per-scene voice windows should be sourced from the V4 manifest.
- ElevenLabs scripts are a separate production plan, not generated by this animation bank. Confirm the selected voice, pronunciation, model behavior and costs with an audition before bulk generation. The explicit user request to begin this work does not require spending credits blindly: use the sound chat's existing consent/credential setup and ask there if a paid-generation choice is still missing.

## Implementation and publication boundaries

This is a design handover and asset build, **not a claim that the app already enforces the graph**. Runtime integration must update the Mood action/options, enum/persistence validation, UI and tests together, following the repository's AGENTS and integration docs. The repository package lives in `characters/pixel/design/`, separate from the current production facegen/sfxgen inputs.

The user explicitly authorized pushing this animation/graph package to a new branch. That is not permission to open a pull request, merge, host externally, or run paid voice-generation batches. Future publication still needs consent. No enclosure/firmware changes are part of this package.
