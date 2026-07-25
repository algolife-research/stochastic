// Validation suite for the example library.
// These tests keep every example loadable, audible, and free of silent prop
// typos (unknown props are silently merged by updateNodeProps, so a typo like
// `prob:` instead of `probability:` produces no error at runtime — only here).
//
// Coverage: the bundled fallback set (examples.ts) plus every JSON example in
// the static library (public/examples-library) while it is staged in-tree.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { BUNDLED_EXAMPLES, EXAMPLE_CATEGORIES } from './examples';
import type { Example, ExampleNode, ExampleEdge } from './examples';
import { validateExample } from './example-library';
import { getDefaultProps } from '@core/constants';
import { isValidNodeType } from '@core/type-guards';
import type { NodeType } from '@core/types';

// Load the full library from disk when staged in-tree (falls back to bundled
// only when the library has moved fully to its own repo)
const LIBRARY_DIR = path.resolve(__dirname, '../../public/examples-library/examples');
const libraryExamples: Record<string, Example> = {};
if (existsSync(LIBRARY_DIR)) {
  for (const file of readdirSync(LIBRARY_DIR).filter(f => f.endsWith('.json'))) {
    libraryExamples[file.replace('.json', '')] = JSON.parse(
      readFileSync(path.join(LIBRARY_DIR, file), 'utf8')
    ) as Example;
  }
}

const EXAMPLES: Record<string, Example> = { ...libraryExamples, ...BUNDLED_EXAMPLES };

interface FlatScene {
  label: string;
  nodes: ExampleNode[];
  edges: ExampleEdge[];
}

/** Normalize single-scene and multi-scene examples into a common shape. */
function scenesOf(key: string, example: Example): FlatScene[] {
  if (example.scenes && example.scenes.length > 0) {
    return example.scenes.map((s, i) => ({
      label: `${key}/scene[${i}] "${s.name}"`,
      nodes: s.nodes,
      edges: s.edges,
    }));
  }
  return [{ label: key, nodes: example.nodes ?? [], edges: example.edges ?? [] }];
}

/** Node ids reachable from `start` following edges forward. */
function reachableFrom(start: string, edges: ExampleEdge[]): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    const list = adjacency.get(e.from) ?? [];
    list.push(e.to);
    adjacency.set(e.from, list);
  }
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

const allExamples = Object.entries(EXAMPLES);

describe('runtime validator', () => {
  it('accepts every example in the library', () => {
    for (const [key, example] of allExamples) {
      expect(validateExample(example), `validator rejected "${key}"`).toEqual([]);
    }
  });

  it('rejects malformed examples', () => {
    expect(validateExample(null).length).toBeGreaterThan(0);
    expect(validateExample({ name: 'x', bpm: 0 }).length).toBeGreaterThan(0);
    expect(
      validateExample({
        name: 'bad', category: 'Demos', description: 'd', bpm: 100,
        nodes: [{ id: 'a', type: 'not_a_node', x: 0, y: 0, props: {} }],
        edges: [],
      }).length
    ).toBeGreaterThan(0);
    expect(
      validateExample({
        name: 'bad-prop', category: 'Demos', description: 'd', bpm: 100,
        nodes: [{ id: 'a', type: 'gate', x: 0, y: 0, props: { prob: 0.5 } }],
        edges: [],
      }).length
    ).toBeGreaterThan(0);
  });
});

