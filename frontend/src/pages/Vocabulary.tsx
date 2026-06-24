import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { vocabularyAPI, type VocabularyItem } from '../api/vocabulary';
import { storiesAPI, type Story } from '../api/stories';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Search, Trash2, Edit3, Check, X, Calendar, BookOpen } from 'lucide-react';
import './Vocabulary.css';

export default function Vocabulary() {
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  
  // Filters and pagination
  const [search, setSearch] = useState('');
  const [selectedStory, setSelectedStory] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTranslation, setEditTranslation] = useState('');
  const [editNote, setEditNote] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch stories for filter dropdown
  useEffect(() => {
    if (!isAuthenticated) return;
    storiesAPI.list()
      .then((res: any) => {
        setStories(res.data?.stories || []);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Fetch vocabulary items
  const fetchVocabulary = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    vocabularyAPI.list({
      search: search || undefined,
      story_id: selectedStory || undefined,
      page,
      page_size: pageSize,
    })
      .then(({ data }) => {
        setItems(data.vocabulary || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Lỗi khi tải sổ từ vựng');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, search, selectedStory, page]);

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  const handleDelete = (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa từ vựng này khỏi sổ tay?')) return;

    vocabularyAPI.delete(id)
      .then(() => {
        toast.success('Đã xóa từ vựng thành công!');
        fetchVocabulary();
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Lỗi khi xóa từ vựng');
      });
  };

  const startEditing = (item: VocabularyItem) => {
    setEditingId(item.id);
    setEditTranslation(item.translation || '');
    setEditNote(item.user_note || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTranslation('');
    setEditNote('');
  };

  const handleUpdate = (id: string) => {
    setUpdatingId(id);
    vocabularyAPI.update(id, {
      translation: editTranslation,
      user_note: editNote,
    })
      .then(() => {
        toast.success('Đã cập nhật từ vựng!');
        setEditingId(null);
        fetchVocabulary();
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Lỗi khi cập nhật từ vựng');
      })
      .finally(() => {
        setUpdatingId(null);
      });
  };

  if (!isAuthenticated) {
    return (
      <div className="vocab-page">
        <div className="vocab-empty-container glass">
          <BookOpen size={48} className="text-magenta" />
          <h2>Sổ Từ Vựng</h2>
          <p>Vui lòng đăng nhập để lưu trữ và quản lý từ vựng của bạn.</p>
          <Link to="/login" className="btn btn-primary">Đăng Nhập Ngay</Link>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="vocab-page animate-fade-in">
      <div className="vocab-container">
        
        {/* Page Header */}
        <div className="vocab-header-section">
          <div>
            <h1 className="vocab-title">Sổ Từ Vựng</h1>
            <p className="vocab-subtitle">Lưu trữ và quản lý các từ/câu bạn đã học từ truyện</p>
          </div>
          <div className="vocab-stats-badge glass">
            <span>Tổng cộng:</span>
            <strong className="text-cyan">{total} từ</strong>
          </div>
        </div>

        {/* Filters */}
        <div className="vocab-filters glass">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm từ vựng hoặc bản dịch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="filter-box">
            <select
              value={selectedStory}
              onChange={(e) => {
                setSelectedStory(e.target.value);
                setPage(1);
              }}
              className="vocab-select"
            >
              <option value="">Tất cả truyện</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vocabulary List */}
        {loading ? (
          <div className="vocab-loading">
            <div className="vocab-spinner"></div>
            <span>Đang tải danh sách từ vựng...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="vocab-empty-container glass">
            <BookOpen size={40} className="text-cyan" />
            <h3>Sổ từ vựng trống</h3>
            <p>
              {search || selectedStory
                ? 'Không tìm thấy từ vựng nào khớp với bộ lọc.'
                : 'Bạn chưa lưu từ vựng nào. Hãy khoanh vùng văn bản khi đọc truyện để dịch và lưu từ vựng!'}
            </p>
          </div>
        ) : (
          <div className="vocab-list">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const isUpdating = updatingId === item.id;

              return (
                <div key={item.id} className="vocab-card glass">
                  <div className="vocab-card-body">
                    
                    {/* Selected Text and Target Word */}
                    <div className="vocab-word-section">
                      <div className="vocab-word-header">
                        <h3 className="vocab-word-title">{item.word}</h3>
                        {item.entry?.phonetic && (
                          <span className="vocab-phonetic">/{item.entry.phonetic}/</span>
                        )}
                      </div>
                      <p className="vocab-selected-text">
                        “{item.selected_text}”
                      </p>
                      {item.context_sentence && item.context_sentence !== item.selected_text && (
                        <p className="vocab-context">
                          <strong className="text-secondary">Ngữ cảnh: </strong>
                          {item.context_sentence}
                        </p>
                      )}
                    </div>

                    {/* Translation and Notes Section */}
                    <div className="vocab-translation-section">
                      {isEditing ? (
                        <div className="vocab-edit-fields">
                          <div className="form-group">
                            <label className="form-label">Bản dịch</label>
                            <textarea
                              className="vocab-textarea"
                              value={editTranslation}
                              onChange={(e) => setEditTranslation(e.target.value)}
                              rows={2}
                              disabled={isUpdating}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <textarea
                              className="vocab-textarea"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              rows={2}
                              disabled={isUpdating}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="vocab-view-fields">
                          <div className="vocab-translation-box">
                            <span className="vocab-label">Bản dịch</span>
                            <p className="vocab-translation-text">{item.translation || <em>Chưa có bản dịch</em>}</p>
                          </div>
                          {item.user_note && (
                            <div className="vocab-note-box">
                              <span className="vocab-label">Ghi chú</span>
                              <p className="vocab-note-text">{item.user_note}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Metadata Section */}
                    <div className="vocab-meta-section">
                      <div className="vocab-meta-items">
                        <div className="vocab-meta-item">
                          <Calendar size={13} />
                          <span>Đã lưu: {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="vocab-meta-item">
                          <span>Ôn tập tiếp theo: {new Date(item.next_review_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="vocab-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="vocab-btn-action vocab-btn-save"
                              onClick={() => handleUpdate(item.id)}
                              disabled={isUpdating}
                              title="Lưu thay đổi"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="vocab-btn-action vocab-btn-cancel"
                              onClick={cancelEditing}
                              disabled={isUpdating}
                              title="Hủy"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="vocab-btn-action vocab-btn-edit"
                              onClick={() => startEditing(item)}
                              title="Chỉnh sửa bản dịch & ghi chú"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="vocab-btn-action vocab-btn-delete"
                              onClick={() => handleDelete(item.id)}
                              title="Xóa từ vựng"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="vocab-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="vocab-pagination-btn"
            >
              ← Trước
            </button>
            <span className="vocab-pagination-info">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="vocab-pagination-btn"
            >
              Sau →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
