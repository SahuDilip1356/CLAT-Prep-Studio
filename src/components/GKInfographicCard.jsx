import React, { useState } from 'react';
import { Landmark, Scale, Globe, Compass, ChevronDown, ChevronUp, Sparkles, BookOpen, Layers } from 'lucide-react';

export default function GKInfographicCard({ topic }) {
  const [expanded, setExpanded] = useState(true);

  if (topic.includes('Constitutional') || topic.includes('Judgments')) {
    return (
      <div className="glass-panel" style={{ padding: '20px', margin: '20px 0', borderLeft: '4px solid var(--accent-success)', background: 'var(--magoosh-teal-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--accent-success)', fontSize: '0.9rem' }}>
            <Landmark size={18} /> OPEN DESIGN INFOGRAPHIC: Constitutional Basic Structure & Landmark Judgments
          </div>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expanded && (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="glass-card" style={{ padding: '14px', background: 'white' }}>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem', marginBottom: '4px' }}>1967 • Shankari Prasad / Golaknath</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SC held fundamental rights could not be amended under Art 368.</div>
            </div>

            <div className="glass-card" style={{ padding: '14px', background: 'white', border: '2px solid var(--accent-success)' }}>
              <div style={{ fontWeight: 800, color: 'var(--accent-success)', fontSize: '0.85rem', marginBottom: '4px' }}>1973 • Kesavananda Bharati (13-Judge Bench)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Established Basic Structure Doctrine. Parliament cannot alter core values.</div>
            </div>

            <div className="glass-card" style={{ padding: '14px', background: 'white' }}>
              <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.85rem', marginBottom: '4px' }}>1980 • Minerva Mills</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reaffirmed judicial review and balance between Fundamental Rights & DPSP.</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (topic.includes('International') || topic.includes('Treaties')) {
    return (
      <div className="glass-panel" style={{ padding: '20px', margin: '20px 0', borderLeft: '4px solid var(--accent-primary)', background: 'rgba(37,99,235,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
            <Globe size={18} /> OPEN DESIGN INFOGRAPHIC: International Multilateral Summit Map
          </div>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expanded && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="glass-card" style={{ padding: '12px 16px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: 'var(--accent-primary)' }}>NATO (32 Member States)</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Finland joined 31st (2023) • Sweden joined 32nd (March 2024)</div>
              </div>
              <span className="diff-badge diff-1">Security Alliance</span>
            </div>

            <div className="glass-card" style={{ padding: '12px 16px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: 'var(--accent-success)' }}>BRICS Expansion 2024</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Egypt, Ethiopia, Iran, UAE joined as full members in Jan 2024</div>
              </div>
              <span className="diff-badge diff-2">Global South</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', margin: '16px 0', borderLeft: '4px solid var(--accent-warning)', background: 'var(--accent-warning-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        <BookOpen size={16} color="var(--accent-warning)" />
        OPEN DESIGN HIGH-YIELD RECALL SUMMARY: {topic}
      </div>
    </div>
  );
}
