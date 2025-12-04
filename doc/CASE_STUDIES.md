# AIGA / Qbeat: Case Studies

This document explores how specific musical theories and historical compositional techniques can be implemented using the AIGA/Qbeat framework.

## Case Study 1: J.S. Bach & The Art of the Fugue
**Concept:** Counterpoint, Canon, and Fugue.
**Challenge:** Creating independent, interlocking melodic lines from a single thematic idea.

### Implementation in AIGA
In a linear sequencer, you copy-paste MIDI clips. In AIGA, you **fork the geometry**.

#### The Canon
1.  **The Subject:** A `Source` node feeds into a sequence of `Pitch` nodes that define the melody (e.g., C -> G -> A -> G).
2.  **The Fork:** A `Splitter` node is placed immediately after the Source.
3.  **Voice 1 (Leader):** Path A goes directly to `speaker 1` (Left Channel).
4.  **Voice 2 (Follower):** Path B travels through a long, winding chain of `Edge` segments (or a dedicated `Delay` node). This physical distance creates the temporal delay (e.g., 2 bars).
5.  **Result:** The melody plays against itself perfectly.

#### The Fugue (Transposition)
1.  **Subject:** Same as above.
2.  **Answer:** The delayed path (Voice 2) passes through a `Pitch` node set to **+7 semitones** (Perfect 5th) before reaching `speaker 2`.
3.  **Result:** A real-time generative fugue where changing the Source interval automatically updates both the Subject and the Answer.

---

## Case Study 2: Iannis Xenakis & Stochastic Music
**Concept:** Music determined by probability, mass events, and "clouds" of sound rather than melody.
**Challenge:** Generating high-density textures that are statistically controlled but locally random.

### Implementation in AIGA
Xenakis used manual calculations. AIGA uses **Topology**.

#### The Pithoprakta Cloud
1.  **The Engine:** A `Source` node set to "Auto-Trigger" with a very fast interval (e.g., 50ms).
2.  **The Scatter:** This feeds into a "Shotgun" array of `Splitter` nodes, creating 16 parallel paths.
3.  **The Uncertainty:**
    *   **Path A-D:** Pass through `Pitch` nodes with random values (if Randomizer exists) or fixed dissonant intervals.
    *   **Path E-H:** Pass through `Gate` nodes set to 30% probability.
    *   **Path I-P:** Pass through `Polariser` nodes modulating timbre.
4.  **The Collision:** All paths converge on a cluster of `speaker` nodes placed spatially around the canvas.
5.  **Result:** A granular cloud of sound. The "density" of the cloud is controlled by the Source rate. The "texture" is controlled by the probability Gates.

---

## Case Study 3: Steve Reich & Phasing
**Concept:** Process Music. Two identical patterns playing at slightly different speeds, slowly drifting out of phase.
**Challenge:** Achieving non-integer tempo relationships.

### Implementation in AIGA
In AIGA, **Distance = Time**.

#### Piano Phase
1.  **The Loop:** Create a circular graph (Source -> A -> B -> C -> Source). This creates a repeating loop.
2.  **The Clone:** Duplicate the entire graph structure.
3.  **The Drift:**
    *   **Loop 1:** The edges are standard length (e.g., 100px).
    *   **Loop 2:** Manually drag the nodes of the second loop slightly closer together, making the total circumference 990px instead of 1000px.
4.  **Result:** The packet in Loop 2 travels slightly faster. Over minutes, it will drift ahead of Loop 1, creating the classic phasing effect purely through geometry.

---

## Case Study 4: Brian Eno & Generative Ambient
**Concept:** Systems that generate music with minimal input. "As ignorable as it is interesting."

### Implementation in AIGA
1.  **The Clock:** A very slow `Source` (1 trigger every 10 seconds).
2.  **The Bloom:** The Source feeds a `Splitter` with 4 outputs.
3.  **The Paths:**
    *   Path 1: Short delay -> Low Pitch -> Reverb speaker.
    *   Path 2: Medium delay -> High Pitch -> Filter -> speaker.
    *   Path 3: Long delay -> Chord Node -> speaker.
4.  **The Feedback:** The output of Path 3 loops back to the beginning but with a `Gate` (50% chance).
5.  **Result:** A sparse, evolving soundscape that never repeats exactly the same way, as packets occasionally recirculate to create layers.
