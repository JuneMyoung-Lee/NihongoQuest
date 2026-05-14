export default function VocabNotesPanel({ vocabItems, kanjiNotes }) {
  const hasVocab = Array.isArray(vocabItems) && vocabItems.length > 0;
  const hasKanji = Array.isArray(kanjiNotes) && kanjiNotes.length > 0;

  if (!hasVocab && !hasKanji) return null;

  return (
    <div className="vocab-notes-panel">
      {hasVocab && (
        <div className="vocab-section">
          <div className="vocab-section-title">📖 단어 노트</div>
          <div className="vocab-list">
            {vocabItems.map((item) => (
              <div key={item.id} className="vocab-row">
                <span className="vocab-surface">{item.surface}</span>
                <span className="vocab-reading">{item.reading}</span>
                <span className="vocab-meaning">{item.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasKanji && (
        <div className="vocab-section kanji-section">
          <div className="vocab-section-title">🈳 한자 노트</div>
          <div className="kanji-list">
            {kanjiNotes.map((k) => (
              <div key={k.char} className="kanji-row">
                <span className="kanji-char">{k.char}</span>
                <span className="kanji-info">
                  <span className="kanji-meaning">{k.meaning ?? ""}</span>
                  {k.readingInWord && (
                    <span className="kanji-reading-word">/{k.readingInWord}/</span>
                  )}
                  {k.onyomi && (
                    <span className="kanji-onyomi">音:{k.onyomi}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
