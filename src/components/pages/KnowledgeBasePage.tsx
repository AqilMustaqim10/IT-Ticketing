/**
 * @file KnowledgeBasePage.tsx
 * @description Knowledge Base & Troubleshooting Guides Page.
 * Allows IT admins/support to publish and manage troubleshooting guides & FAQs,
 * and lets staff search and read common issue resolutions.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Eye,
  Calendar,
  User as UserIcon,
  Building2,
  Trash2,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { User, BusinessUnit, KnowledgeArticle } from '../../types';
import { getBUTheme } from '../../utils/themeUtils';
import { BUBadge } from '../BUBadge';

interface KnowledgeBasePageProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  articles: KnowledgeArticle[];
  onAddArticle: (payload: {
    title: string;
    category: string;
    businessUnitId: string;
    content: string;
  }) => { success: boolean; error?: string; article?: KnowledgeArticle };
  onUpdateArticle: (
    articleId: string,
    updates: {
      title?: string;
      category?: string;
      businessUnitId?: string;
      content?: string;
    }
  ) => { success: boolean; error?: string; article?: KnowledgeArticle };
  onDeleteArticle: (articleId: string) => { success: boolean; error?: string };
  onIncrementViews: (articleId: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({
  currentUser,
  businessUnits,
  articles,
  onAddArticle,
  onUpdateArticle,
  onDeleteArticle,
  onIncrementViews,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBUFilter, setSelectedBUFilter] = useState<string>('ALL');

  // Selected article for reading/viewing
  const [readingArticle, setReadingArticle] = useState<KnowledgeArticle | null>(null);

  // Modal states for creating / editing
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [articleToEdit, setArticleToEdit] = useState<KnowledgeArticle | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Network');
  const [formBUId, setFormBUId] = useState('ALL');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canManageArticles = currentUser.role === 'ADMIN' || currentUser.role === 'IT';

  // Categories list
  const categories = ['ALL', 'Network', 'Hardware', 'Software', 'Access', 'Security', 'General'];

  // Filter articles
  const filteredArticles = articles.filter((article) => {
    if (selectedCategory !== 'ALL' && article.category !== selectedCategory) {
      return false;
    }
    if (selectedBUFilter !== 'ALL' && article.businessUnitId !== 'ALL' && article.businessUnitId !== selectedBUFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(q) ||
        article.content.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormCategory('Network');
    setFormBUId(currentUser.role === 'ADMIN' ? 'ALL' : currentUser.businessUnitId);
    setFormContent('');
    setFormError(null);
    setArticleToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (article: KnowledgeArticle) => {
    setArticleToEdit(article);
    setFormTitle(article.title);
    setFormCategory(article.category);
    setFormBUId(article.businessUnitId);
    setFormContent(article.content);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim() || !formContent.trim()) {
      setFormError('Article title and content are required.');
      return;
    }

    if (articleToEdit) {
      const res = onUpdateArticle(articleToEdit.id, {
        title: formTitle,
        category: formCategory,
        businessUnitId: formBUId,
        content: formContent,
      });
      if (res.success) {
        onShowToast?.('Knowledge base article updated successfully.', 'success');
        setIsAddModalOpen(false);
      } else {
        setFormError(res.error || 'Failed to update article.');
      }
    } else {
      const res = onAddArticle({
        title: formTitle,
        category: formCategory,
        businessUnitId: formBUId,
        content: formContent,
      });
      if (res.success) {
        onShowToast?.('New knowledge article published successfully.', 'success');
        setIsAddModalOpen(false);
      } else {
        setFormError(res.error || 'Failed to publish article.');
      }
    }
  };

  const handleDelete = (articleId: string) => {
    if (window.confirm('Are you sure you want to delete this knowledge base article?')) {
      const res = onDeleteArticle(articleId);
      if (res.success) {
        onShowToast?.('Article deleted successfully.', 'info');
        if (readingArticle?.id === articleId) {
          setReadingArticle(null);
        }
      } else {
        onShowToast?.(res.error || 'Failed to delete article.', 'error');
      }
    }
  };

  const handleSelectArticle = (article: KnowledgeArticle) => {
    onIncrementViews(article.id);
    setReadingArticle({ ...article, views: (article.views || 0) + 1 });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Knowledge Base & Guides</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Troubleshooting guides, FAQs, and step-by-step resolution manuals for IT staff and end users.
              </p>
            </div>
          </div>
        </div>

        {canManageArticles && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Article</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search troubleshooting guides, keywords, or issue topics..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {currentUser.role === 'ADMIN' && (
            <select
              value={selectedBUFilter}
              onChange={(e) => setSelectedBUFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Business Units</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.code} — {bu.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid & Reader Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Article Cards List (Cols 1-2 or Full if no article selected) */}
        <div className={`${readingArticle ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-3`}>
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-8">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No knowledge articles found</h3>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${readingArticle ? '' : 'md:grid-cols-2'} gap-3.5`}>
              {filteredArticles.map((article) => {
                const isSelected = readingArticle?.id === article.id;
                const bu = businessUnits.find((b) => b.id === article.businessUnitId);

                return (
                  <div
                    key={article.id}
                    onClick={() => handleSelectArticle(article)}
                    className={`group relative bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'border-slate-200/70 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {article.category}
                        </span>
                        <div className="flex items-center gap-2">
                          {article.businessUnitId === 'ALL' ? (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              Global (All BUs)
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                              {bu?.code || article.businessUnitId}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                        {article.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3">
                        {article.content.replace(/[#*`]/g, '')}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px]">{article.authorName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {article.views || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Article Reader Panel (Col 2-3 when active) */}
        {readingArticle && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm flex flex-col sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200/70 dark:border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {readingArticle.category}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(readingArticle.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {readingArticle.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canManageArticles && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(readingArticle)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title="Edit Article"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(readingArticle.id)}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setReadingArticle(null)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                  title="Close Reader"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="py-5 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-normal">
              {readingArticle.content}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span>Author: <strong className="text-slate-700 dark:text-slate-300">{readingArticle.authorName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{readingArticle.views || 0} Total Views</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Article Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>{articleToEdit ? 'Edit Knowledge Article' : 'Publish New Knowledge Article'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. How to connect to Corporate VPN & MFA Setup"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {categories.filter((c) => c !== 'ALL').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Unit Scope *
                  </label>
                  <select
                    value={formBUId}
                    onChange={(e) => setFormBUId(e.target.value)}
                    disabled={currentUser.role === 'IT'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">Global (All Business Units)</option>
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.code} — {bu.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Article Content & Steps (Markdown supported) *
                </label>
                <textarea
                  required
                  rows={8}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Provide clear troubleshooting steps, bullet points, and resolution instructions..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/35 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  {articleToEdit ? 'Save Changes' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
