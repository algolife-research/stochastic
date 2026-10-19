# Stochastic Musical Model

This document is the formal specification of the musical model as **implemented** in the engine (`src/core`). Every formula and behavior stated here is taken from the code, with the source file noted per section. Ideas that exist in the UI, types, or older docs but have no engine behavior are collected at the end under **Design horizon** — nothing outside that section is aspirational.

Conventions: `B` is the effective tempo in BPM, `n` is a MIDI note number, `pc` is a pitch class (0–11), `U(a, b)` is a uniform random draw. All randomness uses the JavaScript `Math.random()` PRNG: unseeded, non-reproducible across runs.

---

## 1. The time model

*Source: `src/core/tick/index.ts`, `src/core/tick/packets.ts`, `src/core/tick/sources.ts`, `src/core/tick/scene-playback.ts`.*

### 1.1 The clock: exact time in beat units

*Since 16 Oct 2026 (the branch `tacet-time-and-turning`; the old rules are under History, below).*

Every time and length the tick reads is a **whole number of beat units**, `PPQ = 2 822 400` to a beat (2^8 · 3^2 · 5^2 · 7^2: every division from a quarter to a 256th, triplets, quintuplets and septuplets is whole). A sum of lengths is exact, and "at the same time" is the equality of two integers. Beats (an edge's length, an interval, a hold) become units once, alike on every side:

```
toUnits(x)      = floor(x · PPQ + 0.5)
secondsOf(u, B) = u / PPQ · 60 / B
```

The engine still runs on `requestAnimationFrame`, but a frame no longer decides when anything happens; it only says how far the **beat clock** has come (`tick/state.ts`, `advanceClock`):

```
dt     = min(elapsed_seconds, 0.1)                       // clamped after a stall
total  = rem + floor(B · 100 + 0.5) · PPQ · round(dt · 1e6)
units  = floor(total / 6·10^9);  rem = total − units · 6·10^9
beatNow += units                                          // integers only
```

A frame's **window** is (start, end] of the clock. Every event due in it is queued and handled **in order of exact time** (`tick/packets.ts`, `runEvents`); events at one time keep the old order by kind: source releases, expiries, arrivals (in the order their packets entered), then delay and crossover releases. What an event sets going inside the window (a clone arriving before `end`) joins the queue; one packet's line takes at most `MAX_HOPS_PER_STEP` (8) hops in a window, and the rest wait for the next with their exact times. A packet's place `t` is derived for drawing only: `(end − depart) / length`, clamped.

A hit carries its exact time (`playNote(..., { at })`), so an offline render puts each onset on its sample. There is still **no swing, no groove grid and no quantization**: rhythm comes from edge lengths and source intervals, now kept exactly.

The paths timed in milliseconds (an LFO's phase, the gate's density window) read `performance.now()` as before.

### 1.2 Tempo resolution

The tempo used by the tick loop is a single stored value:

```
B = scenePlayback.effectiveBpm, falling back to masterSpeed if 0/unset
```

`effectiveBpm` is computed as `scene.localBpm ?? masterSpeed` and is **re-resolved only at these moments**:

- when playback (re)starts (`resetTick`, which also resets the beat clock),
- on a jam-mode scene change (queued or immediate),
- when the user changes `masterSpeed` while no scene overrides it.

In arrangement mode, crossing into a new slot mid-playback loads the scene onto the canvas but does *not* re-resolve `effectiveBpm`/`effectiveRoot`/`effectiveScale` for the canvas channel; only non-canvas ("virtual") channels re-read `localBpm` per tick. Per-slot `instanceBpm` is honored only by the offline compilers (audio/video export), never by the live engine.

The tempo sets only how fast the beat clock runs: lengths, intervals and holds are in beats, so a change of tempo moves every packet in flight along with it.

### 1.3 Space is time: edge traversal

A packet entering an edge at `at` takes the edge's length then, in units, and keeps it: `depart = at`, `length = toUnits(beats)`, `arrive = depart + length`. It arrives at exactly `arrive`, and its clones depart from the next node at that same time: **the overshoot is kept** (a walk of sixteenths lands every step on its sixteenth). `beats` depends on the edge's timing mode:

**Physical** (`timingMode: 'physical'`) — the edge's on-screen length is its duration:

```
L      = euclidean distance between endpoint node centers (pixels)
beats  = L / pixelsPerBeat            // pixelsPerBeat: global setting, default 200
```

**Fixed** (`timingMode: 'fixed'`, with `durationBeats ≠ null`) — the edge lasts a set number of beats regardless of length:

```
beats = durationBeats
```

An edge of length 0 is arrived at the moment it is entered. A fixed edge with `durationBeats: null` falls back to physical behavior. Moving a node changes the length of packets entering its physical edges afterwards, not of those already on them.

**Default:** new edges are created with the global `defaultEdgeBehaviour`, which defaults to **`'fixed'` with `durationBeats: 1`**. "Space is time" is therefore an opt-in geometry: out of the box, dragging nodes around does not change rhythm until an edge is switched to physical mode (or the global default is changed).

### 1.4 Sources

*Source: `src/core/tick/sources.ts`.*

An auto-triggering source releases at `lastRelease + interval`, in units (`intervalUnits`: `max(toUnits(interval), 1)`), for every such time in the window, and sets `lastRelease` to it: **origin + n × interval**, phase-locked, with no drift between sources. A source releases first at one interval after playback starts (its `lastRelease` is 0 at the start); one whose next release is already past (its interval turned down) releases at the window's start.

The emitted pitch is controlled by `noteIndex` (legacy encoding, still authoritative):

| `noteIndex` | Behavior |
|---|---|
| `-1` **(the default on load)** | random note: `n = 36 + ⌊U(0,1)·49⌋`, i.e. uniform over MIDI 36–84 (C2–C6) |
| `-2`, and any other negative but `−3` | fixed pitch: use `props.midiNote` |
| `−3` | any note of the key: one draw among the notes of the scene's key (else the project's) from MIDI 36 to 84, `keyNotes(root, scale)` low to high |
| `≥ 0` | legacy chromatic offset: `n = 36 + min(36, noteIndex)` (MIDI 36–72); despite the name, this is *not* a scale-degree index in the live engine |