describe('example library', () => {
  it('has at least one example per declared category', () => {
    const used = new Set(allExamples.map(([, ex]) => ex.category));
    for (const category of EXAMPLE_CATEGORIES) {
      expect(used, `category "${category}" has no examples`).toContain(category);
    }
  });

  it('uses snake_case keys', () => {
    for (const [key] of allExamples) {
      expect(key, `example key "${key}" is not snake_case`).toMatch(/^[a-z0-9_]+$/);
    }
  });

  describe.each(allExamples)('%s', (key, example) => {
    const scenes = scenesOf(key, example);

    it('declares a known category and non-empty metadata', () => {
      expect(EXAMPLE_CATEGORIES).toContain(example.category);
      expect(example.name.length).toBeGreaterThan(0);
      expect(example.description.length).toBeGreaterThan(0);
      expect(example.bpm).toBeGreaterThan(0);
    });

    it('uses only valid node types and known props', () => {
      for (const scene of scenes) {
        for (const node of scene.nodes) {
          expect(isValidNodeType(node.type), `${scene.label}: invalid node type "${node.type}"`).toBe(true);
          const knownProps = new Set(Object.keys(getDefaultProps(node.type)));
          for (const propKey of Object.keys(node.props)) {
            expect(
              knownProps.has(propKey),
              `${scene.label}: node "${node.id}" (${node.type}) has unknown prop "${propKey}"`
            ).toBe(true);
          }
          // Tunnels: validate sub-node types and props too
          if (node.type === 'tunnel') {
            const subNodes = (node.props.subNodes ?? []) as Array<{ type: NodeType; props: Record<string, unknown> }>;
            for (const sub of subNodes) {
              expect(isValidNodeType(sub.type), `${scene.label}: tunnel "${node.id}" has invalid sub-node type "${sub.type}"`).toBe(true);
              const knownSubProps = new Set(Object.keys(getDefaultProps(sub.type)));
              for (const subProp of Object.keys(sub.props)) {
                expect(
                  knownSubProps.has(subProp),
                  `${scene.label}: tunnel "${node.id}" sub-node (${sub.type}) has unknown prop "${subProp}"`
                ).toBe(true);
              }
            }
          }
        }
      }
    });

    it('has unique node ids and edges that reference existing nodes', () => {
      for (const scene of scenes) {
        const ids = new Set<string>();
        for (const node of scene.nodes) {
          expect(ids.has(node.id), `${scene.label}: duplicate node id "${node.id}"`).toBe(false);
          ids.add(node.id);
        }
        for (const edge of scene.edges) {
          expect(ids.has(edge.from), `${scene.label}: edge "${edge.id}" from unknown node "${edge.from}"`).toBe(true);
          expect(ids.has(edge.to), `${scene.label}: edge "${edge.id}" to unknown node "${edge.to}"`).toBe(true);
        }
      }
    });

    it('can produce sound (a source reaches a speaker in at least one scene)', () => {
      const audible = scenes.some(scene => {
        const speakers = new Set(scene.nodes.filter(n => n.type === 'speaker').map(n => n.id));
        return scene.nodes
          .filter(n => n.type === 'source')
          .some(source => {
            const reached = reachableFrom(source.id, scene.edges);
            return [...speakers].some(speaker => reached.has(speaker));
          });
      });
      expect(audible, `${key}: no source reaches a speaker — the example is silent`).toBe(true);
    });

    it('pins noteIndex on sources that specify a melody note', () => {
      // noteIndex defaults to -1 = "random note"; a source that sets midiNote
      // without noteIndex < -1 silently plays random pitches instead.
      for (const scene of scenes) {
        for (const node of scene.nodes) {
          if (node.type !== 'source') continue;
          if (!('midiNote' in node.props)) continue;
          const noteIndex = node.props.noteIndex as number | undefined;
          expect(
            typeof noteIndex === 'number' && noteIndex !== -1,
            `${scene.label}: source "${node.id}" sets midiNote but noteIndex is ${noteIndex ?? 'unset (random!)'} — use noteIndex: -2 for a fixed pitch`
          ).toBe(true);
        }
      }
    });

    it('wires every LFO to a modulation target', () => {
      for (const scene of scenes) {
        for (const node of scene.nodes) {
          if (node.type !== 'lfo') continue;
          const modEdges = scene.edges.filter(e => e.from === node.id && e.targetParam);
          expect(
            modEdges.length,
            `${scene.label}: LFO "${node.id}" modulates nothing (orphan)`
          ).toBeGreaterThan(0);
        }
      }
    });

    it('modulation edges target props that exist on the target node', () => {
      for (const scene of scenes) {
        const nodesById = new Map(scene.nodes.map(n => [n.id, n]));
        for (const edge of scene.edges) {
          if (!edge.targetParam) continue;
          const target = nodesById.get(edge.to);
          if (!target) continue;
          const knownProps = new Set(Object.keys(getDefaultProps(target.type)));
          expect(
            knownProps.has(edge.targetParam),
            `${scene.label}: edge "${edge.id}" modulates unknown prop "${edge.targetParam}" on ${target.type} "${edge.to}"`
          ).toBe(true);
        }
      }
    });
  });
});
