import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls, NodeChange } from 'reactflow';
import { useThoughtStore } from '@core/store';
import CustomThoughtNode from './CustomThoughtNode';

const nodeTypes = {
  thoughtMapNode: CustomThoughtNode
};

export default function SpatialCanvas() {
  const { nodes, edges, updateNodePosition } = useThoughtStore();

  const flowNodes = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: 'thoughtMapNode',
        position: { x: node.x, y: node.y },
        data: { node }
      })),
    [nodes]
  );

  const flowEdges = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: {
          stroke: edge.type === 'contradicts' ? '#f43f5e' : '#06b6d4',
          strokeWidth: 1,
          opacity: 0.6
        }
      })),
    [edges]
  );

  const onNodesChange = (changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && change.position && change.id) {
        updateNodePosition(change.id, change.position.x, change.position.y);
      }
    });
  };

  return (
    <div className="w-full h-full relative">
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
          <p className="font-mono text-xs tracking-widest text-slate-500 uppercase animate-pulse">Begin thinking.</p>
          <p className="font-mono text-[10px] text-slate-600 mt-1">Every message can become a node.</p>
        </div>
      )}

      <ReactFlow nodes={flowNodes} edges={flowEdges} onNodesChange={onNodesChange} nodeTypes={nodeTypes} proOptions={{ hideAttribution: true }}>
        <Background color="#1e293b" gap={24} size={1} />
        <Controls className="!bg-void-800 !border-void-700 !text-slate-400 !fill-slate-400" />
      </ReactFlow>
    </div>
  );
}
