/**
 * @file PortalBrandingPage.tsx
 * @description Dedicated Full Page for Business Unit Branding & Theme Customization.
 * Allows Global Administrators to customize logos, colors, banner announcements, and hotlines
 * with a real-time side-by-side interactive preview.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Palette,
  Building2,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Megaphone,
  Upload,
  Link,
  Trash2,
  AlertCircle,
  RefreshCw,
  Save,
  Sliders,
  Search,
  ArrowRightLeft,
  Wand2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { BusinessUnit, BusinessUnitBranding, User } from '../../types';
import {
  BU_COLOR_PALETTES,
  BU_DEFAULT_THEMES,
  ThemePreset,
  generateHarmoniousAccent,
  getContrastTextColor,
  isValidHex,
  hexToRgba,
} from '../../utils/themeUtils';
import { BUBadge } from '../BUBadge';

interface PortalBrandingPageProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  activeBU: BusinessUnit;
  onSaveBranding: (buId: string, branding: BusinessUnitBranding) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PortalBrandingPage: React.FC<PortalBrandingPageProps> = ({
  currentUser,
  businessUnits,
  activeBU,
  onSaveBranding,
  onShowToast,
}) => {
  const [selectedBUId, setSelectedBUId] = useState<string>(activeBU.id);
  const targetBU = businessUnits.find((b) => b.id === selectedBUId) || activeBU;

  // Form Fields
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [logoUrl, setLogoUrl] = useState<string>(targetBU.branding?.logoUrl || '');
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [portalTitle, setPortalTitle] = useState<string>(
    targetBU.branding?.portalTitle || `${targetBU.name} Service Portal`
  );
  const [welcomeBannerTitle, setWelcomeBannerTitle] = useState<string>(
    targetBU.branding?.welcomeBannerTitle || `${targetBU.name} Technical Operations`
  );
  const [welcomeBannerSubtitle, setWelcomeBannerSubtitle] = useState<string>(
    targetBU.branding?.welcomeBannerSubtitle || `Rapid technical support & IT incident desk for ${targetBU.name}`
  );
  const [bannerAnnouncement, setBannerAnnouncement] = useState<string>(
    targetBU.branding?.bannerAnnouncement || ''
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    targetBU.branding?.primaryColor || '#1e3a8a'
  );
  const [accentColor, setAccentColor] = useState<string>(
    targetBU.branding?.accentColor || '#3b82f6'
  );
  const [supportHotline, setSupportHotline] = useState<string>(
    targetBU.branding?.supportHotline || 'Internal Ext. 1800'
  );
  const [supportEmail, setSupportEmail] = useState<string>(
    targetBU.branding?.supportEmail || `it-support@${targetBU.code.toLowerCase()}.uoa.my`
  );
  const [deskLocation, setDeskLocation] = useState<string>(
    targetBU.branding?.deskLocation || 'Level 3 IT Support Center'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever the selected BU changes
  useEffect(() => {
    const current = businessUnits.find((b) => b.id === selectedBUId) || activeBU;
    setLogoUrl(current.branding?.logoUrl || '');
    setPortalTitle(current.branding?.portalTitle || `${current.name} Service Portal`);
    setWelcomeBannerTitle(
      current.branding?.welcomeBannerTitle || `${current.name} Technical Operations`
    );
    setWelcomeBannerSubtitle(
      current.branding?.welcomeBannerSubtitle || `Rapid technical support & IT incident desk for ${current.name}`
    );
    setBannerAnnouncement(current.branding?.bannerAnnouncement || '');
    setPrimaryColor(current.branding?.primaryColor || '#1e3a8a');
    setAccentColor(current.branding?.accentColor || '#3b82f6');
    setSupportHotline(current.branding?.supportHotline || 'Internal Ext. 1800');
    setSupportEmail(current.branding?.supportEmail || `it-support@${current.code.toLowerCase()}.uoa.my`);
    setDeskLocation(current.branding?.deskLocation || 'Level 3 IT Support Center');
    setLogoFileName('');
    setUploadError(null);
  }, [selectedBUId, businessUnits, activeBU]);

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setUploadError('Logo exceeds 2.5MB limit. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
      setLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updatedBranding: BusinessUnitBranding = {
      logoUrl: logoUrl.trim() || undefined,
      portalTitle: portalTitle.trim() || `${targetBU.name} Service Portal`,
      welcomeBannerTitle: welcomeBannerTitle.trim() || `${targetBU.name} Technical Operations`,
      welcomeBannerSubtitle: welcomeBannerSubtitle.trim() || `IT Incident Portal for ${targetBU.name}`,
      bannerAnnouncement: bannerAnnouncement.trim() || undefined,
      primaryColor: primaryColor || '#1e3a8a',
      accentColor: accentColor || '#3b82f6',
      accentGradient: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
      bannerTheme: targetBU.branding?.bannerTheme || 'blue',
      supportHotline: supportHotline.trim() || 'Internal Ext. 1800',
      supportEmail: supportEmail.trim() || `it-support@${targetBU.code.toLowerCase()}.uoa.my`,
      deskLocation: deskLocation.trim() || 'Level 3 IT Center',
    };

    onSaveBranding(targetBU.id, updatedBranding);
    onShowToast(`Branding configuration for ${targetBU.name} saved!`, 'success');
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Preset categories
  const categories = ['All', 'Corporate', 'Tech & Cyber', 'Hospitality & Dining', 'Healthcare & Nature', 'Luxury & Premium', 'Modern Slate'];

  const filteredPresets = useMemo(() => {
    return BU_COLOR_PALETTES.filter((preset) => {
      const matchesCat = selectedCategory === 'All' || preset.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.category.toLowerCase().includes(q) ||
        (preset.recommendedFor && preset.recommendedFor.toLowerCase().includes(q)) ||
        preset.primary.toLowerCase().includes(q) ||
        preset.accent.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleApplyPreset = (preset: ThemePreset) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    onShowToast(`Applied "${preset.name}" preset!`, 'info');
  };

  const handleHarmonizeAccent = () => {
    const harmonized = generateHarmoniousAccent(primaryColor);
    setAccentColor(harmonized);
    onShowToast('Harmonized accent color generated!', 'info');
  };

  const handleSwapColors = () => {
    const temp = primaryColor;
    setPrimaryColor(accentColor);
    setAccentColor(temp);
    onShowToast('Swapped Primary and Accent colors', 'info');
  };

  const handleResetToBUDefault = () => {
    const defaultTheme = BU_DEFAULT_THEMES[targetBU.code.toUpperCase()] || BU_DEFAULT_THEMES['CCEC'];
    setPrimaryColor(defaultTheme.primary);
    setAccentColor(defaultTheme.accent);
    onShowToast(`Reset to default palette for ${targetBU.code}`, 'info');
  };

  return (
    <div id="page-portal-branding" className="space-y-4 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs shrink-0">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Business Unit Theme & Branding
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                Admin Studio
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize portal themes, brand logos, banners, and contacts for each Business Unit.
            </p>
          </div>
        </div>

        {/* Save Action */}
        <button
          id="btn-save-branding-page"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes ({targetBU.code})</span>
        </button>
      </div>

      {/* Business Unit Selector Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        {businessUnits.map((bu) => {
          const isSelected = bu.id === selectedBUId;
          const brand = bu.branding?.primaryColor || '#2563eb';
          return (
            <button
              key={bu.id}
              onClick={() => setSelectedBUId(bu.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shadow-2xs"
                style={{ backgroundColor: brand }}
              />
              <span>{bu.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {bu.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Content Grid: Form (Left) & Real-time Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Logo & Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Portal Logo & Symbol</span>
              </h2>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    logoMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    logoMode === 'url' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                  }`}
                >
                  Direct URL
                </button>
              </div>
            </div>

            {logoMode === 'upload' ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Click to upload or drag and drop logo image
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PNG, JPG, SVG or WebP (max 2.5MB)
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
            )}

            {logoUrl && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-16 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center">
                    <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">Current Logo Active</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                >
                  Remove Logo
                </button>
              </div>
            )}
          </div>

          {/* Color Scheme & Palette Studio Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Theme Color Palette & Preset Studio
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Select a curated corporate preset or craft custom branding colors
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleHarmonizeAccent}
                  title="Automatically calculate an aesthetically harmonized accent color based on primary color"
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 transition flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Harmonize Accent</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwapColors}
                  title="Swap primary and accent colors"
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60 transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Swap</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToBUDefault}
                  title={`Reset to default factory theme for ${targetBU.code}`}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            {/* Custom Color Controls (Pickers & Direct Hex Entry) */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Custom Color Adjuster</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
                    Gradient: {primaryColor} → {accentColor}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Primary Brand Color (Sidebar, Header, Buttons)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer shadow-2xs"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#2563eb"
                      maxLength={7}
                      className="flex-1 text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Accent Color (Gradients, Hovers, Highlights)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 p-0.5 cursor-pointer shadow-2xs"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="#4f46e5"
                      maxLength={7}
                      className="flex-1 text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Presets Gallery Section */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900">
                    Curated Presets Gallery ({BU_COLOR_PALETTES.length} Styles)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Click any preset card to instantly apply to {targetBU.name}
                  </p>
                </div>

                {/* Preset Search Filter */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search presets..."
                    className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Presets Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredPresets.map((preset) => {
                  const isActive =
                    primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                    accentColor.toLowerCase() === preset.accent.toLowerCase();

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
                        isActive
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      {/* Top Gradient Stripe */}
                      <div
                        className="h-1.5 w-full rounded-t-lg -mx-3 -mt-3 mb-2.5"
                        style={{ background: preset.gradient }}
                      />

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* Color Swatches */}
                          <div className="flex -space-x-1.5 shrink-0">
                            <div
                              className="w-6 h-6 rounded-full border-2 border-white shadow-xs"
                              style={{ backgroundColor: preset.primary }}
                              title={`Primary: ${preset.primary}`}
                            />
                            <div
                              className="w-6 h-6 rounded-full border-2 border-white shadow-xs"
                              style={{ backgroundColor: preset.accent }}
                              title={`Accent: ${preset.accent}`}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                                {preset.name}
                              </h4>
                              {isActive && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-600 text-white">
                                  <Check className="w-2.5 h-2.5" />
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {preset.category}
                            </span>
                          </div>
                        </div>

                        {/* Hex Pills */}
                        <div className="text-right font-mono text-[9px] text-slate-400 hidden sm:block">
                          <div>{preset.primary}</div>
                          <div>{preset.accent}</div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>

                      {preset.recommendedFor && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 truncate">
                            🎯 {preset.recommendedFor}
                          </span>
                          <span className="font-bold text-blue-600 shrink-0 group-hover:underline">
                            {isActive ? 'Applied' : 'Apply'} →
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredPresets.length === 0 && (
                  <div className="col-span-2 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Palette className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-600">No preset matches "{searchQuery}"</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline mt-1 cursor-pointer"
                    >
                      Clear search & filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Banner Copy & Headlines Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-purple-600" />
              <span>Portal Banner Headlines & Announcements</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Welcome Banner Headline
                </label>
                <input
                  type="text"
                  value={welcomeBannerTitle}
                  onChange={(e) => setWelcomeBannerTitle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Subtitle / Slogan
                </label>
                <input
                  type="text"
                  value={welcomeBannerSubtitle}
                  onChange={(e) => setWelcomeBannerSubtitle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Broadcast Announcement Pill (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Network Maintenance this Saturday 11PM"
                  value={bannerAnnouncement}
                  onChange={(e) => setBannerAnnouncement(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Support Contacts Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Support Desk Contacts & Location</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotline Ext.</label>
                <input
                  type="text"
                  value={supportHotline}
                  onChange={(e) => setSupportHotline(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Desk Location</label>
                <input
                  type="text"
                  value={deskLocation}
                  onChange={(e) => setDeskLocation(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Real-Time Live Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Live Real-Time Portal Preview
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Sync
                </span>
              </div>

              {/* Simulated Welcome Banner */}
              <div
                className="rounded-2xl p-5 text-white shadow-md relative overflow-hidden transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
                }}
              >
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center space-x-3">
                    {logoUrl ? (
                      <div className="h-12 w-16 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-xs border border-white/40 shrink-0">
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-black text-sm text-white shrink-0">
                        {targetBU.code}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                          {targetBU.code} PORTAL
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1 leading-tight">
                        {welcomeBannerTitle || `${targetBU.name} Technical Services`}
                      </h4>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/90 leading-snug">
                    {welcomeBannerSubtitle || `Rapid technical support & IT incident desk for ${targetBU.name}`}
                  </p>

                  {bannerAnnouncement && (
                    <div className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-1 rounded-lg border border-white/30 text-white font-medium">
                      📢 {bannerAnnouncement}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/20 flex flex-wrap items-center gap-2 text-[10px] text-white/80">
                    <span>📞 {supportHotline}</span>
                    <span>•</span>
                    <span>✉️ {supportEmail}</span>
                  </div>
                </div>
              </div>

              {/* Live UI Elements Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Live UI Components Appearance:
                </span>

                {/* Badges preview */}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    style={{
                      backgroundColor: hexToRgba(primaryColor, 0.1),
                      color: primaryColor,
                      borderColor: hexToRgba(primaryColor, 0.3),
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{targetBU.name} ({targetBU.code})</span>
                  </div>

                  <div
                    style={{
                      backgroundColor: hexToRgba(primaryColor, 0.15),
                      color: primaryColor,
                    }}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                  >
                    <span>Pill Badge</span>
                  </div>
                </div>

                {/* Sample Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    style={{ backgroundColor: primaryColor }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition hover:opacity-90 cursor-default"
                  >
                    + Create Ticket ({targetBU.code})
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Primary CTA Style
                  </span>
                </div>

                {/* Sample Ticket Card with Theme Left Border */}
                <div
                  className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs relative overflow-hidden"
                  style={{ borderLeftWidth: '4px', borderLeftColor: primaryColor }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      Incident #1042: Network Gateway Check
                    </span>
                    <span
                      style={{ color: primaryColor }}
                      className="text-[10px] font-bold"
                    >
                      {targetBU.code}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Assigned IT Specialist • High Priority
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-blue-50/50 p-3 rounded-xl border border-blue-200/60">
                💡 <strong>Tip:</strong> Changes made here will immediately take effect for all users logging into or filtering tickets for <strong>{targetBU.name}</strong>.
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Theme Settings ({targetBU.code})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
