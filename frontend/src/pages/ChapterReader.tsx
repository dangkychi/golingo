import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storiesAPI, type Chapter } from '../api/stories';
import { vocabularyAPI } from '../api/vocabulary';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Languages, BookMarked, X } from 'lucide-react';
import './ChapterReader.css';

export default function ChapterReader() {
  const { slug, num } = useParams<{ slug: string; num: string }>();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [storyInfo, setStoryInfo] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);

  // Translation & selection states
  const { user } = useAuthStore();
  const [selectedText, setSelectedText] = useState('');
  const [contextParagraph, setContextParagraph] = useState('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const maxCharsLimit = 500;
  const chapterNum = parseInt(num || '1', 10);

  useEffect(() => {
    if (!slug || !num) return;
    setLoading(true);
    window.scrollTo(0, 0);

    // Reset selection state
    setSelectedText('');
    setSelectionCoords(null);

    storiesAPI
      .getChapter(slug, chapterNum)
      .then(({ data }) => {
        setChapter(data.chapter);
        setStoryInfo(data.story);
        setTotalChapters(data.total_chapters);
      })
      .catch(() => setChapter(null))
      .finally(() => setLoading(false));
  }, [slug, num, chapterNum]);

  // Close tooltip when clicking elsewhere
  useEffect(() => {
    const handleDocumentClick = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === '') {
        setSelectedText('');
        setSelectionCoords(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    if (!text) {
      setSelectedText('');
      setSelectionCoords(null);
      return;
    }

    // Identify paragraph context
    let paragraphContext = '';
    if (selection.anchorNode) {
      let node: Node | null = selection.anchorNode;
      while (node && node.nodeName !== 'P' && !(node instanceof HTMLElement && node.classList.contains('reader-content'))) {
        node = node.parentNode;
      }
      if (node && node.nodeName === 'P') {
        paragraphContext = node.textContent || '';
      }
    }

    setSelectedText(text);
    setContextParagraph(paragraphContext);

    // Calculate position for floating tooltip/button
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionCoords({
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.top + window.scrollY - 15,
      });
    } catch {
      setSelectionCoords(null);
    }
  };

  const handleTranslateAction = () => {
    setShowModal(true);
    setIsTranslating(true);
    setTranslationText('');
    setUserNote('');

    vocabularyAPI
      .translate(selectedText, contextParagraph, user?.translate_target_lang)
      .then(({ data }) => {
        setTranslationText(data.translation);
      })
      .catch((err: any) => {
        const errorMsg = err.response?.data?.error || 'Không thể kết nối dịch vụ dịch thuật';
        toast.error(errorMsg);
        setTranslationText('');
      })
      .finally(() => {
        setIsTranslating(false);
      });
  };

  const handleSaveVocabulary = () => {
    if (!selectedText) return;
    setIsSaving(true);

    const wordKey = selectedText.split(/\s+/).slice(0, 5).join(' ');

    vocabularyAPI
      .add({
        word: wordKey,
        selected_text: selectedText,
        translation: translationText,
        context_sentence: contextParagraph || undefined,
        user_note: userNote || undefined,
        chapter_id: chapter?.id,
        story_id: storyInfo?.id,
      })
      .then(() => {
        toast.success('Đã lưu vào từ vựng thành công!');
        setShowModal(false);
        window.getSelection()?.removeAllRanges();
        setSelectedText('');
        setSelectionCoords(null);
      })
      .catch((err: any) => {
        const errorMsg = err.response?.data?.error || 'Lỗi khi lưu từ vựng';
        toast.error(errorMsg);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (loading) {
    return (
      <div className="reader-page">
        <div className="reader-container">
          <p>Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter || !storyInfo) {
    return (
      <div className="reader-page">
        <div className="reader-container">
          <h2>Chapter not found</h2>
          <Link to={`/stories/${slug}`} className="btn btn-ghost">← Back to Story</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-page">
      {/* Reader Header */}
      <div className="reader-header">
        <div className="reader-header-inner">
          <Link to={`/stories/${slug}`} className="reader-back">
            ← {storyInfo.title}
          </Link>
          <span className="reader-progress">
            Chapter {chapterNum} of {totalChapters}
          </span>
        </div>
      </div>

      {/* Reader Content */}
      <article className="reader-container">
        <header className="reader-chapter-header">
          <h1 className="reader-chapter-title">
            {chapter.title || `Chapter ${chapterNum}`}
          </h1>
          <p className="reader-word-count">
            {chapter.word_count?.toLocaleString()} words
          </p>
        </header>

        <div className="reader-content" onMouseUp={handleSelection} onTouchEnd={handleSelection}>
          {chapter.content?.split('\n').map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;
            return <p key={i}>{trimmed}</p>;
          })}
        </div>
      </article>

      {/* Navigation */}
      <nav className="reader-nav">
        <button
          className="btn btn-ghost"
          disabled={chapterNum <= 1}
          onClick={() => navigate(`/stories/${slug}/chapters/${chapterNum - 1}`)}
        >
          ← Previous Chapter
        </button>
        <Link to={`/stories/${slug}`} className="btn btn-ghost">
          📚 All Chapters
        </Link>
        <button
          className="btn btn-ghost"
          disabled={chapterNum >= totalChapters}
          onClick={() => navigate(`/stories/${slug}/chapters/${chapterNum + 1}`)}
        >
          Next Chapter →
        </button>
      </nav>

      {/* Floating Translate Tooltip */}
      {selectionCoords && selectedText && (
        <div
          className={`translate-tooltip ${selectedText.length > maxCharsLimit ? 'tooltip-warning' : ''}`}
          style={{
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => {
            if (selectedText.length > maxCharsLimit) {
              toast.error(`Vượt giới hạn ${selectedText.length}/${maxCharsLimit} ký tự, vui lòng thu hẹp khoanh vùng!`);
              return;
            }
            if (!user) {
              toast.error('Vui lòng đăng nhập để sử dụng tính năng dịch và lưu từ vựng!');
              return;
            }
            handleTranslateAction();
          }}
        >
          <Languages size={14} />
          {selectedText.length > maxCharsLimit ? (
            <span>Vượt giới hạn {selectedText.length}/{maxCharsLimit} ký tự</span>
          ) : (
            <span>Dịch với AI</span>
          )}
        </div>
      )}

      {/* Translation & Vocabulary Modal */}
      {showModal && (
        <div className="translate-modal-backdrop" onClick={() => !isSaving && setShowModal(false)}>
          <div 
            className="translate-modal translate-modal-glow-cyan" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="translate-modal-header">
              <h3 className="translate-modal-title">
                <BookMarked size={16} className="text-cyan" />
                Dịch thuật & Lưu từ vựng
              </h3>
              <button 
                className="translate-modal-close" 
                onClick={() => !isSaving && setShowModal(false)}
                disabled={isSaving}
              >
                <X size={16} />
              </button>
            </div>

            <div className="translate-modal-body">
              <div className="translate-field">
                <span className="translate-label">Văn bản gốc ({selectedText.length} ký tự)</span>
                <div className="translate-selected-preview">
                  {selectedText}
                </div>
              </div>

              <div className="translate-field">
                <span className="translate-label">Bản dịch AI</span>
                {isTranslating ? (
                  <div className="translate-loading-box">
                    <div className="translate-spinner"></div>
                    <span>Gemini đang dịch theo ngữ cảnh...</span>
                  </div>
                ) : (
                  <textarea
                    className="translate-textarea"
                    value={translationText}
                    onChange={(e) => setTranslationText(e.target.value)}
                    placeholder="Nhập bản dịch hoặc chỉnh sửa bản dịch tự động tại đây..."
                    disabled={isSaving}
                    rows={3}
                  />
                )}
              </div>

              <div className="translate-field">
                <span className="translate-label">Ghi chú cá nhân</span>
                <textarea
                  className="translate-textarea"
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Thêm ghi chú, cụm động từ, từ đồng nghĩa..."
                  disabled={isSaving}
                  rows={2}
                />
              </div>
            </div>

            <div className="translate-modal-footer">
              <button
                className="translate-btn translate-btn-cancel"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                className="translate-btn translate-btn-save"
                onClick={handleSaveVocabulary}
                disabled={isSaving || isTranslating || !translationText.trim()}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu vào từ vựng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
