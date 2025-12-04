# AIGA / Qbeat: Conceptual & Theoretical Framework

## 1. Core Philosophy: Music as Graph Physics

The Audio Interactive Graph Application (AIGA), conceptually known as **Qbeat**, represents a paradigm shift from linear, timeline-based music creation (DAWs, Piano Rolls) to a **spatial, discrete-event simulation**.

In this framework, music is not "played back" from a recording; it is **simulated** in real-time. The composition is a living system defined by topology (connections) and physics (rules of travel), rather than a fixed sequence of events.

### 1.1 The Fundamental Equation
$$ Rhythm = \frac{Distance}{Velocity} $$

In AIGA, **Space is Time**.
- An **Edge** is not just a connection; it is a duration.
- A **Packet** traveling along an edge represents a rhythmic interval.
- Changing the visual layout of the graph inherently changes the musical rhythm.

## 2. The Quantum Metaphor

The framework borrows heavily from quantum mechanics to describe how sound is generated and manipulated.

### 2.1 The Packet (The Wavefunction)
The fundamental unit of the system is the **Packet**.
- **State:** It carries "DNA" or "Quantum State" — Pitch, Intensity (volume), Timbre parameters, Waveform type.
- **Silence:** A packet traveling through the graph is **silent**. It represents *potential* energy or a probability wave.
- **Superposition:** When a packet hits a **Splitter** node, it can duplicate. Conceptually, this is a single musical idea existing in multiple states simultaneously until observed.
- **Intensity:** Each packet carries an intensity value (0-1) that determines how loud it will play when observed. This can be set at the **Source** and modified by **Gain** nodes.

### 2.2 The speaker (The Observer)
Sound is only produced when a Packet enters an **speaker** node.
- **Collapse:** This is the "Observation Collapse." The potential energy of the packet is converted into kinetic acoustic energy.
- **Localization:** Sound happens *at* the speaker. This allows for spatial mixing where the location of the speaker on the canvas could dictate stereo panning or spatial audio positioning.
- **Master Volume:** Each speaker has a master volume control that scales the final output of all packets it receives.

### 2.3 Tunnelling
The **Tunnel** node represents a wormhole in the graph.
- It encapsulates complex logic (sub-graphs).
- Travel through a Tunnel is instantaneous (or strictly defined), decoupling the internal complexity from the external rhythmic structure.

## 3. The Biological Metaphor (Theoretical Extension)

While the current implementation focuses on physics, the architecture supports an evolutionary biology interpretation ("The Living Graph").

### 3.1 Sound as DNA
The properties of a packet (e.g., `{ note: "C4", wave: "sawtooth", reverb: 0.3 }`) act as its genome.

### 3.2 Mutation
As packets travel through **Modifier Nodes** (Pitch shifters, Polarisers, Harmonics, Modulators, Gain), their DNA is altered.
- A **Pitch Node** is a mutation of the frequency gene.
- A **Polariser** is a mutation of the timbre gene (waveform shape).
- A **Harmonic Node** adds overtone genes at integer frequency ratios.
- A **Modulator Node** adds vibrato expression genes (periodic pitch variation).
- A **Noise Node** adds textural genes (breath, bow friction, transients).
- A **Gain Node** is a mutation of the intensity gene.
- A **Filter Node** with envelope is an expression gene (dynamic brightness).

### 3.3 Natural Selection (Filters)
A **Filter Node** or **Gate Node** acts as an environmental pressure.
- A "Scale Quantizer" (theoretical) would kill any packet not in the correct key.
- A "Probability Gate" introduces stochastic survival rates.
- Only the "fittest" musical ideas (those that navigate the graph to an speaker) survive to be heard.

## 4. System Architecture

### 4.1 The Graph Topology
- **Nodes**: Operators. They transform state or generate events.
- **Edges**: Transport rails. They define the temporal structure.
- **Payloads**: The transient data structures moving through the system.

### 4.2 The Audio Engine
The audio engine is a slave to the graph simulation. It does not "know" the song. It simply reacts to `PacketArrived` events at `speaker` coordinates. This decouples the composition logic (Graph) from the sound generation (Synth), allowing for:
- **Hot-swapping synthesis engines** (e.g., switching from Web Audio to MIDI out).
- **Visual-only modes** (silent simulation).

## 5. Theoretical Improvements & Novel Ideas

### 5.1 Entanglement Nodes
**Concept:** Two nodes (A and B) are "entangled."
**Mechanism:** When a packet passes through Node A and its pitch is shifted, the *next* packet passing through Node B is automatically shifted by the inverse amount, regardless of distance.
**Musical Result:** Instantaneous counter-balancing of melody lines without direct connection.

### 5.2 Gravity Wells (Tempo Warping)
**Concept:** High-density clusters of nodes create "gravity."
**Mechanism:** Packets slow down (edges effectively lengthen) when passing near complex clusters.
**Musical Result:** Rubato and organic tempo fluctuations that emerge naturally from the complexity of the composition.

### 5.3 The "Heisenberg" Uncertainty Node
**Concept:** You can know the Pitch or the Rhythm, but not both precisely.
**Mechanism:** A node that quantizes pitch perfectly but adds random timing jitter, OR quantizes timing perfectly but adds random pitch drift.

### 5.4 Retrograde Travel (Time Reversal)
**Concept:** Edges that allow bi-directional flow.
**Mechanism:** A "Bounce" node that sends a packet back the way it came, inverting its transformations (e.g., a +5 semitone shift becomes -5 on the way back).
