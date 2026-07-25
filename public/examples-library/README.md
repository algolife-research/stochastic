# Stochastic Example Library

The example library for [Stochastic](https://github.com/algolife-research/stochastic) —
fetched on demand by the app and cached client-side.

## Layout

```
index.json          manifest: version, categories, example + composition lists
examples/*.json     in-app graph examples (Example format: nodes/edges or scenes)
compositions/*.sto  full serialized compositions (Dune suite, showcase pieces, ...)
```

The app resolves the library from `VITE_EXAMPLES_BASE_URL` (falling back to
`/examples-library` served next to the app). Point that at this content's raw
URL to host the library independently of app deployments.

## Contributing an example

1. **Graph example**: add `examples/<snake_case_key>.json` following the
   `Example` shape (`name`, `category`, `description`, `bpm`, then either
   `nodes` + `edges` or `scenes`). Categories: Tutorials, Demos, Synthesis,
   Generative, Effects & Routing, Composition, Physics & Timing, Orchestral,
   Evolutionary.
2. **Full composition**: save your piece in the app (File → Save) and add the
   `.sto` file under `compositions/`, named in `snake_case` after the piece.
3. Regenerate the manifest: `node scripts/export-example-library.mjs`
   (bumps the manifest version, which invalidates client caches).

The app validates every fetched example (node types, prop names, edge
integrity) before loading it, and the main repo's test suite runs the same
rules over this library while it is staged in-tree.