A source created in the editor plays **any note of the key** (`noteIndex: -3`, since 16 Oct 2026), not its `midiNote` (60). The default merged on load stays `−1`, so a file saved without `noteIndex` plays random pitches as before. The UI writes `noteIndex: -2` when a fixed note is chosen.

The spawned payload is: `freq`/`midiNote` as above, `wave: 'sine'`, `timbre: 0`, `cutoff: 20000`, `gain: intensity`, `holdTime: 0`, `releaseTime: 0.1`.

### 1.5 Delays and held packets

A `delay` node holds an arriving packet's payload and re-emits it on all outgoing edges at **arrival + `delayTime` beats**, in units (`releaseAt`), whatever the tempo. Released packets start with fresh anti-explosion metadata (hop count 0). A crossover's parent whose wait ran out is released in the same way. Each held packet also keeps a wall-clock `releaseTime` for drawing.

### 1.6 Flow limits (anti-explosion)

These bounds are part of the temporal behavior — they cap feedback loops and spawn rates:

| Constant | Value | Meaning |
|---|---|---|
| `MAX_PACKETS` | 1000 | global live-packet cap; spawns beyond it are dropped |
| `MAX_PACKET_HOPS` | 64 | a packet lineage expires after 64 node arrivals (at its departure on the 65th edge) |
| `MAX_PACKET_AGE_BEATS` | 50 | a lineage expires 50 beats after its birth, at its exact time |
| `MAX_HOPS_PER_STEP` | 8 | hops one packet's line takes in one window (1.1) |
| `FRONTS_PER_BEAT` | 4 | an edge holds one front per quarter beat of its length (the room on a filament, below) |

Cycles in the graph are allowed; these limits are what make them safe. A loop without a delay lives until its packets run out of hops or age; the room on a filament keeps it from crowding.

**The room on a filament** (`src/core/tick/room.ts`; it replaced `MAX_EDGE_VISITS`, the lap fade, under which a lineage died on its fourth traversal of one edge). No random draws.

