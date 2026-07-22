import React, { useState } from 'react';
import qcardsData from '../data/gk_qcards_data.json';
import { 
  BookMarked, Sparkles, Landmark, Scale, Globe, Rocket, Award, 
  ChevronLeft, ChevronRight, AlertTriangle, Lightbulb, Printer, LayoutGrid, PlayCircle, Eye
} from 'lucide-react';

export default function GKDailyOnePagers({ onStartTopicPractice }) {
  const [viewMode, setViewMode] = useState('CAROUSEL'); // 'CAROUSEL' vs 'GRID'
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [completedList, setCompletedList] = useState({});

  // Topic of the day based on the day of the year to rotate through all 340+ Q-Cards
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const diff = new Date() - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const dailyFocusIndex = Math.max(0, (dayOfYear - 1) % qcardsData.length);
  const dailyFocusTopic = qcardsData[dailyFocusIndex] || qcardsData[0];

  const handleNext = () => {
    setCarouselIndex((prev) => (prev + 1) % qcardsData.length);
  };

  const handlePrev = () => {
    setCarouselIndex((prev) => (prev - 1 + qcardsData.length) % qcardsData.length);
  };

  const markTopicAsReviewed = (id) => {
    setCompletedList(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getTopicIcon = (category) => {
    if (category.includes('Polity') || category.includes('Legal')) return <Landmark size={20} color="#6C4CF1" />;
    if (category.includes('Tech') || category.includes('Current')) return <Sparkles size={20} color="#FF6B5E" />;
    if (category.includes('International')) return <Globe size={20} color="#7c3aed" />;
    if (category.includes('Science')) return <Rocket size={20} color="#f59e0b" />;
    return <Award size={20} color="#ec4899" />;
  };

  const triggerPrint = () => {
    window.print();
  };

  const activeTopic = qcardsData[carouselIndex];
  const totalReviewed = Object.values(completedList).filter(Boolean).length;

  return (
    <div className="daily-onepagers-hub" style={{ marginTop: '10px' }}>
      
      {/* Print-Only Stylesheet Injection */}
      <style>{`
        @media print {
          body * { visibility: hidden; background: #fff !important; color: #000 !important; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; left: 0; top: 0; width: 100%; }
          .print-card { page-break-inside: avoid; border: 1px solid #000 !important; margin-bottom: 20px; padding: 15px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header Panel */}
      <div className="glass-panel no-print" style={{
        padding: '24px', marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(53, 199, 165, 0.12) 0%, rgba(108, 76, 241, 0.06) 100%)',
        border: '1px solid rgba(53, 199, 165, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '16px',
              background: 'rgba(53, 199, 165, 0.15)', color: 'var(--brand-mint)',
              fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px'
            }}>
              <Eye size={14} /> DAILY GK REVISION HUB
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Daily Sharp One-Pagers (Skim & Revise) 📄
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Quick slideshow revision of all major current affairs topics. Tabled milestones, key provisions, and traps.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }} className="no-print">
            <button 
              className={`btn ${viewMode === 'CAROUSEL' ? '' : 'btn-secondary'}`}
              onClick={() => setViewMode('CAROUSEL')}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <PlayCircle size={16} /> 2-Min Slide Carousel
            </button>

            <button 
              className={`btn ${viewMode === 'GRID' ? '' : 'btn-secondary'}`}
              onClick={() => setViewMode('GRID')}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <LayoutGrid size={16} /> High-Density List
            </button>

            <button 
              className="btn btn-secondary"
              onClick={triggerPrint}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Printer size={16} /> Print Cheat-Sheet
            </button>
          </div>
        </div>
      </div>

      {/* TOPIC OF THE DAY ANCHOR CARD */}
      {viewMode === 'CAROUSEL' && (
        <div className="glass-panel no-print" style={{
          padding: '16px 20px', marginBottom: '24px', borderLeft: '4px solid var(--brand-amber)',
          background: 'rgba(245, 185, 66, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-amber)', textTransform: 'uppercase' }}>
              📌 Topic of the Day (Structured Focus)
            </span>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: 800 }}>
              {dailyFocusTopic.title} — <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{dailyFocusTopic.topic}</span>
            </h4>
          </div>
          <button 
            className="btn" 
            onClick={() => {
              const idx = qcardsData.findIndex(t => t.id === dailyFocusTopic.id);
              if (idx !== -1) setCarouselIndex(idx);
            }}
            style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'var(--brand-amber)', color: 'var(--brand-ink)', border: 'none' }}
          >
            Review Now
          </button>
        </div>
      )}

      {/* MODE 1: REVISION CAROUSEL */}
      {viewMode === 'CAROUSEL' && activeTopic && (
        <div className="no-print">
          {/* Progress Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Progress: {carouselIndex + 1} of {qcardsData.length} topics reviewed
            </span>
            <span style={{ fontSize: '0.825rem', color: 'var(--brand-mint)', fontWeight: 700 }}>
              Reviewed Today: {totalReviewed} / {qcardsData.length}
            </span>
          </div>

          <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${((carouselIndex + 1) / qcardsData.length) * 100}%`,
                background: 'var(--brand-purple)', transition: 'width 0.3s ease'
              }} 
            />
          </div>

          {/* Carousel Slide Card */}
          <div className="glass-panel" style={{ padding: '28px', borderTop: `5px solid ${activeTopic.color}`, position: 'relative' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: `${activeTopic.color}15`, color: activeTopic.color }}>
                  {activeTopic.category}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '8px 0 4px 0' }}>{activeTopic.title}</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{activeTopic.subtitle}</p>
              </div>

              <button
                onClick={() => markTopicAsReviewed(activeTopic.id)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border-color)',
                  background: completedList[activeTopic.id] ? 'var(--accent-success-bg)' : 'transparent',
                  color: completedList[activeTopic.id] ? 'var(--brand-mint)' : 'var(--text-secondary)',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                {completedList[activeTopic.id] ? '✓ Reviewed' : 'Mark Reviewed'}
              </button>
            </div>

            {/* Content summary */}
            <div style={{ padding: '16px', background: 'var(--brand-cloud)', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {activeTopic.summary}
            </div>

            {/* Mini facts & articles grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
              
              {/* Milestones */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Landmark size={16} color="var(--brand-purple)" /> Key Milestones & Rulings
                </h4>
                <table style={{ width: '100%', fontSize: '0.8rem' }}>
                  <tbody>
                    {activeTopic.keyMilestones.slice(0, 3).map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 800, width: '70px', padding: '6px 0' }}>{m.year}</td>
                        <td style={{ padding: '6px 0' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{m.case}</strong>: {m.ruling.length > 90 ? m.ruling.slice(0, 90) + '...' : m.ruling}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Articles & traps */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={16} color="var(--brand-coral)" /> Articles & Provisions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeTopic.keyArticles.slice(0, 2).map((a, idx) => (
                    <div key={idx} style={{ padding: '8px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--brand-purple)' }}>{a.article}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Exam traps & Memory tips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '12px 16px', background: 'var(--accent-danger-bg)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-danger)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} /> CLAT TRAP ALERT
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{activeTopic.examTraps[0]}</div>
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(53, 199, 165, 0.08)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-mint)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={14} /> MEMORY TIP
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, lineHeight: 1.4 }}>{activeTopic.memoryTip}</div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
              <button className="btn btn-secondary" onClick={handlePrev}>
                <ChevronLeft size={16} /> Prev Topic
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {activeTopic.title}
              </span>

              <button className="btn btn-secondary" onClick={handleNext}>
                Next Topic <ChevronRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODE 2: HIGH-DENSITY PRINTABLE LIST (Used also for window.print()) */}
      {(viewMode === 'GRID' || viewMode === 'CAROUSEL') && (
        <div className={`print-section ${viewMode === 'CAROUSEL' ? 'no-print' : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {qcardsData.map((topicItem, idx) => (
              <div 
                key={topicItem.id} 
                className="glass-panel print-card" 
                style={{ 
                  padding: '20px', borderLeft: `5px solid ${topicItem.color}`,
                  background: 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: topicItem.color }}>
                      {idx + 1}. {topicItem.category} • {topicItem.topic}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0' }}>{topicItem.title}</h3>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{topicItem.subtitle}</strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{topicItem.readTime}</span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, background: 'var(--brand-cloud)', padding: '10px', borderRadius: '6px', margin: '12px 0' }}>
                  {topicItem.summary}
                </p>

                {/* Milestones & Articles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', fontSize: '0.775rem', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '6px' }}>🔑 Timelines & Precedents:</strong>
                    {topicItem.keyMilestones.map((m, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        • <strong>{m.year} {m.case}</strong>: {m.ruling}
                      </div>
                    ))}
                  </div>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '6px' }}>📜 Key Articles & Terms:</strong>
                    {topicItem.keyArticles.map((a, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        • <strong>{a.article}</strong>: {a.desc}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traps & Tips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.775rem', marginTop: '10px', borderTop: '1px dotted var(--border-color)', paddingTop: '10px' }}>
                  <div style={{ color: 'var(--accent-danger)', fontWeight: 500 }}>
                    <strong>⚠️ CLAT Trap:</strong> {topicItem.examTraps[0]}
                  </div>
                  <div style={{ color: 'var(--brand-purple)', fontWeight: 600 }}>
                    <strong>💡 Mnemonic:</strong> {topicItem.memoryTip}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
