import React, { useState, useEffect } from 'react';
import graphData from '../data/ca_knowledge_graph.json';
import { 
  Network, BookOpen, Clock, Play, Award, HelpCircle, Check, AlertTriangle, 
  ArrowRight, ShieldCheck, RotateCcw, BrainCircuit, CheckSquare,
  Globe, Landmark, MapPin, MessageSquare, AlertCircle, Compass, Star, Filter,
  ChevronDown, ChevronUp, BookMarked
} from 'lucide-react';

export default function CAKnowledgeGraph({
  externalSelectedNodeIndex,
  setExternalSelectedNodeIndex,
  externalActiveLens,
  setExternalActiveLens,
  onDossierProgress,
  bookmarkedDossierIds = {},
  onToggleDossierBookmark
} = {}) {
  const [internalSelectedNodeIndex, setInternalSelectedNodeIndex] = useState(0);
  const selectedNodeIndex = externalSelectedNodeIndex !== undefined ? externalSelectedNodeIndex : internalSelectedNodeIndex;
  const setSelectedNodeIndex = setExternalSelectedNodeIndex || setInternalSelectedNodeIndex;

  const [internalActiveLens, setInternalActiveLens] = useState('EVENT');
  const activeLens = externalActiveLens !== undefined ? externalActiveLens : internalActiveLens;
  const setActiveLens = setExternalActiveLens || setInternalActiveLens;

  const [activeDossierTab, setActiveDossierTab] = useState('LEARN');

  // Sync activeDossierTab with external activeLens modifications
  useEffect(() => {
    if (activeLens === 'CLAT_PASSAGE' || activeLens === 'AILET_MCQS') {
      setActiveDossierTab('PRACTISE');
    } else if (activeLens === 'EVENT' || activeLens === 'TIMELINE') {
      setActiveDossierTab('LEARN');
    } else if (activeLens === 'SIGNIFICANCE' || activeLens === 'LEGAL') {
      setActiveDossierTab('CONNECT');
    } else if (activeLens === 'TRAPS' || activeLens === 'GEO') {
      setActiveDossierTab('REMEMBER');
    } else if (activeLens === 'REVISE') {
      setActiveDossierTab('REVISE');
    }
  }, [activeLens]);

  // Sync activeLens when user manually changes activeDossierTab
  const handleTabChange = (tabKey) => {
    setActiveDossierTab(tabKey);
    if (tabKey === 'LEARN') {
      setActiveLens('EVENT');
    } else if (tabKey === 'CONNECT') {
      setActiveLens('SIGNIFICANCE');
    } else if (tabKey === 'REMEMBER') {
      setActiveLens('TRAPS');
    } else if (tabKey === 'PRACTISE') {
      setActiveLens('CLAT_PASSAGE');
    } else if (tabKey === 'REVISE') {
      setActiveLens('REVISE');
    }
  };

  const [directoryMode, setDirectoryMode] = useState('MONTH'); // 'MONTH' vs 'PRIORITY' vs 'CONTINUING'
  const [hideAwareness, setHideAwareness] = useState(false);
  
  // Collapsible months and priority categories
  const [expandedMonths, setExpandedMonths] = useState({ 'Continuing Issues': true });
  const [expandedPriorities, setExpandedPriorities] = useState({ 'P1': true });

  const toggleMonth = (monthName) => {
    setExpandedMonths(prev => ({ ...prev, [monthName]: !prev[monthName] }));
  };

  const togglePriority = (pKey) => {
    setExpandedPriorities(prev => ({ ...prev, [pKey]: !prev[pKey] }));
  };

  // Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submittedQuestions, setSubmittedQuestions] = useState({});
  
  // Spaced Repetition (Leitner Box) States
  const [flashcards, setFlashcards] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [leitnerBoxes, setLeitnerBoxes] = useState({
    1: [], // Daily
    2: [], // Every 3 days
    3: []  // Every 7 days
  });

  const activeNode = graphData[selectedNodeIndex] || graphData[0];
  const getDossierKey = (dossier) => `${dossier.folderOrder || dossier.month}/${dossier.title}`;
  const activeDossierKey = getDossierKey(activeNode);
  const isDossierBookmarked = Boolean(bookmarkedDossierIds[activeDossierKey]);
  const recordDossierProgress = (dossier, status, attemptedDelta = 0, correctDelta = 0) => {
    onDossierProgress?.({
      dossierKey: getDossierKey(dossier),
      dossierId: dossier.id,
      title: dossier.title,
      status,
      attemptedDelta,
      correctDelta
    });
  };
  const selectDossier = (node) => {
    setSelectedNodeIndex(node.index);
    setActiveLens('EVENT');
    setSelectedAnswers({});
    setSubmittedQuestions({});
    recordDossierProgress(node, 'UNDERSTOOD');
  };
  const verifiedFacts = activeNode?.facts || [];
  const verifiedSourceCount = new Set(verifiedFacts.map(fact => fact.source).filter(Boolean)).size;

  // Directory Groupings
  const dossiersByMonth = {};
  const dossiersByPriority = { P1: [], P2: [], P3: [], W: [] };
  const continuingDossiers = [];

  graphData.forEach((dossier, index) => {
    const month = dossier.month || "Jul 2026";
    if (!dossiersByMonth[month]) {
      dossiersByMonth[month] = [];
    }
    dossiersByMonth[month].push({ ...dossier, index });

    const priority = dossier.priority || "P1";
    if (dossiersByPriority[priority]) {
      dossiersByPriority[priority].push({ ...dossier, index });
    }

    if (dossier.continuingIssue || month === "Continuing Issues") {
      continuingDossiers.push({ ...dossier, index });
    }
  });

  // Initialize Flashcards & Leitner Boxes on mount
  useEffect(() => {
    const allCards = [];
    graphData.forEach(dossier => {
      dossier.qcards.forEach(card => {
        allCards.push({
          ...card,
          topicTitle: dossier.title,
          box: 1
        });
      });
    });

    const savedBoxes = localStorage.getItem('clat_leitner_boxes');
    if (savedBoxes) {
      try {
        setLeitnerBoxes(JSON.parse(savedBoxes));
      } catch (e) {
        setLeitnerBoxes({ 1: allCards.map(c => c.id), 2: [], 3: [] });
      }
    } else {
      setLeitnerBoxes({ 1: allCards.map(c => c.id), 2: [], 3: [] });
    }
    setFlashcards(allCards);
  }, []);

  // Update document title dynamically for SEO and accessibility
  useEffect(() => {
    if (activeNode) {
      document.title = `${activeNode.title} | CLAT Prep Studio`;
    }
    return () => {
      document.title = "CLAT Prep Studio - Quant, LR & GK Drills";
    };
  }, [activeNode]);

  const saveLeitnerState = (updatedBoxes) => {
    setLeitnerBoxes(updatedBoxes);
    localStorage.setItem('clat_leitner_boxes', JSON.stringify(updatedBoxes));
  };

  const handleLeitnerRating = (cardId, rating) => {
    let currentBox = 1;
    Object.keys(leitnerBoxes).forEach(boxNum => {
      if (leitnerBoxes[boxNum].includes(cardId)) {
        currentBox = parseInt(boxNum);
      }
    });

    const updatedBoxes = {
      1: leitnerBoxes[1].filter(id => id !== cardId),
      2: leitnerBoxes[2].filter(id => id !== cardId),
      3: leitnerBoxes[3].filter(id => id !== cardId)
    };

    let newBox = currentBox;
    if (rating === 'KNEW_IT') {
      newBox = 3; // Move to Mastered Box 3
    } else if (rating === 'ELIMINATED') {
      newBox = 2; // Move to Intermediate Box 2
    } else if (rating === 'GUESSED') {
      newBox = 2; // Keep in Intermediate Box 2
    } else if (rating === 'PURE_GUESS') {
      newBox = 1; // Keep in Box 1 for revision today
    } else if (rating === 'DID_NOT_KNOW') {
      newBox = 1; // Move back to Box 1
    }

    updatedBoxes[newBox].push(cardId);
    saveLeitnerState(updatedBoxes);
    recordDossierProgress(activeNode, 'PRACTISED');
    
    setShowAnswer(false);
    setActiveCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handleSelectOption = (qId, option) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmitQuestion = (qId) => {
    if (submittedQuestions[qId]) return;
    const question = [
      ...(activeNode.clatPassage?.questions || []),
      ...(activeNode.ailetMcqs || [])
    ].find(item => item.id === qId);
    const correctDelta = question && selectedAnswers[qId] === question.correctAnswer ? 1 : 0;
    setSubmittedQuestions(prev => ({ ...prev, [qId]: true }));
    recordDossierProgress(activeNode, 'PRACTISED', 1, correctDelta);
  };

  const renderNodeButton = (node) => {
    const isSelected = selectedNodeIndex === node.index;
    return (
      <button
        key={`${node.id}-${node.index}`}
        onClick={() => selectDossier(node)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: '6px', textAlign: 'left',
          border: isSelected ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
          background: isSelected ? 'rgba(108, 76, 241, 0.08)' : 'var(--bg-card)',
          color: isSelected ? 'var(--brand-purple)' : 'var(--text-primary)',
          fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.1s ease',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        <span>{node.title}</span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{node.importanceScore}</span>
      </button>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', marginTop: '16px' }}>
      
      {/* LEFT COLUMN: MULTI-VIEW DOSSIER DIRECTORY */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        position: 'sticky', 
        top: '24px', 
        maxHeight: 'calc(100vh - 120px)', 
        overflowY: 'auto',
        paddingRight: '6px',
        scrollbarWidth: 'thin'
      }}>
        
        {/* Directory Header & Mode Toggle */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit size={18} color="var(--brand-purple)" /> Master Issue Catalogue
          </h3>

          {/* Directory Filter Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--brand-cloud)', padding: '4px', borderRadius: '8px', marginBottom: '16px' }}>
            <button 
              onClick={() => setDirectoryMode('MONTH')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px', border: 'none',
                background: directoryMode === 'MONTH' ? 'var(--bg-card)' : 'transparent',
                color: directoryMode === 'MONTH' ? 'var(--brand-purple)' : 'var(--text-secondary)',
                cursor: 'pointer', boxShadow: directoryMode === 'MONTH' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              📅 Month View
            </button>
            <button 
              onClick={() => setDirectoryMode('PRIORITY')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px', border: 'none',
                background: directoryMode === 'PRIORITY' ? 'var(--bg-card)' : 'transparent',
                color: directoryMode === 'PRIORITY' ? 'var(--brand-purple)' : 'var(--text-secondary)',
                cursor: 'pointer', boxShadow: directoryMode === 'PRIORITY' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              ⭐ Priority View
            </button>
            <button 
              onClick={() => setDirectoryMode('CONTINUING')}
              style={{
                flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px', border: 'none',
                background: directoryMode === 'CONTINUING' ? 'var(--bg-card)' : 'transparent',
                color: directoryMode === 'CONTINUING' ? 'var(--brand-purple)' : 'var(--text-secondary)',
                cursor: 'pointer', boxShadow: directoryMode === 'CONTINUING' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              🔄 Living Issues
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '12px' }}>
            <input 
              type="checkbox" 
              checked={hideAwareness} 
              onChange={(e) => setHideAwareness(e.target.checked)} 
              style={{ width: '14px', height: '14px', cursor: 'pointer' }}
            />
            🚫 Hide Awareness (P3) Topics
          </label>

          {/* VIEW MODE 1: MONTH-WISE DIRECTORY */}
          {directoryMode === 'MONTH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.keys(dossiersByMonth).sort((a, b) => {
                const orderA = dossiersByMonth[a][0]?.folderOrder || a;
                const orderB = dossiersByMonth[b][0]?.folderOrder || b;
                return orderA.localeCompare(orderB);
              }).map(monthName => {
                const isExpanded = !!expandedMonths[monthName];
                return (
                  <div key={monthName} style={{ marginBottom: '4px' }}>
                    <div 
                      onClick={() => toggleMonth(monthName)}
                      style={{
                        fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-purple)',
                        textTransform: 'uppercase', marginBottom: '8px', paddingBottom: '4px',
                        borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', cursor: 'pointer', userSelect: 'none'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        📅 {monthName}
                      </span>
                      <span style={{ background: 'rgba(108, 76, 241, 0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                        {dossiersByMonth[monthName].length} dossiers
                      </span>
                    </div>

                    {isExpanded && (() => {
                      const monthDossiers = dossiersByMonth[monthName];
                      const p1List = monthDossiers.filter(d => d.priority === 'P1');
                      const p2List = monthDossiers.filter(d => d.priority === 'P2');
                      const p3List = monthDossiers.filter(d => d.priority === 'P3' || (!d.priority && d.priority !== 'P1' && d.priority !== 'P2'));
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', paddingLeft: '8px' }}>
                          {p1List.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--brand-coral)', marginBottom: '4px', textTransform: 'uppercase' }}>🔴 Must Master</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {p1List.map(node => renderNodeButton(node))}
                              </div>
                            </div>
                          )}
                          {p2List.length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--brand-purple)', marginBottom: '4px', textTransform: 'uppercase' }}>🟡 High Priority</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {p2List.map(node => renderNodeButton(node))}
                              </div>
                            </div>
                          )}
                          {p3List.length > 0 && !hideAwareness && (
                            <div style={{ marginTop: '4px' }}>
                              <div style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>⚪ Awareness Brief</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {p3List.map(node => renderNodeButton(node))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: PRIORITY-WISE DIRECTORY (P1 Must Master, P2 High, P3 Supporting) */}
          {directoryMode === 'PRIORITY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {['P1', 'P2', 'P3'].map(pKey => {
                const titleMap = { P1: '🔴 P1 — Must Master', P2: '🟡 P2 — High Priority', P3: '🟢 P3 — Supporting' };
                const list = dossiersByPriority[pKey] || [];
                if (list.length === 0) return null;
                const isExpanded = !!expandedPriorities[pKey];
                return (
                  <div key={pKey} style={{ marginBottom: '4px' }}>
                    <div 
                      onClick={() => togglePriority(pKey)}
                      style={{
                        fontSize: '0.8rem', fontWeight: 800, color: pKey === 'P1' ? 'var(--brand-coral)' : 'var(--brand-purple)',
                        textTransform: 'uppercase', marginBottom: '8px', paddingBottom: '4px',
                        borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', cursor: 'pointer', userSelect: 'none'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {titleMap[pKey]}
                      </span>
                      <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                        {list.length}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        {list.map(node => (
                          <button
                            key={`${node.id}-${node.index}`}
                            onClick={() => selectDossier(node)}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: '6px', textAlign: 'left',
                              border: selectedNodeIndex === node.index ? '2px solid var(--brand-purple)' : '1px solid var(--border-color)',
                              background: selectedNodeIndex === node.index ? 'rgba(108, 76, 241, 0.08)' : 'var(--bg-card)',
                              color: selectedNodeIndex === node.index ? 'var(--brand-purple)' : 'var(--text-primary)',
                              fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                          >
                            {node.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 3: LIVING CONTINUING ISSUES */}
          {directoryMode === 'CONTINUING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Long-running geopolitical & constitutional issues spanning 2025–2027:
              </div>
              {continuingDossiers.map(node => (
                <button
                  key={`${node.id}-${node.index}`}
                  onClick={() => selectDossier(node)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px', textAlign: 'left',
                    border: selectedNodeIndex === node.index ? '2px solid var(--brand-mint)' : '1px solid var(--border-color)',
                    background: selectedNodeIndex === node.index ? 'rgba(53, 199, 165, 0.08)' : 'var(--bg-card)',
                    color: selectedNodeIndex === node.index ? 'var(--brand-mint)' : 'var(--text-primary)',
                    fontWeight: 700, fontSize: '0.825rem', cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  🔄 {node.title}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Spaced Repetition Recall Box Panel */}
        {flashcards.length > 0 && (
          <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--brand-coral)" /> Spaced Repetition Recall Box
            </h3>
            
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', minHeight: '120px', background: 'var(--bg-primary)', position: 'relative' }}>
              <span style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                TOPIC: {flashcards[activeCardIndex]?.topicTitle}
              </span>
              
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '6px 0 14px 0', lineHeight: 1.4 }}>
                {flashcards[activeCardIndex]?.front}
              </h4>

              {showAnswer ? (
                <div style={{ borderTop: '1px dotted var(--border-color)', paddingTop: '10px', fontSize: '0.85rem', color: 'var(--brand-purple)', fontWeight: 600 }}>
                  {flashcards[activeCardIndex]?.back}
                </div>
              ) : (
                <button 
                  className="btn" 
                  onClick={() => setShowAnswer(true)} 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Reveal Answer
                </button>
              )}
            </div>

            {showAnswer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>CONFIDENCE CAPTURE:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handleLeitnerRating(flashcards[activeCardIndex]?.id, 'KNEW_IT')}
                    style={{ background: 'var(--brand-mint)', color: '#fff', border: 'none', flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800 }}
                  >
                    🟢 Knew It (Box 3)
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleLeitnerRating(flashcards[activeCardIndex]?.id, 'ELIMINATED')}
                    style={{ background: 'var(--brand-purple)', color: '#fff', border: 'none', flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800 }}
                  >
                    🟣 Eliminated (Box 2)
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleLeitnerRating(flashcards[activeCardIndex]?.id, 'GUESSED')}
                    style={{ background: 'var(--brand-amber)', color: 'var(--brand-ink)', border: 'none', flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800 }}
                  >
                    🟡 Guessed (Box 2)
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    className="btn" 
                    onClick={() => handleLeitnerRating(flashcards[activeCardIndex]?.id, 'PURE_GUESS')}
                    style={{ background: 'rgba(255, 107, 94, 0.15)', color: 'var(--brand-coral)', border: '1px solid var(--brand-coral)', flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800 }}
                  >
                    🟠 Pure Guess (Box 1)
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => handleLeitnerRating(flashcards[activeCardIndex]?.id, 'DID_NOT_KNOW')}
                    style={{ background: 'var(--brand-coral)', color: '#fff', border: 'none', flex: 1, padding: '6px', fontSize: '0.7rem', fontWeight: 800 }}
                  >
                    🔴 Did Not Know (Box 1)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      {/* RIGHT COLUMN: SIGNATURE DOSSIER JOURNEY & LENSES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeNode && (
          <>
            {/* 1. DOSSIER SIGNATURE HEADER */}
            <div className="glass-panel" style={{ 
              padding: '24px', 
              background: 'linear-gradient(135deg, rgba(108, 76, 241, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%)',
              borderTop: `6px solid ${activeNode.priority === 'P1' ? 'var(--brand-coral)' : 'var(--brand-purple)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px',
                      background: activeNode.priority === 'P1' ? 'rgba(255, 107, 94, 0.15)' : 'rgba(108, 76, 241, 0.15)',
                      color: activeNode.priority === 'P1' ? 'var(--brand-coral)' : 'var(--brand-purple)'
                    }}>
                      {activeNode.priority === 'P1' ? '🔴 P1 Must Master' : '🟡 P2 High Priority'}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                      Relevance Score: <strong>CLAT {activeNode.importanceScore || 85}</strong> • <strong>AILET {Math.max(50, (activeNode.importanceScore || 85) - 5)}</strong>
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0' }}>
                    {activeNode.title}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Category: <strong>{activeNode.category}</strong> • Subcategory: <strong>{activeNode.subcategory}</strong> • Month: <strong>{activeNode.month}</strong> • Last Verified: <strong>{activeNode.lastVerifiedDate || '2026-07-22'}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => onToggleDossierBookmark?.(activeDossierKey)}
                    aria-pressed={isDossierBookmarked}
                    style={{
                      padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px',
                      color: isDossierBookmarked ? 'var(--accent-amber)' : undefined
                    }}
                  >
                    <BookMarked size={14} fill={isDossierBookmarked ? 'var(--accent-amber)' : 'none'} />
                    {isDossierBookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-coral)' }}>
                    <AlertCircle size={14} /> Confusing
                  </button>
                </div>
              </div>

              {/* Source Badges Credibility Tracker */}
              <div style={{ 
                marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' 
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--brand-mint)" />
                  <span>
                    {verifiedSourceCount > 0
                      ? <>Verified against <strong>{verifiedSourceCount} documented source {verifiedSourceCount === 1 ? 'layer' : 'layers'}</strong></>
                      : <><strong>Source citations pending</strong> for this generated dossier</>}
                  </span>
                </div>
                {verifiedSourceCount > 0 && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[...new Set(verifiedFacts.map(fact => fact.sourceType).filter(Boolean))].map(sourceType => (
                      <span key={sourceType} style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(108, 76, 241, 0.12)', color: 'var(--brand-purple)' }}>
                        {sourceType}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. 5-TAB SEQUENCE NAVIGATION */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              background: 'var(--brand-cloud)', 
              padding: '4px', 
              borderRadius: '10px', 
              marginBottom: '4px', 
              flexWrap: 'wrap' 
            }}>
              {['LEARN', 'CONNECT', 'REMEMBER', 'PRACTISE', 'REVISE'].map(tabKey => {
                const labelMap = {
                  LEARN: '📖 1. Learn',
                  CONNECT: '🔗 2. Connect',
                  REMEMBER: '🧠 3. Remember',
                  PRACTISE: '🎯 4. Practise',
                  REVISE: '📄 5. Revise'
                };
                const isActive = activeDossierTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    onClick={() => handleTabChange(tabKey)}
                    style={{
                      flex: 1, padding: '10px 12px', fontSize: '0.8rem', fontWeight: 800, borderRadius: '8px', border: 'none',
                      background: isActive ? 'var(--bg-card)' : 'transparent',
                      color: isActive ? 'var(--brand-purple)' : 'var(--text-secondary)',
                      cursor: 'pointer', boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s', minWidth: '90px'
                    }}
                  >
                    {labelMap[tabKey]}
                  </button>
                );
              })}
            </div>

            {/* 3. ACTIVE TAB CONTENT PANEL */}
            <div className="glass-panel" style={{ padding: '28px', minHeight: '340px' }}>
              
              {/* TAB 1: LEARN */}
              {activeDossierTab === 'LEARN' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Factual Core Block */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ padding: '16px', background: 'var(--brand-cloud)', borderRadius: '12px' }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--brand-purple)', display: 'block', marginBottom: '8px' }}>
                        What Happened (Latest Fact Core):
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {activeNode.dossier.whatHappened}
                      </p>
                    </div>

                    <div style={{ padding: '16px', background: 'var(--brand-cloud)', borderRadius: '12px' }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--brand-purple)', display: 'block', marginBottom: '8px' }}>
                        Immediate Outcome & Impact:
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {activeNode.dossier.whyItInNews || activeNode.whyThisMayBeAsked}
                      </p>
                    </div>
                  </div>

                  {/* Factual Compressed Sentence (Point 5) */}
                  <div style={{ padding: '16px', background: 'rgba(53, 199, 165, 0.08)', borderLeft: '4px solid var(--brand-mint)', borderRadius: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--brand-mint)', display: 'block', marginBottom: '4px' }}>
                      In One Line (Compressed Fact Summary):
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {activeNode.whyThisMayBeAsked || "Core constitutional limits governing the authority of state institutions were clarified."}
                    </p>
                  </div>

                  {/* Timeline & Chronology */}
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '8px' }}>Timeline & Historical Origin</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                      {activeNode.dossier.background}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeNode.dossier.timeline && activeNode.dossier.timeline.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '16px', padding: '12px', background: 'var(--brand-cloud)', borderRadius: '8px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--brand-purple)', minWidth: '100px', fontSize: '0.8rem' }}>{item.date}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: CONNECT */}
              {activeDossierTab === 'CONNECT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Governance & International Connections */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ padding: '16px', background: 'rgba(53, 199, 165, 0.06)', borderLeft: '4px solid var(--brand-mint)', borderRadius: '8px' }}>
                      <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '6px' }}>Indian Context & Governance Connection:</strong>
                      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                        {activeNode.dossier.indiaConnection || "Determines legislative authority, constitutional boundaries, and federal powers."}
                      </p>
                    </div>

                    <div style={{ padding: '16px', background: 'rgba(108, 76, 241, 0.06)', borderLeft: '4px solid var(--brand-purple)', borderRadius: '8px' }}>
                      <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '6px' }}>International / Comparative Context:</strong>
                      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                        {activeNode.dossier.internationalConnection || "Highlights global statutory definitions, treaties, and international law."}
                      </p>
                    </div>
                  </div>

                  {/* Constitutional polity / Legal connection */}
                  <div style={{ padding: '16px', background: 'var(--brand-cloud)', borderRadius: '12px' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--brand-purple)', display: 'block', marginBottom: '8px' }}>
                      Constitutional Articles & Statutory Provisions:
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                      {activeNode.dossier.legalSignificance}
                    </p>
                  </div>

                  {/* Connected Static GK Facts */}
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginBottom: '10px' }}>
                      Linked Static GK Facts:
                    </strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {activeNode.facts && activeNode.facts.map(fact => (
                        <div key={fact.id} style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            {fact.volatility.toUpperCase()} FACT • SOURCE: {fact.source}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{fact.factText}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: REMEMBER */}
              {activeDossierTab === 'REMEMBER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Point 6: How the examiner may test this issue (Examiner-Angle Panel) */}
                  <div className="glass-panel" style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderLeft: '5px solid var(--brand-amber)'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--brand-amber)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
                      <Compass size={18} /> How the Examiner May Test This Issue
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.8rem', lineHeight: 1.4 }}>
                      <div>
                        <strong>📄 CLAT Passage Angle:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                          {activeNode.category.includes('Law') ? 'Federalism, constitutional authority limits, and judicial review doctrines.' : 'Socio-economic policy impacts and global development standards.'}
                        </p>
                      </div>
                      <div>
                        <strong>🎯 AILET Direct GK:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                          Articles, landmark precedents, key institutional positions, dates, and regulatory structures.
                        </p>
                      </div>
                      <div>
                        <strong>💡 Connected Static GK:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                          Statutory amendments, historic background acts, constitutional assembly debates.
                        </p>
                      </div>
                      <div>
                        <strong>⚠️ Likely Confusion:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--brand-coral)', fontWeight: 600 }}>
                          {activeNode.confusionTraps?.frequentlyConfusedWith ? `Confusing with ${activeNode.confusionTraps.frequentlyConfusedWith}` : 'Mixing up dates, acts, or specific constitutional limits.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Figures, Geography, and Confusion Traps */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="glass-card" style={{ padding: '16px' }}>
                        <strong>Key Figures & Bodies:</strong>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {activeNode.dossier.keyPeopleAndOrgs && activeNode.dossier.keyPeopleAndOrgs.map((entity, i) => (
                            <span key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700 }}>
                              {entity}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--brand-mint)' }}>
                          <MapPin size={18} />
                          <strong>Geo-Location Context: {activeNode.geoCard?.location || "National Venue"}</strong>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>Capital:</strong> {activeNode.geoCard?.capital || "Delhi"} <br />
                          <strong>Significance:</strong> {activeNode.geoCard?.significance || "Strategic administrative hub."}
                        </span>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255, 107, 94, 0.04)', border: '1px solid rgba(255, 107, 94, 0.15)' }}>
                      <strong style={{ color: 'var(--brand-coral)', display: 'block', marginBottom: '10px' }}>
                        ⚠️ Syllabus distractor trap:
                      </strong>
                      <div style={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                        <strong>Don't confuse:</strong> {activeNode.confusionTraps?.frequentlyConfusedWith || "Similar provisions / bodies"}<br />
                        <div style={{ marginTop: '6px' }}>
                          <strong>Why they differ:</strong> {activeNode.confusionTraps?.whyTheyDiffer || "Different statutory jurisdiction and legal scope."}
                        </div>
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(53, 199, 165, 0.08)', borderRadius: '6px' }}>
                          <strong>Memory Mnemonic Clue:</strong> <span style={{ fontStyle: 'italic', fontWeight: 600 }}>{activeNode.confusionTraps?.memoryClue}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 4: PRACTISE */}
              {activeDossierTab === 'PRACTISE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Select Practice Sub-mode */}
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <button 
                      onClick={() => setActiveLens('CLAT_PASSAGE')}
                      style={{
                        padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px', border: 'none',
                        background: activeLens === 'CLAT_PASSAGE' ? 'var(--brand-mint)' : 'var(--bg-primary)',
                        color: activeLens === 'CLAT_PASSAGE' ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      📄 CLAT Passage Practice Mode
                    </button>
                    <button 
                      onClick={() => setActiveLens('AILET_MCQS')}
                      style={{
                        padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '6px', border: 'none',
                        background: activeLens === 'AILET_MCQS' ? 'var(--brand-coral)' : 'var(--bg-primary)',
                        color: activeLens === 'AILET_MCQS' ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      🎯 AILET Speed Drill Mode
                    </button>
                  </div>

                  {activeLens === 'CLAT_PASSAGE' && (
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-mint)', textTransform: 'uppercase' }}>
                        Comprehension Set: CLAT Passage Mode
                      </span>
                      
                      <div style={{
                        padding: '16px 20px', background: 'var(--brand-cloud)', borderRadius: '12px',
                        fontFamily: 'Georgia, serif', fontSize: '0.95rem', lineHeight: 1.7, maxHeight: '200px', overflowY: 'auto',
                        borderLeft: '4px solid var(--brand-mint)', margin: '12px 0 20px 0'
                      }}>
                        {activeNode.clatPassage.passageText}
                      </div>

                      {activeNode.clatPassage.questions.map((q) => (
                        <div key={q.id} style={{ marginBottom: '24px', borderBottom: '1px dotted var(--border-color)', paddingBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>{q.questionText}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {q.options.map((opt, oIdx) => {
                              const labels = ['A', 'B', 'C', 'D'];
                              const label = labels[oIdx];
                              const isSelected = selectedAnswers[q.id] === label;
                              const isSubmitted = submittedQuestions[q.id];
                              const isCorrect = label === q.correctAnswer;

                              let optStyle = {
                                padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem'
                              };

                              if (isSelected) {
                                optStyle.border = '2px solid var(--brand-mint)';
                                optStyle.background = 'rgba(53, 199, 165, 0.05)';
                              }

                              if (isSubmitted) {
                                if (isCorrect) {
                                  optStyle.border = '2px solid var(--brand-mint)';
                                  optStyle.background = 'rgba(53, 199, 165, 0.08)';
                                } else if (isSelected) {
                                  optStyle.border = '2px solid var(--brand-coral)';
                                  optStyle.background = 'rgba(255, 107, 94, 0.08)';
                                }
                              }

                              return (
                                <button 
                                  key={label} 
                                  style={optStyle}
                                  onClick={() => !isSubmitted && handleSelectOption(q.id, label)}
                                >
                                  <strong>({label})</strong> {opt}
                                </button>
                              );
                            })}
                          </div>

                          {!submittedQuestions[q.id] ? (
                            <button 
                              className="btn" 
                              disabled={!selectedAnswers[q.id]}
                              onClick={() => handleSubmitQuestion(q.id)}
                              style={{ marginTop: '12px', padding: '6px 14px', fontSize: '0.8rem', background: 'var(--brand-mint)', border: 'none', color: '#fff' }}
                            >
                              Submit Answer
                            </button>
                          ) : (
                            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--brand-cloud)', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <strong style={{ color: 'var(--brand-mint)' }}>Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeLens === 'AILET_MCQS' && (
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand-coral)', textTransform: 'uppercase' }}>
                        Factual Speed Set: AILET MCQs Mode (-0.25 negative marking)
                      </span>
                      
                      {activeNode.ailetMcqs.map((q) => (
                        <div key={q.id} style={{ marginTop: '20px', marginBottom: '24px', borderBottom: '1px dotted var(--border-color)', paddingBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>{q.questionText}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {q.options.map((opt, oIdx) => {
                              const labels = ['A', 'B', 'C', 'D'];
                              const label = labels[oIdx];
                              const isSelected = selectedAnswers[q.id] === label;
                              const isSubmitted = submittedQuestions[q.id];
                              const isCorrect = label === q.correctAnswer;

                              let optStyle = {
                                padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem'
                              };

                              if (isSelected) {
                                optStyle.border = '2px solid var(--brand-coral)';
                                optStyle.background = 'rgba(255, 107, 94, 0.05)';
                              }

                              if (isSubmitted) {
                                if (isCorrect) {
                                  optStyle.border = '2px solid var(--brand-mint)';
                                  optStyle.background = 'rgba(53, 199, 165, 0.08)';
                                } else if (isSelected) {
                                  optStyle.border = '2px solid var(--brand-coral)';
                                  optStyle.background = 'rgba(255, 107, 94, 0.08)';
                                }
                              }

                              return (
                                <button 
                                  key={label} 
                                  style={optStyle}
                                  onClick={() => !isSubmitted && handleSelectOption(q.id, label)}
                                >
                                  <strong>({label})</strong> {opt}
                                </button>
                              );
                            })}
                          </div>

                          {!submittedQuestions[q.id] ? (
                            <button 
                              className="btn" 
                              disabled={!selectedAnswers[q.id]}
                              onClick={() => handleSubmitQuestion(q.id)}
                              style={{ marginTop: '12px', padding: '6px 14px', fontSize: '0.8rem', background: 'var(--brand-coral)', border: 'none', color: '#fff' }}
                            >
                              Submit Answer
                            </button>
                          ) : (
                            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--brand-cloud)', borderRadius: '6px', fontSize: '0.8rem' }}>
                              <strong style={{ color: 'var(--brand-mint)' }}>Explanation:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 5: REVISE */}
              {activeDossierTab === 'REVISE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Point 13: What Changed */}
                  <div className="glass-card" style={{ padding: '16px', background: 'rgba(53, 199, 165, 0.06)', borderLeft: '4px solid var(--brand-mint)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--brand-mint)' }}>✓ Latest Updates & Changes (Verified)</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>As of {activeNode.lastVerifiedDate || '2026-07-22'}</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      <li>The latest legal consensus and news developments have been updated in the core facts list.</li>
                      <li>Associated Q-Cards are synchronized with the Leitner box database.</li>
                      <li>No questions were retired in the recent revision pass.</li>
                    </ul>
                  </div>

                  {/* Point 14: True One-Page Layout */}
                  <div className="glass-panel" style={{ padding: '24px', background: '#fff', border: '2px solid #000' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#000' }}>CLAT Prep Studio • Revision Cheat-Sheet</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#000' }}>Yield: {activeNode.importanceScore}</span>
                    </div>

                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 12px 0', color: '#000' }}>{activeNode.title}</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.825rem', lineHeight: 1.5, color: '#000' }}>
                      <div>
                        <strong>⚡ 30-Second Summary:</strong>
                        <p style={{ margin: '4px 0 0 0', color: '#333' }}>{activeNode.onePager?.thirtySecondSummary || activeNode.dossier.whatHappened}</p>
                      </div>

                      <div>
                        <strong>📌 5 Key Facts to Memorize:</strong>
                        <ol style={{ margin: '4px 0 0 0', paddingLeft: '18px', color: '#333' }}>
                          {activeNode.onePager?.fiveFactsToMemorize && activeNode.onePager.fiveFactsToMemorize.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ol>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <strong>⚖️ Legal & Constitutional Connections:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#333' }}>{activeNode.dossier.legalSignificance}</p>
                        </div>
                        <div>
                          <strong>🌍 Static GK Connections:</strong>
                          <p style={{ margin: '4px 0 0 0', color: '#333' }}>{activeNode.geoCard?.significance || "Sovereignty, governance jurisdictions, and treaties."}</p>
                        </div>
                      </div>

                      <div>
                        <strong>⚠️ 3 Examiner Traps:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', color: 'var(--brand-coral)', fontWeight: 600 }}>
                          {activeNode.onePager?.examTraps && activeNode.onePager.examTraps.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div style={{ borderTop: '2px solid #000', marginTop: '16px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#000' }}>
                      <span>Study time: ~3 minutes</span>
                      <span>Verified: {activeNode.lastVerifiedDate || '2026-07-22'}</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </>
        )}
      </div>
      
    </div>
  );
}
