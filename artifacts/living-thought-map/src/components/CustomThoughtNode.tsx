import React from 'react';
import { Handle, Position } from 'reactflow';
import { ThoughtNode } from '../types';
import { useThoughtStore } from '../store';
import {
  Sparkles, Smile, User, BookOpen, Microscope,
  Archive, AlertTriangle, Package, Layers, X,
  type LucideIcon
} from 'lucide-react';

interface TypeConfig {
  icon: LucideIcon;
  border: string;
  iconColor: string;
  glow: string;
}

const TYPE_CONFIGS: Record<ThoughtNode['type'], TypeConfig> = {
  thought:       { icon: Sparkles,      border: 'border-cosmic-cyan/50',    iconColor: 'text-cosmic-cyan',    glow: 'rgba(6,182,212,0.22)' },
  joke:          { icon: Smile,         border: 'border-cosmic-amber/50',   iconColor: 'text-cosmic-amber',   glow: 'rgba(245,158,11,0.22)' },
  character:     { icon: User,          border: 'border-cosmic-purple/50',  iconColor: 'text-cosmic-purple',  glow: 'rgba(168,85,247,0.22)' },
  myth:          { icon: BookOpen,      border: 'border-cosmic-purple/70',  iconColor: 'text-cosmic-purple',  glow: 'rgba(168,85,247,0.30)' },
  research:      { icon: Microscope,    border: 'border-cosmic-blue/50',    iconColor: 'text-cosmic-blue',    glow: 'rgba(59,130,246,0.22)' },
  canon:         { icon: Archive,       border: 'border-cosmic-emerald/60', iconColor: 'text-cosmic-emerald', glow: 'rgba(16,185,129,0.22)' },
  contradiction: { icon: AlertTriangle, border: 'border-cosmic-rose/70',    iconColor: 'text-cosmic-rose',    glow: 'rgba(244,63,94,0.30)' },
  artifact:      { icon: Package,       border: 'border-slate-500/50',      iconColor: 'text-slate-400',      glow: 'rgba(100,116,139,0.18)' },
  fragment:      { icon: Layers,        border: 'border-slate-600/40',      iconColor: 'text-slate-500',      glow: 'rgba(71,85,105,0.14)' }
};

export default function CustomThoughtNode({ data }: { data: { node: ThoughtNode } }) {
  const { node } = data;
  const { deleteNode } = useThoughtStore();
  const config = TYPE_CONFIGS[node.type] ?? TYPE_CONFIGS.thought;
  const Icon = config.icon;

  return (
    <div
      className={`group p-4 rounded-lg bg-void-800/90 border ${config.border} max-w-xs min-w-[200px] transition-all hover:scale-[1.02] hover:bg-void-800 backdrop-blur-sm relative`}
      style={{ boxShadow: `0 0 20px ${config.glow}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-void-700 !w-2 !h-2 !border-void-600" />

      <button
        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-void-700 text-slate-600 hover:text-cosmic-rose"
        title="Delete node"
      >
        <X size={10} />
      </button>

      <div className="flex items-center gap-2 mb-2.5 pr-5">
        <Icon size={13} className={config.iconColor} />
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{node.type}</span>
      </div>

      <h4 className="font-sans text-sm font-semibold text-slate-100 mb-1.5 leading-snug">{node.title}</h4>

      <p className="font-sans text-xs text-slate-400 leading-relaxed break-words line-clamp-4">{node.content}</p>

      <div className="flex flex-wrap gap-1 mt-3">
        {node.realms.map((r) => (
          <span key={r} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-void-700/60 text-slate-500">
            @{r}
          </span>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ left: 0, bottom: 0, width: '100%', height: '20px', transform: 'translateY(50%)', borderRadius: '0 0 8px 8px', border: 'none' }}
        className="!bg-void-600/10 hover:!bg-void-600/40 transition-colors cursor-crosshair"
      />
    </div>
  );
}
