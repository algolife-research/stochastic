# Phonon: Algorithmic Music Case Studies

This document serves as both a historical overview of generative music and a practical guide to implementing these concepts within the Phonon framework. By leveraging Phonon's graph-based topology and physics-based timing, we can recreate seminal techniques from music history and explore new frontiers in visual music.

---

## 1. The Dice Games (18th Century)
**Historical Context:** Long before computers, composers like **W.A. Mozart** created "Musikalisches Wrfelspiel" (Musical Dice Games). These systems allowed anyone to compose a minuet by rolling dice to select pre-written measures of music. This was an early form of **aleatoric music**music determined by chance.

### Implementation in Phonon
In Phonon, we replace dice with **Splitters** and **Gates**.

**The "Mozart" Patch:**
1.  **The Trigger:** A `Source` node provides the pulse (the "roll").
2.  **The Choice:** A `Splitter` node creates diverging paths.
3.  **The Outcome:**
    *   **Path A:** Leads to a `Pitch` node (+0 semitones) -> `Speaker`.
    *   **Path B:** Leads to a `Pitch` node (+4 semitones) -> `Speaker`.
    *   **Path C:** Leads to a `Pitch` node (+7 semitones) -> `Speaker`.
4.  **The Probability:** By placing `Gate` nodes on these paths with different probability settings (e.g., 33%), the system randomly selects which melodic fragment to play on each pulse.

---

## 2. Stochastic Clouds (1950s)
**Historical Context:** **Iannis Xenakis** pioneered "Stochastic Music," using mathematical laws of probability (like gas kinetics) to control masses of sound. Instead of writing individual notes, he sculpted "clouds" of sound density and texture, most famously in works like *Pithoprakta*.

### Implementation in Phonon
Phonon's particle system is naturally suited for this. We use **Topology** to create statistical density.

**The "Xenakis" Cloud:**
1.  **The Engine:** A `Source` node set to a very fast interval (e.g., 50ms) creates a stream of "particles."
2.  **The Scatter:** This feeds into a "Shotgun" array of multiple `Splitter` nodes, creating 16+ parallel paths.
3.  **The Uncertainty:**
    *   **Timbre:** Paths pass through `Polariser` nodes with different waveforms (Sine, Saw, Square) to vary the texture.
    *   **Pitch:** Paths pass through `Pitch` nodes with dissonant intervals or microtonal shifts.
    *   **Filtering:** `Gate` nodes set to low probabilities (10-30%) thin out the density randomly.
4.  **The Collision:** All paths converge on a cluster of `Speaker` nodes placed spatially around the canvas.
5.  **Result:** A granular cloud of sound. The "density" is controlled by the Source rate, and the "texture" by the probability Gates.

---

## 3. Process Music & Phasing (1960s)
**Historical Context:** **Steve Reich** developed "Process Music," where audible processes determine the structure. In *Piano Phase*, two identical patterns play at slightly different speeds, slowly drifting out of phase to create complex, shifting rhythmic interplay.

### Implementation in Phonon
In Phonon, **Distance = Time**. This allows for organic, non-grid-based phasing that is difficult to achieve in standard DAWs.

**The "Reich" Phase:**
1.  **The Loop:** Create a circular graph (Source -> Node A -> Node B -> Source). This creates a repeating loop.
2.  **The Clone:** Duplicate the entire graph structure.
3.  **The Drift:**
    *   **Loop 1:** The edges are standard length (e.g., 100px).
    *   **Loop 2:** Manually drag the nodes of the second loop slightly closer together, making the total circumference 990px instead of 1000px.
4.  **Result:** The packet in Loop 2 travels slightly faster. Over minutes, it will drift ahead of Loop 1, creating the classic phasing effect purely through geometry.

---

## 4. Generative Ambient (1970s)
**Historical Context:** **Brian Eno** coined "Ambient Music" and popularized generative systems that could run indefinitely. In *Music for Airports*, tape loops of different lengths overlapped to create a constantly evolving, non-repeating composition.

### Implementation in Phonon
We use **Feedback Loops** and **Delay Lines** to create self-regulating systems.

**The "Eno" Bloom:**
1.  **The Clock:** A very slow `Source` (1 trigger every 10 seconds).
2.  **The Bloom:** The Source feeds a `Splitter` with 4 outputs.
3.  **The Paths:**
    *   **Path 1:** Short physical distance -> Low Pitch -> Reverb Speaker.
    *   **Path 2:** Medium physical distance -> High Pitch -> Filter -> Speaker.
    *   **Path 3:** Long physical distance -> Chord structure -> Speaker.
4.  **The Feedback:** The output of Path 3 loops back to the beginning but passes through a `Gate` (50% chance).
5.  **Result:** A sparse, evolving soundscape that never repeats exactly the same way, as packets occasionally recirculate to create new layers.

---

## 5. Algorithmic IDM (1990s - Present)
**Historical Context:** Artists like **Autechre** and **Aphex Twin** use complex logic systems (Max/MSP) to create intricate, glitchy, and highly modulated electronic music. The focus is on parameter modulation and conditional logic.

### Implementation in Phonon
We use **Control Voltage (CV)** logic, where packets don't just make soundthey control other nodes.

**The "Glitch" Machine:**
1.  **The Carrier:** A standard drum loop created by a Source and Speakers.
2.  **The Modulator:** A separate, chaotic graph structure (the "LFO").
3.  **The Connection:** Connect the Modulator graph to the properties of the Carrier graph.
    *   *Example:* A packet arriving at Node X changes the `Decay` of the Hi-Hat Speaker.
    *   *Example:* A packet arriving at Node Y changes the `Interval` of the Kick Source.
4.  **Result:** The drum loop is constantly "broken" and reconstructed by the logic of the second graph, creating evolving, intelligent dance music.

---

## 6. Visual Music & Synesthesia (The Future)
**Historical Context:** From **Oskar Fischinger's** optical poems to modern VJ culture, the link between sound and image has always been sought. Phonon bridges this by making the *score itself* the visual art.

### Implementation in Phonon
The **Visualization Modes** are not just post-processing; they are representations of the underlying data flow.

**The Synesthetic Score:**
1.  **Geometric Mode:** Use for structured, rhythmic pieces (Bach/Reich). The sharp lines and clear trajectories emphasize the mathematical precision.
2.  **Particles Mode:** Use for stochastic/granular pieces (Xenakis). The explosion of particles visualizes the statistical density of the sound.
3.  **Waves Mode:** Use for ambient/drone pieces (Eno). The interference patterns visualize the slow modulation and beating frequencies of the audio.
4.  **Kaleidoscope Mode:** Use for IDM/Pattern music. The symmetry emphasizes the recursive nature of the logic loops.

By composing with the *visual output* in mind, you create a true multimedia work where the audience sees the music and hears the geometry.
