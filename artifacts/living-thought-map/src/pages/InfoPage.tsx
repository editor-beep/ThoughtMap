import React from 'react';
import { Compass } from 'lucide-react';

const sections = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'core-concepts', label: 'Core Concepts' },
  { id: 'ai-interactions', label: 'AI Interactions' },
  { id: 'voices', label: 'Voices' },
  { id: 'realms', label: 'Realms' },
  { id: 'nodes', label: 'Nodes' },
  { id: 'anchors', label: 'Anchors' },
  { id: 'master-map', label: 'Master Map' },
  { id: 'archive-vs-grid', label: 'Archive vs Grid' },
  { id: 'search', label: 'Search' },
  { id: 'tagging', label: 'Tagging' },
  { id: 'edit-move-link', label: 'Edit, Move, Link' },
  { id: 'export-import', label: 'Export / Import' },
  { id: 'faq', label: 'FAQ' },
];

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-16 border border-void-700/40 rounded-lg p-4 md:p-5 bg-void-900/50">
    <h2 className="text-xs md:text-sm tracking-wider uppercase text-slate-200 mb-3">{title}</h2>
    <div className="space-y-2 text-[11px] md:text-xs text-slate-400 leading-relaxed">{children}</div>
  </section>
);

export default function InfoPage() {
  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <div className="w-screen min-h-dvh bg-void-900 text-slate-300 font-mono">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-4">
        <header className="border border-void-700/40 rounded-lg p-5 md:p-6 bg-void-900/60">
          <div className="flex items-center gap-3 mb-3">
            <Compass size={20} className="text-cosmic-cyan" />
            <h1 className="text-sm md:text-base tracking-widest uppercase text-slate-100">ThoughtMap Info Manual</h1>
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed">
            A practical guide to how ThoughtMap works: AI interactions, voices, realms, nodes, anchors, master map, archive/grid views,
            search, tagging, editing, moving, linking, and daily workflows.
          </p>
          <div className="mt-3 text-[10px] text-slate-500">Tip: use browser find (Ctrl/Cmd+F) to search this page instantly.</div>
          <a href={basePath} className="inline-block mt-4 text-[11px] tracking-widest uppercase text-slate-500 hover:text-cosmic-cyan transition-colors">
            ← Back to canvas
          </a>
        </header>

        <nav className="border border-void-700/40 rounded-lg p-4 bg-void-900/40">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Contents</p>
          <div className="flex flex-wrap gap-2 text-[10px] md:text-[11px]">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="px-2 py-1 rounded border border-void-700/40 text-slate-400 hover:text-cosmic-cyan hover:border-cosmic-cyan/40 transition-colors">
                {section.label}
              </a>
            ))}
          </div>
        </nav>

        <Section id="quick-start" title="Quick Start">
          <p>1) Create or open a map from the Master Map.</p>
          <p>2) Add nodes for ideas, tasks, or references.</p>
          <p>3) Assign realms to filter by context.</p>
          <p>4) Promote key nodes to anchors for easy return.</p>
          <p>5) Use search to focus quickly as your graph grows.</p>
        </Section>

        <Section id="core-concepts" title="Core Concepts">
          <p><strong>Map:</strong> A workspace containing nodes and their links.</p>
          <p><strong>Node:</strong> A unit of thought (title + content + metadata).</p>
          <p><strong>Edge/Link:</strong> A relationship between two nodes.</p>
          <p><strong>Realm:</strong> A semantic layer/tag group used for filtering.</p>
          <p><strong>Anchor:</strong> A pinned high-value node you can jump to from the top nav.</p>
          <p><strong>Master Map:</strong> The global index where all maps are organized and discovered.</p>
        </Section>

        <Section id="ai-interactions" title="AI Interactions">
          <p>Use AI as a thought partner, not only a generator: ask it to summarize clusters, challenge assumptions, propose missing nodes, and draft next-step plans.</p>
          <p>Best practice prompt template: <em>context → goal → constraints → output format</em>.</p>
          <p>Good outputs include: new node ideas, linking suggestions, duplicate detection, naming cleanup, and synthesis memos.</p>
          <p>For quality control, keep one node for source facts and another for AI interpretations to separate signal from speculation.</p>
        </Section>

        <Section id="voices" title="Voices">
          <p>Voices are perspective modes. Examples: Analyst, Strategist, Skeptic, Creator, Editor.</p>
          <p>Switch voices when stuck: each voice asks different questions and surfaces different link patterns.</p>
          <p>Workflow: duplicate a node, rewrite from a new voice, then connect both versions to compare assumptions.</p>
        </Section>

        <Section id="realms" title="Realms">
          <p>Realms classify nodes by domain (e.g., Product, Research, Personal, Ops).</p>
          <p>Use the <strong>Realms</strong> menu to toggle visibility and reduce noise.</p>
          <p>Keep realm names stable; frequent renaming weakens search memory and team consistency.</p>
        </Section>

        <Section id="nodes" title="Nodes">
          <p>Use concise, searchable titles and put details in content.</p>
          <p>Node quality checklist: clear title, one main idea, explicit status, linked neighbors.</p>
          <p>When a node becomes too broad, split it into child nodes and keep a short parent summary.</p>
        </Section>

        <Section id="anchors" title="Anchors">
          <p>Anchors are your durable waypoints: north stars, index nodes, and active decision hubs.</p>
          <p>Create anchors from the Anchors dropdown and keep the list intentionally small.</p>
          <p>Use anchors for recurring entry points instead of searching for the same node repeatedly.</p>
        </Section>

        <Section id="master-map" title="Master Map">
          <p>Master Map is the command center for all maps.</p>
          <p>Use it to discover map status, switch contexts, and keep long-term structure coherent.</p>
          <p>Recommended habit: weekly pass through Master Map to merge overlap and archive stale maps.</p>
        </Section>

        <Section id="archive-vs-grid" title="Archive vs Grid">
          <p><strong>Grid:</strong> visual scanning mode for quick recognition and navigation.</p>
          <p><strong>Archive:</strong> dense historical mode for inventory, auditing, and cleanup.</p>
          <p>Rule of thumb: use Grid while creating; switch to Archive when reviewing at scale.</p>
        </Section>

        <Section id="search" title="Search">
          <p>Top-left search filters nodes by title/content and helps highlight matching ideas on the canvas.</p>
          <p>Search strategy: start broad, then add rare terms (project codename, exact phrase, proper noun).</p>
          <p>If results are noisy, tighten titles and reduce ambiguous wording in high-traffic nodes.</p>
        </Section>

        <Section id="tagging" title="Tagging">
          <p>Use realms as primary taxonomy and keep tag-like terms in titles/content for text searchability.</p>
          <p>Prefer a small, controlled vocabulary over many near-duplicate labels.</p>
          <p>For teams: document tag conventions in one anchor node called "Taxonomy".</p>
        </Section>

        <Section id="edit-move-link" title="Edit, Move, Link">
          <p><strong>Edit:</strong> revise titles often; they are your retrieval keys.</p>
          <p><strong>Move:</strong> cluster related nodes spatially to create semantic neighborhoods.</p>
          <p><strong>Link:</strong> connect cause→effect, question→answer, plan→execution, and claim→evidence.</p>
          <p>When linking, add a short rationale in one node so future-you understands why the relationship exists.</p>
        </Section>

        <Section id="export-import" title="Export / Import">
          <p>Use Export/Import for backup, migration, or version snapshots before major restructuring.</p>
          <p>Before import, keep a clean backup file and verify JSON source integrity.</p>
          <p>Suggested naming: <em>thought-map-YYYY-MM-DD-stage.json</em> (e.g., baseline, pre-merge, final).</p>
        </Section>

        <Section id="faq" title="FAQ">
          <p><strong>Q: What should I anchor?</strong> A: stable priorities, central indexes, and current decision points.</p>
          <p><strong>Q: Too many nodes—what now?</strong> A: split by map, then use realms and anchor indexes.</p>
          <p><strong>Q: How often should I clean up?</strong> A: light daily grooming + weekly archive pass.</p>
          <p><strong>Q: What is the minimum viable structure?</strong> A: 3–5 realms, 5–12 anchors, clear titles, frequent linking.</p>
        </Section>
      </div>
    </div>
  );
}
