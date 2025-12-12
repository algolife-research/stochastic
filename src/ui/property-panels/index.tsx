// Stochastic v3 - Property Panel Component (Modular)

import React from 'react';
import type { GraphNode, Annotation, Region } from '@core/types';
import { NODE_COLORS } from '@core/constants';
import { NodeProperties } from './NodeProperties';
import { AnnotationProperties } from './AnnotationProperties';
import { RegionProperties } from './RegionProperties';
import styles from '../PropertyPanel.module.css';

// ============================================================================
// PROPERTY PANEL
// ============================================================================

interface PropertyPanelProps {
  node?: GraphNode;
  annotation?: Annotation;
  region?: Region;
  embedded?: boolean;
}

export function PropertyPanel({ node, annotation, region, embedded }: PropertyPanelProps): React.ReactElement {
  // Embedded mode: render content directly without wrapper
  if (embedded) {
    if (annotation) {
      return (
        <>
          <div className={styles.embeddedHeader}>
            <h4>✏️ Annotation</h4>
            <span className={styles.nodeId}>{annotation.id.slice(0, 8)}</span>
          </div>
          <div className={styles.embeddedContent}>
            <AnnotationProperties annotation={annotation} />
          </div>
        </>
      );
    }
    
    if (region) {
      return (
        <>
          <div className={styles.embeddedHeader}>
            <h4>📦 Region</h4>
            <span className={styles.nodeId}>{region.id.slice(0, 8)}</span>
          </div>
          <div className={styles.embeddedContent}>
            <RegionProperties region={region} />
          </div>
        </>
      );
    }
    
    if (!node) {
      return (
        <div className={styles.empty}>
          Select a node, annotation, or region to view properties
        </div>
      );
    }
    
    return (
      <>
        <div 
          className={styles.embeddedHeader}
          style={{ borderLeftColor: NODE_COLORS[node.type] }}
        >
          <h4>{node.type.charAt(0).toUpperCase() + node.type.slice(1)}</h4>
          <span className={styles.nodeId}>{node.id.slice(0, 8)}</span>
        </div>
        <div className={styles.embeddedContent}>
          <NodeProperties node={node} />
        </div>
      </>
    );
  }

  // Standalone mode: render with panel wrapper
  if (annotation) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>✏️ Annotation</h3>
          <span className={styles.nodeId}>{annotation.id.slice(0, 8)}</span>
        </div>
        <div className={styles.content}>
          <AnnotationProperties annotation={annotation} />
        </div>
      </div>
    );
  }
  
  if (region) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>📦 Region</h3>
          <span className={styles.nodeId}>{region.id.slice(0, 8)}</span>
        </div>
        <div className={styles.content}>
          <RegionProperties region={region} />
        </div>
      </div>
    );
  }
  
  if (!node) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3>Properties</h3>
        </div>
        <div className={styles.empty}>
          Select a node, annotation, or region to view properties
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.panel}>
      <div 
        className={styles.header}
        style={{ borderLeftColor: NODE_COLORS[node.type] }}
      >
        <h3>{node.type.charAt(0).toUpperCase() + node.type.slice(1)}</h3>
        <span className={styles.nodeId}>{node.id.slice(0, 8)}</span>
      </div>
      
      <div className={styles.content}>
        <NodeProperties node={node} />
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export { NodeProperties } from './NodeProperties';
export { AnnotationProperties } from './AnnotationProperties';
export { RegionProperties } from './RegionProperties';