- A **front** is the packets that entered one edge **at one exact time**: they count as one and are never thinned apart. A second packet of the same `midiNote` (truncated to an integer) in a front does not enter: a unison collapses to its first packet. A front leaves the room at its exact exit, `entry + length`.
- An edge holds `max(1, ceil(4 × length))` fronts (`filamentCapacity`, the length in units): one per quarter beat, rounded up.
- A packet leaves its edge's room when it arrives, expires or is removed. A new front entering a **full** edge first makes the **oldest** front on it fade: the most hops among its packets (a packet spawned by hand counts 0), and among fronts equally old the last entered, so a stream denser than the room is thinned at its tail while its head still arrives. Its packets are removed at once; nothing is merged or moved. A packet arriving at the fade's own time has arrived and is spared.
- A **chord** is the packets one split put on two edges or more at one time: a source's emission or a manual spawn down several edges, the edges of a node with several outgoing edges (a broadcast splitter, or any node that clones), a teleporter's exits, a delay's release, a crossover's offspring, a turning crystal's stacked step (3.2). A packet passed on along one edge keeps its parent's chord; a delay's release and a crossover's offspring start fresh. When a front fades, every chord in it fades whole, wherever its packets are, and a packet of that chord spawned later does not enter.
- Every spawn enters the room, in order of exact time (1.1). `MAX_PACKETS` counts packets that faded as gone. Copies of many lines reaching an edge at one instant ride as one front, so a loop that doubles its packets is held by their age under `MAX_PACKETS`, not by its count of fronts.

The parallel simulation of non-canvas arrangement channels (section 6) keeps its own tick: frame-quantized, as below, with no room; it keeps only `MAX_PACKETS`.

#### History: frame time (until 16 Oct 2026)

- Every musical event was decided on the frame in which its condition became true, so all timing was quantized to the frame rate (~16.7 ms at 60 fps).
- A packet's `t` advanced by `dt / T` a frame, `T = beats · 60 / B` seconds; it arrived when `t ≥ 1`, the overshoot dropped; `T ≤ 0.1 ms` arrived the same frame.
- A source emitted when `now − lastTrigger ≥ interval · 60000 / B` and set `lastTrigger = now`: each emission's lateness accumulated as phase drift, and independent sources drifted relative to each other.
- A delay's hold was converted to wall-clock at `masterSpeed` (not the scene tempo) when the packet arrived.
- Limits: `MAX_PACKET_AGE_MS` 30 000 (a lineage expired after 30 s); `EDGE_SPAWN_COOLDOWN_MS` 10 (at most one spawn per edge per 10 ms, recorded whether or not the packet entered); the order of a frame was sources, then packets, then delays.
- The room: a front was the packets entering an edge on one frame; an edge held `floor(beats × 4 + 1e-6) + 1` fronts, the "+1" for the one leaving as the next entered.

### 1.7 Bars and meter

There is no time-signature concept. The only place "bar" exists is scene-change quantization (`queueTrigger: 'bar'`), where a bar is **hard-coded as 4 beats**. Phrase quantization uses the scene's `jamTrigger.phraseLength`.

---

## 2. Pitch space

*Source: `src/core/constants.ts`.*

### 2.1 Tuning

Pitch is 12-tone equal temperament anchored at A4 = 440 Hz, addressed by MIDI note number `n ∈ [0, 127]`:

```
f(n) = 440 · 2^((n − 69) / 12)
n(f) = round(69 + 12 · log2(f / 440))
```

Every pitch operation goes through `clampMidi`, which **rounds to the nearest integer and saturates** at 0 and 127 (no wrapping). Microtones cannot survive a pitch operation; `freq` is always recomputed from the integer `midiNote`. Note naming follows `C4 = 60` (`midiToNoteName`: octave = `⌊n/12⌋ − 1`).

### 2.2 Scales

A scale is a set of semitone intervals above a root pitch class. A note `n` is *in key (root, S)* iff `((n mod 12) − root) mod 12 ∈ S`. The full shipped table (verified against standard theory — all thirteen are correct):

