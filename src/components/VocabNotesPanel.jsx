const TYPE_LABEL = {
  noun: "명사",
  verb: "동사",
  i_adj: "い형용사",
  na_adj: "な형용사",
  pronoun: "대명사",
  proper_noun: "고유명사",
  expression: "표현",
  conjunction: "접속사",
  adverb: "부사",
};

export default function VocabNotesPanel({ vocabItems }) {
  if (!Array.isArray(vocabItems) || vocabItems.length === 0) return null;

  return (
    <div className="vocab-notes-panel">
      <div className="vocab-section">
        <div className="vocab-section-title">📖 단어 노트</div>
        <div className="vocab-list">
          {vocabItems.map((item) => (
            <div key={item.id} className="vocab-row">
              <span className="vocab-surface">{item.surface ?? ""}</span>
              <span className="vocab-reading">{item.reading ?? ""}</span>
              <span className="vocab-meaning">{item.meaning ?? ""}</span>
              {item.type && TYPE_LABEL[item.type] && (
                <span className="vocab-type">{TYPE_LABEL[item.type]}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
