import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { Category } from '../../../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
  Search,
  ExternalLink,
  Car,
  Smartphone,
  Building2,
  Bike,
  Tv,
  Armchair,
  Briefcase,
  Shirt,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FolderTree,
  CornerDownRight,
  Tag,
  Package,
  Folder,
  Wrench,
  Users,
  Heart,
  PawPrint,
  Sparkles,
  BookOpen,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpRight,
  IndianRupee,
} from 'lucide-react';
import { Badge } from '../../common/Badge';
import { useRouter, navigateTo } from '../../../router/useRouter';

const AVAILABLE_ICONS: { name: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { name: 'Wrench', label: 'Services', icon: Wrench },
  { name: 'Car', label: 'Vehicles', icon: Car },
  { name: 'Briefcase', label: 'Jobs', icon: Briefcase },
  { name: 'Building2', label: 'Housing & Real Estate', icon: Building2 },
  { name: 'Package', label: 'Buy and Sell', icon: Package },
  { name: 'Users', label: 'Community', icon: Users },
  { name: 'Heart', label: 'Matrimonial', icon: Heart },
  { name: 'PawPrint', label: 'Pets & Animals', icon: PawPrint },
  { name: 'Smartphone', label: 'Mobiles & Tech', icon: Smartphone },
  { name: 'Tv', label: 'Electronics', icon: Tv },
  { name: 'Armchair', label: 'Furniture & Decor', icon: Armchair },
  { name: 'Bike', label: 'Bikes & Two Wheelers', icon: Bike },
  { name: 'Shirt', label: 'Fashion & Apparel', icon: Shirt },
  { name: 'BookOpen', label: 'Books & Education', icon: BookOpen },
  { name: 'Layers', label: 'General / Category', icon: Layers },
  { name: 'Tag', label: 'Tag', icon: Tag },
];

