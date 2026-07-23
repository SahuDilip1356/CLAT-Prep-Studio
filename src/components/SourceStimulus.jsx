import React from 'react';
import { ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

export default function SourceStimulus({ question, showVisual = true }) {
  const {
    directionsText,
    passageText,
    requiresSourceVisual,
    sourcePdfUrl,
    sourcePage,
    stimulusSourcePage,
    sourceSection,
    sourceQuestionNo,
    stimulusType,
  } = question;

  const page = stimulusSourcePage || sourcePage || 1;
  const sourceHref = sourcePdfUrl ? `${sourcePdfUrl}#page=${page}` : null;
  const hasContext = Boolean(directionsText || passageText);

  return (
    <>
      {hasContext && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.05)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-primary)',
            marginBottom: '20px',
            fontSize: '0.925rem',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontWeight: 800,
              fontSize: '0.78rem',
              color: 'var(--accent-primary)',
              marginBottom: '7px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <FileText size={15} />
            {stimulusType === 'linked-question'
              ? 'Referenced Source Problem'
              : stimulusType === 'directions'
                ? 'Source Directions'
                : 'Shared Source Context'}
          </div>
          {directionsText && <div>{directionsText}</div>}
          {passageText && <div>{passageText}</div>}
        </div>
      )}

      {showVisual && requiresSourceVisual && sourceHref && (
        <div
          style={{
            marginBottom: '20px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'var(--bg-primary)',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <ImageIcon size={15} /> Source figure / diagram
            </span>
            <a href={sourceHref} target="_blank" rel="noreferrer">
              Open full page <ExternalLink size={13} style={{ verticalAlign: 'middle' }} />
            </a>
          </div>
          <iframe
            src={`${sourceHref}&view=FitH`}
            title={`Source figure for ${sourceSection} question ${sourceQuestionNo}`}
            style={{ width: '100%', height: '500px', border: 0, background: '#fff' }}
          />
        </div>
      )}

      {sourceHref && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            margin: '-8px 0 16px',
            color: 'var(--text-muted)',
            fontSize: '0.74rem',
          }}
        >
          <span>
            Verified source: {sourceSection} Q{sourceQuestionNo} · PDF page {sourcePage}
          </span>
          <a href={`${sourcePdfUrl}#page=${sourcePage}`} target="_blank" rel="noreferrer">
            View original <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
          </a>
        </div>
      )}
    </>
  );
}
