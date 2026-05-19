import React from 'react';
import { Handle, Position } from 'reactflow';
import { ThoughtNode } from '@types';
import { Sparkles, HelpCircle, AlertTriangle, Book, Copy } from 'lucide-react';

const TYPE_CONFIGS: Record<ThoughtNode['type'], { icon: React.ComponentType<{ size?: number; className?: string }>; border: string }> = {
  thought: { icon: Sparkles, border: 'border-cosmic-cyan/40' },
  joke: { icon: Sparkles, border: 'border-cosmic-amber/40' },
  character: { icon: Book, border: 'border-cosmic-purple/40' },
  myth: { icon: Book, border: 'border-cosmic-purple/60' },
  research: { icon: Copy, border: 'border-cosmic-blue/40' },
  canon: { icon: Copy, border: 'border-cosmic-emerald/50' },
  contradiction: { icon: AlertTriangle, border: 'border-cosmic-rose/60' },
  artifact: { icon: HelpCircle, border: 'border-slate-500/40' },
  fragment: { icon: HelpCircle, border: 'border-slate-600/30' }
};

export default function CustomThoughtNode({ data }: { data: { node: ThoughtNode } }) {
  const { node } = data;
  const config = TYPE_CONFIGS[node.type] || TYPE_CONFIGS.thought;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg bg-void-800/90 border ${config.border} max-w-xs min-w-[200px] transition-all hover:scale-[1.02] hover:bg-void-800 backdrop-blur-sm`}>
      <Handle type="target" position={Position.Top} className="!bg-void-700 !w-2 !h-2" />

      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} className="text-cosmic-cyan" />
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{node.type}</span>
      </div>

      <h4 className="font-sans text-xs font-medium text-slate-200 mb-1">{node.title}</h4>

      <p className="font-sans text-[11px] text-slate-400 leading-relaxed break-words line-clamp-4">{node.content}</p>

      <div className="flex gap-1 mt-3">
        {node.realms.map((r) => (
          <span key={r} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-void-700/50 text-slate-400">
            @{r}
          </span>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-void-700 !w-2 !h-2" />
    </div>
  );
}
