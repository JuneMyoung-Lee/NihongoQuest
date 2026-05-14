import { useState } from "react";

// text를 vocab surface 기준으로 세그먼트 배열로 파싱.
// 긴 surface 우선 매칭, \n은 newline 세그먼트로 변환.
function parseSegments(text, vocabItems) {
  if (!text) return [];

  const validItems = Array.isArray(vocabItems)
    ? vocabItems.filter((v) => v && v.surface)
    : [];

  if (validItems.length === 0) {
    return [{ type: "text", content: text }];
  }

  const sorted = [...validItems].sort((a, b) => b.surface.length - a.surface.length);

  const segments = [];
  let i = 0;
  let buf = "";

  const flush = () => {
    if (buf) {
      segments.push({ type: "text", content: buf });
      buf = "";
    }
  };

  while (i < text.length) {
    if (text[i] === "\n") {
      flush();
      segments.push({ type: "newline" });
      i++;
      continue;
    }

    let hit = null;
    for (const item of sorted) {
      if (text.startsWith(item.surface, i)) {
        hit = item;
        break;
      }
    }

    if (hit) {
      flush();
      segments.push({ type: "vocab", content: hit.surface, vocab: hit });
      i += hit.surface.length;
    } else {
      buf += text[i++];
    }
  }

  flush();
  return segments;
}

function VocabWordCard({ vocab, onClose }) {
  const hasKanji = Array.isArray(vocab.kanji) && vocab.kanji.length > 0;

  return (
    <div className="vocab-word-card">
      <div className="vocab-word-card-header">
        <span className="vocab-word-card-surface">{vocab.surface ?? ""}</span>
        <span className="vocab-word-card-reading">{vocab.reading ?? ""}</span>
        <button
          type="button"
          className="vocab-word-card-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
      <div className="vocab-word-card-meaning">{vocab.meaning ?? ""}</div>

      {hasKanji && (
        <div className="vocab-word-card-kanji">
          {vocab.kanji.map((k) =>
            k && k.char ? (
              <div key={k.char} className="vocab-word-card-kanji-row">
                <span className="vocab-word-card-kanji-char">{k.char}</span>
                <span className="vocab-word-card-kanji-detail">
                  {k.meaning ?? ""}
                  {k.readingInWord ? ` ／ ${k.readingInWord}` : ""}
                </span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export default function AnnotatedText({ text, vocabItems }) {
  const [selectedVocab, setSelectedVocab] = useState(null);

  const segments = parseSegments(text, vocabItems);
  const hasAnnotations = segments.some((s) => s.type === "vocab");

  function handleVocabClick(vocab) {
    setSelectedVocab((prev) => (prev?.id === vocab.id ? null : vocab));
  }

  return (
    <div className="annotated-text-wrap">
      <div className="question-prompt">
        {segments.map((seg, idx) => {
          if (seg.type === "newline") return <br key={idx} />;
          if (seg.type === "vocab") {
            const isActive = selectedVocab?.id === seg.vocab.id;
            return (
              <button
                key={idx}
                type="button"
                className={`vocab-term${isActive ? " vocab-term-active" : ""}`}
                onClick={() => handleVocabClick(seg.vocab)}
              >
                {seg.content}
              </button>
            );
          }
          return <span key={idx}>{seg.content}</span>;
        })}
      </div>

      {hasAnnotations && !selectedVocab && (
        <p className="vocab-tap-hint">💡 밑줄 단어를 탭하면 뜻을 볼 수 있어요</p>
      )}

      {selectedVocab && (
        <VocabWordCard
          vocab={selectedVocab}
          onClose={() => setSelectedVocab(null)}
        />
      )}
    </div>
  );
}