| Name | Intervals | Standard identity |
|---|---|---|
| `chromatic` | 0 1 2 3 4 5 6 7 8 9 10 11 | chromatic |
| `major` | 0 2 4 5 7 9 11 | major (Ionian) |
| `minor` | 0 2 3 5 7 8 10 | **natural** minor (Aeolian) |
| `dorian` | 0 2 3 5 7 9 10 | Dorian |
| `phrygian` | 0 1 3 5 7 8 10 | Phrygian |
| `lydian` | 0 2 4 6 7 9 11 | Lydian |
| `mixolydian` | 0 2 4 5 7 9 10 | Mixolydian |
| `locrian` | 0 1 3 5 6 8 10 | Locrian |
| `pentatonic` | 0 2 4 7 9 | **major** pentatonic |
| `minorPentatonic` | 0 3 5 7 10 | minor pentatonic |
| `blues` | 0 3 5 6 7 10 | minor blues (hexatonic: 1 ♭3 4 ♭5 5 ♭7) |
| `wholeTone` | 0 2 4 6 8 10 | whole-tone |
| `diminished` | 0 2 3 5 6 8 9 11 | octatonic, **whole–half** ordering |

A useful structural fact: in every shipped scale the largest gap between adjacent scale tones is 3 semitones, so **every out-of-scale pitch class is exactly 1 semitone from some scale tone**. This makes the harmonic gate's graded "consonance" degenerate in practice (section 5).

### 2.3 Key resolution

Key-aware nodes (`quantizer`, `gate` in harmonic mode) resolve their `(root, scale)` in this order:

1. If the node has `useGlobalKey: false`: its own local `root`/`scale` props.
2. Otherwise: `scenePlayback.effectiveRoot` / `effectiveScale` — the scene-resolved key (`scene.localRoot ?? musicalContext.root`, likewise for scale), refreshed at the same moments as the tempo (section 1.2).
3. The literal fallback `?? musicalContext.*` in the code is nearly dead: `effectiveRoot`/`effectiveScale` are initialized non-null (`0` / `'minor'`), so the global `musicalContext` is only reached through the effective values, never directly. Consequence: changing the global key mid-playback does not affect quantizers until the next play/scene transition; and a brand-new project's playback state says `'minor'` while the global context says `'major'` until first play.

---

## 3. Transformation algebra

*Source: `src/core/engine.ts` (`processNodeArrival`), `src/core/tick/packets.ts`.*

A packet is `{ id, edgeId, t, payload }`; the payload is the complete synthesis recipe:

| Field | Type | Notes |
|---|---|---|
| `freq`, `midiNote` | Hz, 0–127 | always kept consistent via `f(n)` |
| `wave` | `sine\|square\|sawtooth\|triangle\|white\|pink\|brown` | base waveform |
| `timbre` | 0–1 | legacy brightness scalar |
| `cutoff`, `filterType`, `filterResonance`, `filterEnv` | | filter recipe |
| `gain` | 0–1 (−1 is the "killed" sentinel) | amplitude |
| `holdTime`, `releaseTime` | seconds | envelope tail |
| `waves[]` | layer list | oscillator layers (wave, attack, decay, gain, ratio, mode, unison, detune, …): added by a lone oscillator, replaced by a tunnel's voice |
| `vibratoRate/Depth/Delay` | Hz, cents, s | vibrato |
| `modulationValue` | 0–1 | CV value for `targetParam` edges |

### 3.1 Arrival and fan-out

When a packet finishes an edge it is consumed, the target node transforms the payload, and **one clone is spawned on every outgoing audio edge** of that node (subject to the limits in 1.6). Broadcast fan-out is universal — every multi-output node duplicates packets, not just the splitter. A node with no outgoing edges is a sink.

A **speaker** triggers a note (applying its `volume` multiplier and overriding `holdTime`/`releaseTime`) and then *forwards the packet* like any other node if it has outgoing edges; it terminates packets only by being a dead end.

### 3.2 Payload transforms, node by node

Writing `p` for the incoming payload and `p'` for the outgoing one:

