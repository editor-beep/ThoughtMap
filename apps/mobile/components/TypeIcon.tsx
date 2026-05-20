import React from 'react';
import {
  Sparkles,
  Smile,
  User,
  BookOpen,
  Microscope,
  Archive,
  AlertTriangle,
  Package,
  Layers,
} from 'lucide-react-native';
import { NodeType } from '../lib/types';

interface Props {
  type: NodeType;
  size?: number;
  color?: string;
}

const ICON_MAP: Record<NodeType, React.ComponentType<{ size?: number; color?: string }>> = {
  thought: Sparkles,
  joke: Smile,
  character: User,
  myth: BookOpen,
  research: Microscope,
  canon: Archive,
  contradiction: AlertTriangle,
  artifact: Package,
  fragment: Layers,
};

export default function TypeIcon({ type, size = 13, color }: Props) {
  const Icon = ICON_MAP[type] ?? Sparkles;
  return <Icon size={size} color={color} />;
}
