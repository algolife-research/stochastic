import { describe, it, expect } from 'vitest';
import { EXAMPLES } from '../../js/examples.js';

describe('Examples Data', () => {
  it('should load EXAMPLES object', () => {
    expect(EXAMPLES).toBeDefined();
    expect(typeof EXAMPLES).toBe('object');
  });

  it('should contain the new ambient examples', () => {
    expect(EXAMPLES).toHaveProperty('ambient_drone');
    expect(EXAMPLES).toHaveProperty('ambient_krell');
    expect(EXAMPLES).toHaveProperty('ambient_polymetric');
  });

  it('should have valid structure for new examples', () => {
    const newExamples = ['ambient_drone', 'ambient_krell', 'ambient_polymetric'];
    
    newExamples.forEach(key => {
      const ex = EXAMPLES[key];
      expect(ex).toHaveProperty('version');
      expect(ex).toHaveProperty('bpm');
      expect(ex).toHaveProperty('nodes');
      expect(ex).toHaveProperty('edges');
      expect(Array.isArray(ex.nodes)).toBe(true);
      expect(Array.isArray(ex.edges)).toBe(true);
    });
  });
});
