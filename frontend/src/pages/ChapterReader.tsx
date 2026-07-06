import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storiesAPI, type Chapter } from '../api/stories';
import { vocabularyAPI } from '../api/vocabulary';
import { progressAPI } from '../api/progress';
import { aiAPI, type QuizQuestion } from '../api/ai';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Languages, BookMarked, X, Sparkles } from 'lucide-react';
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
  
  // Translation Modal states
  const [showModal, setShowModal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sliding AI Assistant Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerContent, setDrawerContent] = useState('');
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Interactive Quiz states
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const maxCharsLimit = 500;
  const chapterNum = parseInt(num || '1', 10);

  useEffect(() => {
    if (!slug || !num) return;
    setLoading(true);
    window.scrollTo(0, 0);

    // Reset selection state
    setSelectedText('');
    setSelectionCoords(null);
    setDrawerOpen(false);
    setShowQuizModal(false);

    storiesAPI
      .getChapter(slug, chapterNum)
      .then(({ data }) => {
        setChapter(data.chapter);
        setStoryInfo(data.story);
        setTotalChapters(data.total_chapters);
        if (user) {
          progressAPI.saveReadingProgress(data.story.id, data.chapter.id).catch((err) => {
            console.error('Failed to save reading progress', err);
          });
        }
      })
      .catch(() => setChapter(null))
      .finally(() => setLoading(false));
  }, [slug, num, chapterNum, user]);

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

  const handleExplainAction = async () => {
    setDrawerTitle('Giải thích cấu trúc & ngữ pháp');
    setDrawerContent('');
    setDrawerLoading(true);
    setDrawerOpen(true);

    // Clear selection tooltip
    window.getSelection()?.removeAllRanges();
    setSelectedText('');
    setSelectionCoords(null);

    try {
      const { data } = await aiAPI.explain(selectedText, contextParagraph);
      setDrawerContent(data.explanation);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Không thể kết nối dịch vụ AI giải thích';
      toast.error(errorMsg);
      setDrawerContent(errorMsg);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSummarizeAction = async () => {
    if (!chapter) return;
    setDrawerTitle('Tóm tắt chương');
    setDrawerContent('');
    setDrawerLoading(true);
    setDrawerOpen(true);

    try {
      const { data } = await aiAPI.summarize(chapter.id);
      setDrawerContent(data.summary);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Không thể tạo bản tóm tắt chương';
      toast.error(errorMsg);
      setDrawerContent(errorMsg);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!chapter) return;
    setShowQuizModal(true);
    setQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setHasSubmittedAnswer(false);
    setQuizScore(0);

    try {
      const { data } = await aiAPI.quiz(chapter.id);
      setQuizQuestions(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Không thể tạo câu hỏi trắc nghiệm';
      toast.error(errorMsg);
      setShowQuizModal(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectOption = (index: number) => {
    if (hasSubmittedAnswer) return;
    setSelectedOptionIndex(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionIndex === null || hasSubmittedAnswer) return;
    setHasSubmittedAnswer(true);
    const question = quizQuestions[currentQuestionIndex];
    if (selectedOptionIndex === question.correct_index) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionIndex(null);
    setHasSubmittedAnswer(false);
    setCurrentQuestionIndex((prev) => prev + 1);
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

  const parseMarkdown = (text: string) => {
    if (!text) return null;

    const parseBold = (rawLine: string) => {
      const parts = rawLine.split(/(\*\*.*?\*\*)/);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="markdown-h3">{parseBold(line.slice(4))}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="markdown-h2">{parseBold(line.slice(3))}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={i} className="markdown-h1">{parseBold(line.slice(2))}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="markdown-li">{parseBold(line.slice(2))}</li>;
      }
      if (line.trim() === '') {
        return <div key={i} className="markdown-spacer" />;
      }
      return <p key={i} className="markdown-p">{parseBold(line)}</p>;
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

          {user && (
            <div className="reader-ai-actions animate-fade-in">
              <button className="reader-ai-btn" onClick={handleSummarizeAction}>
                <Sparkles size={14} />
                <span>Tóm tắt chương</span>
              </button>
              <button className="reader-ai-btn" onClick={handleStartQuiz}>
                <Sparkles size={14} />
                <span>Làm Quiz ôn tập</span>
              </button>
            </div>
          )}
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
          className="translate-tooltip-container"
          style={{
            left: `${selectionCoords.x}px`,
            top: `${selectionCoords.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {selectedText.length > maxCharsLimit ? (
            <div className="tooltip-warn-msg">
              Vượt giới hạn {selectedText.length}/{maxCharsLimit} ký tự
            </div>
          ) : (
            <>
              <button
                className="tooltip-btn"
                onClick={() => {
                  if (!user) {
                    toast.error('Vui lòng đăng nhập để sử dụng tính năng dịch!');
                    return;
                  }
                  handleTranslateAction();
                }}
              >
                <Languages size={13} />
                <span>Dịch nghĩa</span>
              </button>
              <div className="tooltip-divider" />
              <button
                className="tooltip-btn"
                onClick={() => {
                  if (!user) {
                    toast.error('Vui lòng đăng nhập để sử dụng tính năng giải thích!');
                    return;
                  }
                  handleExplainAction();
                }}
              >
                <Sparkles size={13} />
                <span>Giải thích</span>
              </button>
            </>
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

      {/* Sliding AI Assistant Drawer */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="drawer-content animate-slide-left" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>{drawerTitle}</h3>
              <button className="drawer-close-btn" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              {drawerLoading ? (
                <div className="drawer-loading">
                  <div className="translate-spinner"></div>
                  <span>AI đang phân tích và chuẩn bị phản hồi...</span>
                </div>
              ) : (
                <div className="drawer-text-content">
                  {parseMarkdown(drawerContent)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Quiz Modal */}
      {showQuizModal && (
        <div className="quiz-modal-backdrop" onClick={() => setShowQuizModal(false)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quiz-modal-header">
              <h3>💡 Luyện tập ôn tập chương</h3>
              <button className="quiz-modal-close" onClick={() => setShowQuizModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="quiz-modal-body">
              {quizLoading ? (
                <div className="quiz-loading-box">
                  <div className="translate-spinner"></div>
                  <span>Gemini đang soạn câu hỏi trắc nghiệm dựa trên nội dung chương...</span>
                </div>
              ) : quizQuestions.length === 0 ? (
                <p className="quiz-empty-message">Không có câu hỏi nào được tạo ra cho chương này.</p>
              ) : currentQuestionIndex < quizQuestions.length ? (
                <div className="quiz-question-container">
                  <div className="quiz-progress-bar-wrapper">
                    <div 
                      className="quiz-progress-bar" 
                      style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>
                  <div className="quiz-question-header">
                    <span>Câu hỏi {currentQuestionIndex + 1} / {quizQuestions.length}</span>
                  </div>
                  <h4 className="quiz-question-text">
                    {quizQuestions[currentQuestionIndex].question}
                  </h4>
                  <div className="quiz-options-list">
                    {quizQuestions[currentQuestionIndex].options.map((option, index) => {
                      let optionClass = 'quiz-option';
                      if (selectedOptionIndex === index) {
                        optionClass += ' selected';
                      }
                      if (hasSubmittedAnswer) {
                        if (index === quizQuestions[currentQuestionIndex].correct_index) {
                          optionClass += ' correct';
                        } else if (selectedOptionIndex === index) {
                          optionClass += ' incorrect';
                        }
                      }
                      return (
                        <button
                          key={index}
                          className={optionClass}
                          onClick={() => handleSelectOption(index)}
                          disabled={hasSubmittedAnswer}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
                          <span className="option-text">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {hasSubmittedAnswer && (
                    <div className="quiz-explanation-box">
                      <span className="explanation-title">Giải thích từ Gemini:</span>
                      <p>{quizQuestions[currentQuestionIndex].explanation}</p>
                    </div>
                  )}
                  
                  <div className="quiz-footer-actions">
                    {!hasSubmittedAnswer ? (
                      <button
                        className="btn btn-primary"
                        disabled={selectedOptionIndex === null}
                        onClick={handleSubmitAnswer}
                      >
                        Trả lời
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={handleNextQuestion}>
                        {currentQuestionIndex === quizQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="quiz-results-container">
                  <div className="quiz-result-score-circle">
                    <span className="score-num">{quizScore}</span>
                    <span className="score-total">/ {quizQuestions.length}</span>
                  </div>
                  <h4 className="quiz-result-title">Hoàn thành bài luyện tập!</h4>
                  <p className="quiz-result-desc">
                    {quizScore === quizQuestions.length 
                      ? 'Tuyệt vời! Bạn đã trả lời đúng tất cả câu hỏi.'
                      : 'Hãy luyện tập thêm để ghi nhớ từ vựng và cấu trúc tốt hơn.'}
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowQuizModal(false)}>
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