- **pitch** — `mode:'shift'`: `n' = clampMidi(n + shift)`. `mode:'set'`: `n' = clampMidi(fixedMidiNote)`. `freq' = f(n')`. `mode:'sequence'` (the turning crystal, 16 Oct 2026): `n' = clampMidi(notes[i])`, then `i = (i + 1) mod len(notes)`; `notes` is a list of MIDI notes or `null`, `[60]` if absent. A `null` is a rest: the packet gets the gain −1 sentinel and goes no further (like a blocked gate, and inside a tunnel it ends the chain). Every packet shares the one index, so two lines through one node interleave. Packets of one chord (1.6) arriving at one exact time take one note and turn it once; packets of no chord each turn it. The index is runtime (`engine.ts`, `turns`, never saved), reset when playback restarts and when the count of `notes` changes; a tunnel's organs each keep their own. Read outside the tick (no arrival moment), the node gives its next note without turning. **Stacked steps** (19 Oct 2026): a step may also be a list of notes, so `notes` is `(n | null | n[])[]`. A one-note list is that note, and an empty list is a rest, like `null`. A stack of k ≥ 2 notes sends the arriving packet on as k packets, one per note in the list's order (each `clampMidi`, `freq` with it), down every outgoing edge: k × edges packets, edge by edge, each edge taking the whole stack in order, **in a new chord** (1.6), as a splitter's split makes one; `MAX_PACKETS` is checked before each. Packets of one chord at one exact time take the same step and turn it once, and each leaves as the stack (the room collapses the unisons downstream). Inside a tunnel, which passes one packet along its organs, a stack gives its lowest note. Read outside the tick, a stack gives its first note and nothing is split. Entangled twins in flight take the stack's first note (`engine.ts` `consumeStack`, `tick/packets.ts`).
- **gain** — `p'.gain = p.gain · value`. Nothing else; the node's `mass` prop is stored but read by nothing in the live engine (see Design horizon).
- **oscillator** — appends one layer `{wave, attack, decay, gain: mix, ratio, mode, modulationIndex, feedback, unison, detune, stereoSpread}` to `p.waves`, and sets `p'.wave = wave`, `p'.timbre = 0.8`. Lone oscillators in a row accumulate layers. Inside a tunnel the chain's first oscillator **replaces** `p.waves` with its one layer instead (19 Oct 2026, a tunnel is a voice; see tunnel below).

  *History: until 19 Oct 2026, every oscillator appended, inside a tunnel too, and nothing removed a layer: a packet looping through a tunnel holding an oscillator gained a layer every lap (each note then synthesised from ever more layers), and a packet that had passed a tunnel kept that voice for ever.*
- **filter** — sets `cutoff`, `filterType` (default lowpass), `filterResonance`; sets `filterEnv = {attack, decay, mod}` iff `mod ≠ 0`, else clears it. Overwrites, does not compose.
- **modulator** — sets `vibratoRate/Depth/Delay` (overwrites).
- **quantizer** — see section 4.3.
- **gate** — see sections 4.1 and 5. A blocked packet is marked `gain = −1`; the arrival handler drops negative-gain packets arriving at gates and tunnels instead of forwarding them.
- **delay** — payload identity; the temporal hold is described in 1.5.
- **splitter** — payload identity; changes *routing* (4.2) and can open an entanglement group.
- **teleporter** — an entry node forwards the processed payload to the outgoing edges of every exit teleporter sharing its `channel` (A–Z), preserving entanglement, subject to flow limits. Exit-side traversal starts at `t = 0`; the hop itself is instantaneous.
- **tunnel** — applies its `subNodes` chain sequentially and synchronously (zero added time). A sub-gate that blocks stops the chain; a sub-speaker plays the current payload and terminates the chain (the packet still exits the tunnel and continues on outgoing edges). Each sub-node is processed with its props over its type's defaults, as a top-level node's props are merged over them on load; a sub-node saved without a prop reads the default (a quantizer without `useGlobalKey` follows the global key). The sub-speaker is the exception: its props are read as written, with their own fallbacks (volume 1, reverb 0.3, pan 0). **A tunnel is a voice** (19 Oct 2026): the first oscillator in the chain dresses the packet, its layer replacing the `waves` the packet came with, as if it came with none; later oscillators in the same chain append, so a tunnel's layers stack within it. A tunnel without an oscillator leaves `waves` alone, and a sub-speaker before the first oscillator plays the layers the packet came with. So a packet looping through a tunnel wears that tunnel's layers on every lap, never more, and a packet passing two tunnels wears only the second's (a lone oscillator after a tunnel still adds to its voice). Nothing else a tunnel's organs set is reset: filters, vibrato and the crystal's note overwrite as on their own, and a sub-gain still multiplies `gain` each lap.
- **lfo** (as a node in an audio path) — stamps `p'.modulationValue` with the LFO's current value; see 3.3.
- **scene_trigger** — payload identity, plus a side effect in jam mode only: `behavior:'jump'` switches scenes immediately; any other value queues the target scene at the next bar (4 beats). Despite the type name `'crossfade'`, no crossfade is performed.
- **mutator**, **crossover** — see 4.4 and 4.5.
- **midi_out**, **midi_cc** — identity. These node types currently have **no engine behavior** (see Design horizon).

