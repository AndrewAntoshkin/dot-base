'use client';

import { memo, useState, useCallback } from 'react';
import { BaseEdge, EdgeProps, EdgeLabelRenderer, getBezierPath, useNodes, useReactFlow } from '@xyflow/react';
import { ReactFlowNodeData } from '@/lib/flow/types';
import { X } from 'lucide-react';

// Colors based on source node type
const EDGE_COLORS = {
  text: '#FFFFFF',      // White for text
  image: '#F5A623',     // Yellow for image
  video: '#9B59B6',     // Purple for video
} as const;

function FlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  markerEnd,
  selected,
}: EdgeProps) {
  const nodes = useNodes();
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  
  // Find source node to determine edge color
  const sourceNode = nodes.find(n => n.id === source);
  const sourceType = (sourceNode?.data as ReactFlowNodeData)?.blockType || 'text';
  const strokeColor = EDGE_COLORS[sourceType as keyof typeof EDGE_COLORS] || EDGE_COLORS.text;
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  }, [id, setEdges]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <g 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        strokeLinecap="round"
      />
      {/* Visible edge */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        style={{
          opacity: selected || isHovered ? 0.5 : 1,
          transition: 'opacity 0.15s ease',
        }}
        markerEnd={markerEnd}
      />
      {/* Delete button rendered via EdgeLabelRenderer */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: isHovered ? 'all' : 'none',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleDelete}
            style={{
              backgroundColor: strokeColor,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s ease, transform 0.15s ease',
              transform: isHovered ? 'scale(1)' : 'scale(0.5)',
              pointerEvents: isHovered ? 'all' : 'none',
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:brightness-110"
          >
            <X className="w-3.5 h-3.5 text-black" strokeWidth={3} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

export const FlowEdge = memo(FlowEdgeComponent);