export const CategoriesModule: React.FC = () => {
  const { listings, categories, addCategory, updateCategory, deleteCategory, toggleCategoryStatus, setActiveSidebarTab, addToast } = useApp();
  const { path, query } = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'directory' | 'table'>('directory');

  // Check URL query params for ?parentId= reactively
  const parentParam = query.parentId || new URLSearchParams(window.location.search).get('parentId');

  // Determine if we are on the /new or /edit/:id route
  const normalizedPath = path.replace(/\/$/, '');
  const isAddRoute = normalizedPath === '/admin/marketplace/categories/new';
  const editMatch = normalizedPath.match(/^\/admin\/marketplace\/categories\/edit\/([^/]+)$/);
  const editId = editMatch ? editMatch[1] : null;
  const editingCategory = editId ? categories.find((c) => c.id === editId) || null : null;

  // Root categories
  const rootCategories = categories.filter((c) => !c.parentId);

  // Selected parent category object if drilled down
  const currentParentCategory = selectedParentId ? categories.find((c) => c.id === selectedParentId) || null : null;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: 'Layers',
    parentId: null as string | null,
    order: 1,
    seoTitle: '',
    seoDescription: '',
    isActive: true,
    isPaid: false,
    postingFee: 199,
    freeListingsQuota: 0,
  });

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        slug: editingCategory.slug,
        icon: editingCategory.icon,
        parentId: editingCategory.parentId,
        order: editingCategory.order,
        seoTitle: editingCategory.seoTitle || '',
        seoDescription: editingCategory.seoDescription || '',
        isActive: editingCategory.isActive,
        isPaid: !!editingCategory.isPaid,
        postingFee: editingCategory.postingFee ?? 199,
        freeListingsQuota: editingCategory.freeListingsQuota ?? 0,
      });
    } else if (isAddRoute) {
      const activeParent = parentParam || selectedParentId || null;
      setFormData({
        name: '',
        slug: '',
        icon: 'Layers',
        parentId: activeParent,
        order: categories.length + 1,
        seoTitle: '',
        seoDescription: '',
        isActive: true,
        isPaid: false,
        postingFee: 199,
        freeListingsQuota: 0,
      });
    }
  }, [editingCategory, isAddRoute, categories.length, parentParam, selectedParentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) return;

    if (editingCategory) {
      updateCategory({
        ...editingCategory,
        ...formData,
      });
    } else {
      addCategory({
        ...formData,
      });
    }
    if (formData.parentId) {
      setSelectedParentId(formData.parentId);
    }
    navigateTo('/admin/marketplace/categories');
  };

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    const iconObj = AVAILABLE_ICONS.find((i) => i.name === iconName);
    const IconComp = iconObj ? iconObj.icon : Layers;
    return <IconComp className={className} />;
  };

  // If on /new or /edit/:id, render dedicated form webpage
  if (isAddRoute || editId) {
    const parentCategory = formData.parentId
      ? categories.find((c) => c.id === formData.parentId)
      : null;

    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto text-slate-900 dark:text-white animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => navigateTo('/admin/marketplace/categories')}
                className="hover:text-blue-600 flex items-center gap-1 font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Categories
              </button>
              <span>/</span>
              <span>{editingCategory ? 'Edit Category' : 'New Category / Subcategory'}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {editingCategory
                ? `Edit: ${editingCategory.name}`
                : formData.parentId
                ? `Add Subcategory to "${parentCategory?.name || 'Parent'}"`
                : 'Create New Marketplace Category'}
            </h1>
          </div>
          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg">
            URL: {path}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Hierarchy Level Selection */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                Taxonomy Hierarchy (Parent Category)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, parentId: val === '' ? null : val });
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">None (Top-Level Main Department)</option>
                    {rootCategories
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((root) => (
                        <option key={root.id} value={root.id}>
                          📁 Subcategory under: {root.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center">
                  {formData.parentId ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ This will be created as a <strong>Subcategory</strong> under{' '}
                      <strong>{parentCategory?.name}</strong>.
                    </span>
                  ) : (
                    <span>
                      ★ This will be a <strong>Top-Level Department</strong> visible in the main navigation bar.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Category / Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name: val,
                      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    }));
                  }}
                  placeholder={formData.parentId ? 'e.g. Sedans, SUVs, Android Phones' : 'e.g. Electric Scooters & Bikes'}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. electric-bikes"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Icon Picker & Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                  Category Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map((ic) => {
                    const isSelected = formData.icon === ic.name;
                    const IconComp = ic.icon;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: ic.name })}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Display Sort Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Determines position relative to sibling items (1 = first).
                </span>
              </div>
            </div>

            {/* SEO Metadata */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  SEO Title Tag
                </label>
                <input
                  type="text"
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  placeholder="e.g. Buy Used Cars in India - Chillyads"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  value={formData.seoDescription}
                  onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                  placeholder="Find the best deals on verified classified listings with direct seller contact..."
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Paid Subcategory Settings */}
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Paid Subcategory Listing Fee</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Require sellers to pay a listing fee when posting classified ads in this {formData.parentId ? 'subcategory' : 'category'}.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {formData.isPaid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 animate-in fade-in duration-150">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Posting Fee Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formData.postingFee}
                        onChange={(e) => setFormData({ ...formData, postingFee: Number(e.target.value) })}
                        placeholder="e.g. 199, 499"
                        className="w-full text-xs font-bold pl-7 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Amount sellers pay per ad submission.
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Free Ad Quota
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.freeListingsQuota}
                      onChange={(e) => setFormData({ ...formData, freeListingsQuota: Number(e.target.value) })}
                      placeholder="0 = All postings paid"
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      0 means fee applies immediately.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="catActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="catActive" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Publish Category to Public Navigation & Search Filters
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigateTo('/admin/marketplace/categories')}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow cursor-pointer transition-colors"
              >
                {editingCategory ? 'Save Changes' : formData.parentId ? 'Create Subcategory' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Calculate counts
  const totalRootCount = rootCategories.length;
  const totalSubCount = categories.filter((c) => !!c.parentId).length;

  // -------------------------------------------------------------
  // VIEW 1: DRILLED DOWN VIEW OF A SPECIFIC CATEGORY'S SUBCATEGORIES
  // -------------------------------------------------------------
  if (currentParentCategory) {
    const directSubcategories = categories.filter((c) => c.parentId === currentParentCategory.id);
    const filteredSubs = directSubcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white animate-in fade-in duration-150">
        {/* Breadcrumbs & Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => setSelectedParentId(null)}
                className="hover:text-blue-600 flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> All Categories
              </button>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {currentParentCategory.name}
              </span>
              <span>/</span>
              <span className="text-slate-400">Subcategories</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold shadow-xs">
                {renderIcon(currentParentCategory.icon, 'w-6 h-6')}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <span>{currentParentCategory.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                    {directSubcategories.length} Subcategories
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  Slug: /{currentParentCategory.slug} • {listings.filter(l => l.categoryId === currentParentCategory.id).length} live classified ads
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedParentId(null)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to All Categories
            </button>
            <button
              onClick={() => {
                navigateTo(`/admin/marketplace/categories/new?parentId=${currentParentCategory.id}`);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Subcategory
            </button>
          </div>
        </div>

        {/* Quick Parent Switcher Bar & Search */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${currentParentCategory.name} subcategories...`}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSidebarTab('marketplace/attributes')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" /> Dynamic Attributes
            </button>
            <button
              onClick={() => navigateTo(`/admin/marketplace/categories/edit/${currentParentCategory.id}`)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Parent Department
            </button>
          </div>
        </div>

        {/* Subcategories Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {filteredSubs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Folder className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {searchTerm ? 'No Matching Subcategories' : `No Subcategories Yet in ${currentParentCategory.name}`}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'Try a different search query or clear the filter.'
                  : 'Add nested subcategories (e.g. Sedans, SUVs, Hatchbacks) to organize listings under this category.'}
              </p>
              <button
                onClick={() => {
                  navigateTo(`/admin/marketplace/categories/new?parentId=${currentParentCategory.id}`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add First Subcategory
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">Order</th>
                    <th className="p-3">Subcategory Name</th>
                    <th className="p-3">URL Slug</th>
                    <th className="p-3">Parent Department</th>
                    <th className="p-3">Active Ads</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSubs.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-mono text-slate-400 font-bold text-center">{sub.order}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {renderIcon(sub.icon, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                              <span>{sub.name}</span>
                              {sub.isPaid ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
                                  <IndianRupee className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span>Paid Fee: ₹{sub.postingFee || 199}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium text-[10px]">
                                  Free
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {sub.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-500">/{sub.slug}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-[10px] font-semibold">
                          {currentParentCategory.name}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {listings.filter(l => l.subcategoryId === sub.id).length} ads
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleCategoryStatus(sub.id)}
                          className="cursor-pointer"
                        >
                          {sub.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="neutral">Inactive</Badge>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigateTo(`/admin/marketplace/categories/edit/${sub.id}`)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            title="Edit Subcategory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirmId === sub.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded border border-rose-200 dark:border-rose-800">
                              <button
                                onClick={() => {
                                  deleteCategory(sub.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(sub.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: TOP-LEVEL MAIN CATEGORIES VIEW (CLICKING A CATEGORY DRILLS DOWN)
  // -------------------------------------------------------------
  const filteredRootCategories = rootCategories.filter(
    (root) =>
      root.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      root.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => {
              setActiveSidebarTab('dashboard');
              navigateTo('/admin/dashboard');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-600" />
            Category & Subcategory Hierarchy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on any category name to view and manage its nested subcategories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSidebarTab('marketplace/attributes')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            Manage Attributes
          </button>
          <button
            onClick={() => navigateTo('/admin/marketplace/categories/new')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Main Categories</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalRootCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Click any category below to view its subcategories</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Subcategories</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalSubCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Organized under main departments</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Classified Taxonomy</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{categories.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active classified navigation items</div>
        </div>
      </div>

      {/* Filter, Search and View Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter categories and subcategories..."
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Showing <strong>{filteredRootCategories.length}</strong> main categories
          </div>

          {/* Directory Grid vs Table Hierarchy Switcher */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={() => setAdminViewMode('directory')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                adminViewMode === 'directory'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Directory Grid</span>
            </button>
            <button
              onClick={() => setAdminViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                adminViewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid Mode */}
      {adminViewMode === 'directory' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4.5 animate-in fade-in duration-200">
          {filteredRootCategories.map((rootCat) => {
            const subcategories = categories
              .filter((c) => c.parentId === rootCat.id)
              .sort((a, b) => a.order - b.order);

            const filteredSubsInCard = searchTerm
              ? subcategories.filter(
                  (s) =>
                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    rootCat.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : subcategories;

            return (
              <div
                key={rootCat.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Category Card Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-900 shrink-0">
                        {renderIcon(rootCat.icon, 'w-5 h-5')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {rootCat.name}
                          </h3>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          /{rootCat.slug} • {subcategories.length} subcategories
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigateTo(`/admin/marketplace/categories/edit/${rootCat.id}`)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleCategoryStatus(rootCat.id)}
                        className="cursor-pointer p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        title="Toggle Active Status"
                      >
                        {rootCat.isActive ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                        )}
                      </button>
                      {deleteConfirmId === rootCat.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded border border-rose-200 dark:border-rose-800 max-w-[150px] animate-in fade-in duration-100">
                          <button
                            onClick={() => {
                              deleteCategory(rootCat.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black cursor-pointer transition-colors"
                            title="Deletes category and all nested subcategories too!"
                          >
                            Delete All
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(rootCat.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Category (will also delete entire subcategories!)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories List in Directory Card */}
                  <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                    {filteredSubsInCard.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        {searchTerm ? 'No matching subcategories' : 'No subcategories yet'}
                      </div>
                    ) : (
                      filteredSubsInCard.map((sub) => (
                        <div
                          key={sub.id}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 text-xs flex items-center justify-between gap-2 group/sub transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {sub.name}
                            </span>
                            {sub.isPaid && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[9px] border border-amber-300 dark:border-amber-700 shrink-0 flex items-center gap-0.5" title={`Paid Subcategory: ₹${sub.postingFee || 199}`}>
                                <span>₹{sub.postingFee || 199}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono hidden group-hover/sub:inline">
                              #{sub.order}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleCategoryStatus(sub.id)}
                              className="text-[10px] cursor-pointer"
                              title={sub.isActive ? 'Active (Click to disable)' : 'Inactive'}
                            >
                              {sub.isActive ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">●</span>
                              ) : (
                                <span className="text-slate-400 font-bold">○</span>
                              )}
                            </button>
                            <button
                              onClick={() => navigateTo(`/admin/marketplace/categories/edit/${sub.id}`)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit Subcategory"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {deleteConfirmId === sub.id ? (
                              <button
                                onClick={() => {
                                  deleteCategory(sub.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-1 py-0.2 bg-rose-600 text-white rounded text-[9px] font-bold cursor-pointer"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(sub.id)}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Subcategory"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      navigateTo(`/admin/marketplace/categories/new?parentId=${rootCat.id}`);
                    }}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subcategory
                  </button>

                  <button
                    onClick={() => setSelectedParentId(rootCat.id)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage List</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Main Categories Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-3 w-12 text-center">Order</th>
                <th className="p-3">Category Name (Click to view Subcategories)</th>
                <th className="p-3">Subcategories</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Total Ads</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRootCategories.map((rootCat) => {
                const subcategories = categories.filter((c) => c.parentId === rootCat.id);

                return (
                  <tr
                    key={rootCat.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <td className="p-3 font-mono text-slate-400 font-bold text-center">{rootCat.order}</td>
                    <td className="p-3">
                      {/* Clicking on the Category name navigates directly into its subcategories */}
                      <button
                        onClick={() => setSelectedParentId(rootCat.id)}
                        className="flex items-center gap-2.5 text-left group-hover:text-blue-600 transition-colors cursor-pointer w-full"
                        title={`Click to open subcategories of ${rootCat.name}`}
                      >
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold group-hover:scale-105 transition-transform">
                          {renderIcon(rootCat.icon, 'w-4 h-4')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            <span>{rootCat.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: {rootCat.id}</div>
                        </div>
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedParentId(rootCat.id)}
                        className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title={`View ${subcategories.length} subcategories`}
                      >
                        <Folder className="w-3 h-3" />
                        <span>{subcategories.length} subcategories ›</span>
                      </button>
                    </td>
                    <td className="p-3 font-mono text-slate-500">/{rootCat.slug}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {listings.filter(l => l.categoryId === rootCat.id).length} ads
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleCategoryStatus(rootCat.id)}
                        className="cursor-pointer"
                      >
                        {rootCat.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Inactive</Badge>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedParentId(rootCat.id)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          title="View and manage subcategories"
                        >
                          View Subcategories <ChevronRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            navigateTo(`/admin/marketplace/categories/new?parentId=${rootCat.id}`);
                          }}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Add subcategory directly under this category"
                        >
                          <Plus className="w-3 h-3" /> + Sub
                        </button>
                        <button
                          onClick={() => navigateTo(`/admin/marketplace/categories/edit/${rootCat.id}`)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {deleteConfirmId === rootCat.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded border border-rose-200 dark:border-rose-800 max-w-[150px] animate-in fade-in duration-100">
                            <button
                              onClick={() => {
                                deleteCategory(rootCat.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black cursor-pointer transition-colors"
                              title="Warning: deletes category AND all subcategories!"
                            >
                              Delete All
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(rootCat.id)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Category (will also delete entire subcategories!)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