**Entanglement:** a splitter with `entangled: true` assigns its clones a shared group id. Whenever an entangled packet is transformed at a node (other than a speaker or splitter), the new payload is copied onto all still-traveling packets of the group — a transform applied to one branch retroactively applies to its siblings.

### 3.3 CV routing (`targetParam` edges)

An edge with `targetParam` set is a control edge, not an audio edge:

- A **packet** arriving over it does not pass through the node's audio transform; instead its `modulationValue` (fallback: `gain`) is written directly into the target node's prop named `targetParam`. One discrete write per arrival.
- An **LFO node** drives its outgoing control edges continuously: every frame, the target prop is overwritten with the LFO's current value. In this continuous path only `sine`, `triangle`, `square`, `sawtooth` are computed; the `random` and `noise` shapes fall through to a constant 0.5 (they work only in the per-packet path of 3.2).

LFO value: `v = min + s(t) · (max − min)` with `t = now_seconds · rate + phase` (phase in cycles) and `s` the normalized shape in [0, 1].

Valid targets are literal prop names of the target node, as offered by the edge panel: `volume`, `pan`, `reverb` (speaker); `cutoff`, `mod` (filter); `probability`, `harmonicThreshold`, `energyThreshold`, `densityThreshold` (gate); `value` (gain); `delayTime` (delay); `rate`, `depth` (modulator); `mix`, `attack`, `decay` (oscillator); `interval`, `intensity` (source); `strength` (quantizer). There is no pitch-bend CV target. Writing a name the target never reads is a silent no-op.

---

## 4. Stochastic processes

All draws are independent `Math.random()` calls.

### 4.1 Gate as a Bernoulli trial

In `mode: 'probability'` (the default, `probability: 0.5`), each packet survives with probability `p` and is killed with probability `1 − p` — a Bernoulli(p) filter, memoryless and uncorrelated between packets. The fitness modes (`harmonic`, `energy`, `density`, `all`) are **deterministic**; see section 5.

### 4.2 Splitter as a categorical distribution

With outgoing edges `e_1 … e_k`:

- `behavior: 'broadcast'` (default) — duplication: every edge gets a clone (this is also what every non-splitter node does).
- `behavior: 'random'` — exactly one edge is chosen uniformly, `P(e_i) = 1/k`.
- `behavior: 'weighted'` — exactly one edge is chosen with `P(e_i) = w_i / Σ_j w_j`, where `w_i` is the **edge's** `weight` prop (default 1). Weights live on edges, not on the splitter, which is what makes probabilistic (Markov-style) graph walks composable.

### 4.3 Quantizer

`strength` is a per-packet **probability of quantizing at all**: with probability `1 − strength` the packet passes untouched; otherwise it is fully snapped. It is not a partial pitch pull — there are no intermediate positions.

Given the resolved key (2.3):

**`mode: 'nearest'`** — let `pc = n mod 12`, and let `q` be the in-key pitch class minimizing the circular semitone distance `d(pc, q) = min(|pc − q|, 12 − |pc − q|)`. Ties are broken deterministically by scale order: the first tied tone encountered while walking the interval list upward from the root wins. The output is the representative of `q` within 6 semitones of `n` (the `±12` correction guarantees `|n' − n| ≤ 6`), then clamped. Octave register is preserved up to that correction.

