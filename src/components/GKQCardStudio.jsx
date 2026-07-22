import React, { useState } from 'react';
import qcardsData from '../data/gk_qcards_data.json';
import { 
  BookMarked, Sparkles, Landmark, Scale, Globe, Rocket, Award, 
  ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Play, ArrowRight, Search, CheckCircle2
} from 'lucide-react';

export default function GKQCardStudio({ onStartTopicPractice }) {
  const [selectedTopicId, setSelectedTopicId] = useState(qcardsData[0].id);
  const [bookmarkedCards, setBookmarkedCards] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleBookmark = (id) => {
    setBookmarkedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCard = qcardsData.find(c => c.id === selectedTopicId) || qcardsData[0];

  const filteredCards = qcardsData.filter(card => 
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTopicIcon = (category) => {
    if (category.includes('Polity') || category.includes('Legal')) return <Landmark size={20} color="#10b981" />;
    if (category.includes('Tech') || category.includes('Current')) return <Sparkles size={20} color="#2563eb" />;
    if (category.includes('International')) return <Globe size={20} color="#7c3aed" />;
    if (category.includes('Science')) return <Rocket size={20} color="#f59e0b" />;
    return <Award size={20} color="#ec4899" />;
  };

  return (
    <div className="qcard-studio-view" style={{ marginTop: '10px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '28px', marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.08) 100%)',
        border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '16px',
              background: 'rgba(37, 99, 235, 0.15)', color: 'var(--accent-primary)',
              fontSize: '0.8rem', fontWeight: 800, marginBottom: '10px'
            }}>
              <BookMarked size={14} /> CLAT HIGH-YIELD GK SMART ONE-PAGERS (Q-CARDS)
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Quick Revision Q-Card Studio ⚡
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Concise 1-page summaries, milestone timelines, constitutional articles, exam traps & memory tips for rapid revision.
            </p>
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Q-Card topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 36px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Navigator + Active One-Pager */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        
        {/* Left Column: Topic Selector Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookMarked size={18} color="var(--accent-primary)" />
            Select Q-Card Topic ({filteredCards.length})
          </h3>

          {filteredCards.map(card => {
            const isSelected = card.id === selectedTopicId;
            const isBookmarked = bookmarkedCards[card.id];

            return (
              <div
                key={card.id}
                onClick={() => setSelectedTopicId(card.id)}
                className="glass-card"
                style={{
                  padding: '16px', cursor: 'pointer',
                  border: isSelected ? `2px solid ${card.color}` : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--magoosh-teal-light)' : 'var(--bg-card)',
                  transition: 'all 0.2s ease', position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ 
                    fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', 
                    borderRadius: '10px', background: `${card.color}22`, color: card.color 
                  }}>
                    {card.badge}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(card.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isBookmarked ? '#f59e0b' : 'var(--text-muted)' }}
                  >
                    <BookMarked size={16} fill={isBookmarked ? '#f59e0b' : 'none'} />
                  </button>
                </div>

                <div style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {card.title}
                </div>

                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {card.subtitle}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{card.readTime}</span>
                  {isSelected && <span style={{ color: card.color, fontWeight: 700 }}>Active Card →</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: SMART ONE-PAGER Q-CARD VIEW */}
        <div>
          {activeCard && (
            <div 
              className="glass-panel" 
              style={{
                padding: '32px', borderRadius: 'var(--radius-lg)',
                borderTop: `6px solid ${activeCard.color}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)', position: 'relative'
              }}
            >
              {/* Card Header & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {getTopicIcon(activeCard.category)}
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: activeCard.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {activeCard.category} • {activeCard.topic}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '6px' }}>
                    {activeCard.title}
                  </h2>

                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {activeCard.subtitle}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleBookmark(activeCard.id)}
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    <BookMarked size={16} fill={bookmarkedCards[activeCard.id] ? '#f59e0b' : 'none'} color={bookmarkedCards[activeCard.id] ? '#f59e0b' : 'currentColor'} />
                    {bookmarkedCards[activeCard.id] ? 'Bookmarked' : 'Bookmark'}
                  </button>

                  <button
                    className="btn"
                    onClick={() => onStartTopicPractice && onStartTopicPractice(activeCard.topic)}
                    style={{
                      padding: '8px 18px', fontSize: '0.85rem', fontWeight: 800,
                      background: activeCard.color, color: 'white', border: 'none',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Play size={14} /> Practice Topic Qs <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* SECTION 1: EXECUTIVE SUMMARY */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '18px 20px', marginBottom: '24px', 
                  background: 'var(--magoosh-teal-light)', borderLeft: `4px solid ${activeCard.color}`
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: activeCard.color, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> EXECUTIVE ONE-PAGER SUMMARY
                </div>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                  {activeCard.summary}
                </p>
              </div>

              {/* SECTION 2: MILESTONES & TIMELINE TABLE */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Landmark size={18} color={activeCard.color} />
                  Key Historical Milestones & Case Rulings
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeCard.keyMilestones.map((m, idx) => (
                    <div 
                      key={idx} 
                      className="glass-card" 
                      style={{ 
                        padding: '16px', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px',
                        alignItems: 'center', background: 'var(--bg-card)'
                      }}
                    >
                      <div>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', 
                          borderRadius: '12px', background: `${activeCard.color}18`, color: activeCard.color 
                        }}>
                          {m.year}
                        </span>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>
                          {m.case}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {m.ruling}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: KEY ARTICLES & CONSTITUTIONAL PROVISIONS */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} color="var(--accent-primary)" />
                  Crucial Articles, Definitions & Statutory Provisions
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {activeCard.keyArticles.map((art, idx) => (
                    <div key={idx} className="glass-card" style={{ padding: '16px', background: 'var(--bg-card)' }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} /> {art.article}
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {art.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: EXAM TRAPS & MEMORY MNEMONICS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                {/* Exam Traps */}
                <div 
                  className="glass-card" 
                  style={{ 
                    padding: '20px', background: 'var(--accent-warning-bg)', 
                    border: '1px solid rgba(245, 158, 11, 0.3)' 
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-warning)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} /> COMMON CLAT EXAM TRAPS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.5 }}>
                    {activeCard.examTraps.map((trap, idx) => (
                      <li key={idx}>{trap}</li>
                    ))}
                  </ul>
                </div>

                {/* Memory Tip */}
                <div 
                  className="glass-card" 
                  style={{ 
                    padding: '20px', background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.3)' 
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-success)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lightbulb size={18} /> RECALL & MEMORY MNEMONIC
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 600 }}>
                    {activeCard.memoryTip}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
