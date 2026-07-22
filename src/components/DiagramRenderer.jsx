import React, { useState } from 'react';
import { Play, Pause, Compass, PieChart, BarChart2, GitFork, Grid, Shield, Zap, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function DiagramRenderer({ topic, sNo, day, imageUrl, isSolutionMode = false }) {
  const [animating, setAnimating] = useState(false);

  if (imageUrl) {
    return (
      <div className="diagram-container" style={{ margin: '16px 0', textAlign: 'center' }}>
        <img 
          src={imageUrl} 
          alt={`Question Diagram ${sNo}`} 
          style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
        />
      </div>
    );
  }

  if (topic === 'Direction Sense') {
    return (
      <div className="diagram-container" style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', margin: '20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={16} /> Direction Vector Map & Coordinate Path
          </div>
        </div>
        <svg viewBox="0 0 420 220" style={{ width: '100%', maxHeight: '200px' }}>
          <line x1="210" y1="20" x2="210" y2="190" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="105" x2="380" y2="105" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3 3" />
          <text x="205" y="15" fill="var(--accent-primary)" fontSize="11" fontWeight="bold">NORTH (+y)</text>
          <text x="205" y="205" fill="var(--text-muted)" fontSize="11" fontWeight="bold">SOUTH (-y)</text>
          <text x="385" y="108" fill="var(--accent-primary)" fontSize="11" fontWeight="bold">EAST (+x)</text>
          <text x="5" y="108" fill="var(--text-muted)" fontSize="11" fontWeight="bold">WEST (-x)</text>
          <g>
            <circle cx="100" cy="140" r="6" fill="var(--accent-success)" />
            <text x="85" y="160" fill="var(--accent-success)" fontSize="12" fontWeight="bold">A (Start)</text>
            <line x1="100" y1="140" x2="220" y2="140" stroke="var(--accent-primary)" strokeWidth="3" />
            <text x="150" y="132" fill="var(--accent-primary)" fontSize="11" fontWeight="bold">8m (East)</text>
            <line x1="220" y1="140" x2="220" y2="70" stroke="var(--accent-warning)" strokeWidth="3" />
            <text x="228" y="110" fill="var(--accent-warning)" fontSize="11" fontWeight="bold">6m (North)</text>
            <line x1="220" y1="70" x2="100" y2="70" stroke="#a855f7" strokeWidth="3" />
            <text x="150" y="62" fill="#a855f7" fontSize="11" fontWeight="bold">8m (West)</text>
            <line x1="100" y1="70" x2="100" y2="110" stroke="var(--accent-danger)" strokeWidth="3" />
            <circle cx="100" cy="110" r="6" fill="var(--accent-danger)" />
            <text x="70" y="105" fill="var(--accent-danger)" fontSize="12" fontWeight="bold">E (Final)</text>
          </g>
        </svg>
      </div>
    );
  }

  if (topic === 'Deductions') {
    return (
      <div className="diagram-container" style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', margin: '20px 0' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interactive Venn Diagram Representation
        </div>
        <svg viewBox="0 0 400 200" style={{ width: '100%', maxHeight: '180px' }}>
          <circle cx="150" cy="100" r="65" fill="rgba(37, 99, 235, 0.2)" stroke="var(--accent-primary)" strokeWidth="2.5" />
          <circle cx="230" cy="100" r="65" fill="rgba(124, 58, 237, 0.2)" stroke="#a855f7" strokeWidth="2.5" />
          <circle cx="190" cy="130" r="45" fill="rgba(34, 197, 94, 0.18)" stroke="var(--accent-success)" strokeWidth="2" strokeDasharray="4 4" />
          <text x="110" y="95" fill="var(--text-primary)" fontSize="12" fontWeight="bold">Set A (Engineers)</text>
          <text x="245" y="95" fill="var(--text-primary)" fontSize="12" fontWeight="bold">Set B (Logical Thinkers)</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="diagram-container" style={{ background: 'var(--bg-primary)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)', margin: '20px 0' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Activity size={16} /> Question Figure & Data Matrix
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--accent-primary)' }}>
            <th style={{ padding: '8px', border: '1px solid var(--border-color)' }}>Entity / Variable</th>
            <th style={{ padding: '8px', border: '1px solid var(--border-color)' }}>Condition / Given Value</th>
            <th style={{ padding: '8px', border: '1px solid var(--border-color)' }}>Resultant State</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>Case 1</td>
            <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>Standard Premise</td>
            <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>Satisfied</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