**`mode: 'random'`** — the incoming pitch is **discarded** entirely. A scale degree index is drawn from the categorical distribution defined by `weights` (keyed by degree index; indices beyond the current scale's length are ignored). With no weight entries the draw is uniform over all scale degrees; with entries that sum to zero it is uniform over the listed degree indices only. The output is:

```
n' = defaultPitch · 12 + (root + S[degree]) mod 12
```

`defaultPitch` is a raw MIDI octave block index: `defaultPitch: 4` (the default, labeled "Default Octave" in the UI) yields MIDI 48–59, i.e. **C3–B3** in the app's own note naming — one octave below middle C, not the C4 octave the name suggests.

### 4.4 Mutator as a random walk

Each arriving packet mutates with probability `probability` (default 0.5); otherwise identity. Only properties listed in `targets` (default `['pitch']`) are touched.

`mode: 'drift'` — small additive perturbations, a bounded random walk across a packet's lineage:

| Target | Transform |
|---|---|
| pitch | `n' = clampMidi(round(n + U(−δ, δ)))`, `δ = pitchDrift` (default 2 semitones) |
| gain | `g' = clamp01(g + U(−δ, δ))`, `δ = gainDrift` |
| cutoff | `c' = clamp(c · (1 + U(−δ, δ)), 20, 20000)`, `δ = cutoffDrift` (multiplicative) |
| timbre | `± U(0, 0.1)` clamp01 |

`mode: 'radiation'` — large jumps and resampling:

| Target | Transform |
|---|---|
| pitch | `n' = clampMidi(round(n + U(−r, r)))`, `r = pitchRadiation` (default 12) |
| gain | resampled `~ U(0, 1)` |
| cutoff | resampled `~ U(200, 20000)` |
| wave | uniform over `{sine, square, sawtooth, triangle}` (requires `waveChange: true`) |
| timbre | resampled `~ U(0, 1)` |

### 4.5 Crossover as recombination

*Source: `src/core/tick/packets.ts`, `src/core/tick/crossover.ts`.*

A crossover node holds the first arriving packet (parent A) for up to `timeout` beats (converted at `masterSpeed`). When a second packet (parent B) arrives:

- **within the window** — both parents are consumed and one offspring is spawned on each outgoing edge, built gene-by-gene:
  - pitch: from A, from B, rounded average, or a fair coin (`pitchFrom`);
  - wave: from A, from B, or a fair coin (`waveFrom`);
  - gain: average, max, min, or a fair coin (`gainMode`);
  - `timbre`/`cutoff`/`holdTime`/`releaseTime`: per-gene fair coin (`inheritance:'random'`), all-A, all-B, or arithmetic blend;
  - wave layers: interleaved by index (even indices prefer A, odd prefer B, falling back to whichever parent has a layer there).
- **after the window** — the stale parent A is silently discarded and B passes through unchanged.

Two implementation facts worth knowing: a timed-out parent is only reaped when a *later* packet arrives (no background release — with no second arrival, the held payload sits indefinitely and never sounds), and a lone parent therefore never "passes through on timeout".

---

## 5. Selection: harmonic fitness as it actually works

*Source: `src/core/engine.ts`, `processGate`, fitness modes.*

The gate's `harmonic` mode is a **scale-membership distance test, not a psychoacoustic consonance model**. It knows nothing about interval quality, roughness, or harmonic context — a tritone above the root that happens to be in scale scores as high as the tonic. The exact computation, per packet:

```
rel = ((n mod 12) − root) mod 12
if rel ∈ S:            survive                       (implicit score 1)
else:
    d  = min over q ∈ S_pc of circular semitone distance(pc, q)   // d ∈ 1..6
    c  = 1 − d/6                                     // "consonance" in [0, 5/6]
    survive iff c ≥ harmonicThreshold
```

Because every shipped scale has a maximum inter-tone gap of 3 semitones (section 2.2), `d = 1` for **every** out-of-scale pitch class, so `c = 5/6 ≈ 0.833` always. The graded formula is therefore binary in practice:

- `harmonicThreshold ≤ 0.833` → everything passes. **The default (0.5) makes the harmonic gate a no-op.**
- `harmonicThreshold > 0.833` → strict in-scale filter.

The gradient could only matter for user-defined scales with gaps ≥ 5 semitones, which cannot currently be created.

The other fitness criteria (combined with AND under `mode: 'all'`, checked in the order harmonic → energy → density):

- **energy** — survive iff `gain ≥ energyThreshold` (default 0.1).
- **density** — the node counts arrivals in a window of one beat of **master** BPM (wall-clock, via the node's `timer`/`lastTrigger`; the window restarts when an arrival comes more than one beat after the window opened). A packet dies when the count within the window exceeds `densityThreshold` (default 8). Deterministic given arrival times.

The evolutionary loop the system supports is thus: sources and mutators generate variation (4.4), crossover recombines (4.5), gates select — by chance (4.1), by scale membership, by amplitude, or by crowding — and dead ends discard.

---

## 6. Scenes: key and tempo inheritance

*Source: `src/core/constants.ts`, `src/core/tick/scene-playback.ts`.*

A scene may override the global musical context; `null` means inherit:

```
effectiveBpm   = scene.localBpm   ?? masterSpeed
effectiveRoot  = scene.localRoot  ?? musicalContext.root
effectiveScale = scene.localScale ?? musicalContext.scaleName
```

These are snapshotted into `scenePlayback` at the resolution points listed in 1.2, and consumed by edge traversal, source intervals, and key-aware nodes. Playback modes: **arrangement** (slots on a beat timeline, auto-advance, playback stops at the end) and **jam** (current scene loops indefinitely; scene changes are user- or `scene_trigger`-initiated, quantized to `immediate`/`beat`/`bar` (= 4 beats)/`phrase`). Non-canvas arrangement channels run a parallel, simplified packet simulation per channel with the channel scene's own `localBpm`.

---

## 7. Synthesis handoff

*Source: `src/audio/engine.ts`.*

When a speaker fires, the payload is sent verbatim to an AudioWorklet synth: base wave plus accumulated `waves[]` layers (each with its own AHD-style attack/decay, gain, frequency `ratio`, additive/ring/FM mode, unison/detune), the filter recipe (`cutoff`, type, resonance, optional envelope `cutoff + mod · env(t)`), vibrato, `holdTime`/`releaseTime`, pan and reverb send from the speaker's props. Envelope shape is attack → hold → decay; when layers exist, the master envelope uses the longest layer attack/decay. The musical model's contract ends at this handoff; DSP details live in the audio layer.

MIDI **file** export exists (offline compiler renders speaker hits to a `.mid`); it is unrelated to the `midi_out`/`midi_cc` node types (see below).

---

## 8. Design horizon (documented intentions, not implemented)

Everything in this section has visible surface (props, settings, UI, or older docs) but **no effect in the live engine**. Documented here so the surface is not mistaken for behavior.

### 8.1 Gravity

The intended feature: heavy nodes slow approaching packets, producing emergent ritardando. Current reality:

- `calculatePacketSpeed` and `calculateGravityDrag` exist in `src/core/engine.ts` but are **called from nowhere** — the tick loop computes traversal inline with no gravity term.
- `GainProps.mass`, `globalSettings.gravityConstant` (default 0.5), and the Settings-modal "Gravity Constant" slider are stored and persisted but never read by the simulation.
- The dead `calculateGravityDrag` implements an inverse-square field sum (`Σ mass/d²` over nodes within 150 px, scaled by the constant), which is *not* the `speed · (1 − G·mass)` formula older docs described; neither formula is live.
- The `gravity_tempo` example claims to demonstrate the effect; it cannot (and its "heavy" node does not even set `mass`).

Until a chosen formula is wired into `updatePackets`, mass and gravity are inert.

### 8.2 Live MIDI output

`midi_out` and `midi_cc` node types exist with full props (`channel`, `duration`, `velocityScale`, `ccNumber`) and UI, but `processNodeArrival` has no case for them and no tick code emits MIDI. Packets pass through unchanged and silently.

### 8.3 Scene-trigger crossfade

`SceneTriggerProps.behavior` is typed `'jump' | 'crossfade'`, but `'crossfade'` currently means "queue at next bar"; no audio or visual crossfade occurs. The `ScenePlaybackState.isTransitioning`/`transitionProgress` fields exist for it and stay unused.

### 8.4 Miscellaneous inert surface

- `globalSettings.subdivisions` (default 4): stored, persisted, read by nothing.
- LFO `random`/`noise` shapes in the continuous CV path (they emit a constant 0.5 there; only the per-packet path implements them).
- `projectMeta.rootNote/scale/gravity`: shadow copies of live state, not consulted by the engine.
- "Entanglement nodes" from the conceptual framework: splitter entanglement (3.2) is implemented; standalone entangled node pairs are not.

---

## References

- `src/core/constants.ts` — scales, tuning, defaults, scene inheritance helpers
- `src/core/engine.ts` — per-node payload transforms
- `src/core/tick/` — clock, sources, packet movement, crossover, scenes, LFO
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) · [Dataflow programming](https://en.wikipedia.org/wiki/Dataflow_programming)
