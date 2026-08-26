/**
 * @file BrandingModal.tsx
 * @description Modal allowing Global Admins exclusively to customize
 * business unit branding (Local image upload & URL, Primary & Accent color palette, Welcome Banner headline, and Tagline).
 */

import React, { useState, useRef } from 'react';
import {
  X,
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
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { BusinessUnit, BusinessUnitBranding, User } from '../types';

interface BrandingModalProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  activeBU: BusinessUnit;
  onClose: () => void;
  onSaveBranding: (buId: string, branding: BusinessUnitBranding) => void;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({
  currentUser,
  businessUnits,
  activeBU,
  onClose,
  onSaveBranding,
}) => {
  const [selectedBUId, setSelectedBUId] = useState<string>(activeBU.id);

  const targetBU = businessUnits.find((b) => b.id === selectedBUId) || activeBU;

  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [logoUrl, setLogoUrl] = useState<string>(
    targetBU.branding?.logoUrl || ''
  );
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [logoFileSize, setLogoFileSize] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [portalTitle, setPortalTitle] = useState<string>(
    targetBU.branding?.portalTitle || `${targetBU.name} Service Portal`
  );
  const [welcomeBannerTitle, setWelcomeBannerTitle] = useState<string>(
    targetBU.branding?.welcomeBannerTitle || `${targetBU.name} IT Helpdesk`
  );
  const [welcomeBannerSubtitle, setWelcomeBannerSubtitle] = useState<string>(
    targetBU.branding?.welcomeBannerSubtitle || `Technical Incident Desk & Rapid IT Support for ${targetBU.name}`
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
    targetBU.branding?.supportHotline || 'Ext. 4001'
  );
  const [supportEmail, setSupportEmail] = useState<string>(
    targetBU.branding?.supportEmail || `it-support@${targetBU.code.toLowerCase()}.myorg.com`
  );
  const [deskLocation, setDeskLocation] = useState<string>(
    targetBU.branding?.deskLocation || 'IT Support Hub'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when selected business unit changes
  const handleBUChange = (newBUId: string) => {
    setSelectedBUId(newBUId);
    const bu = businessUnits.find((b) => b.id === newBUId);
    if (bu?.branding) {
      setLogoUrl(bu.branding.logoUrl || '');
      setLogoFileName('');
      setLogoFileSize('');
      setPortalTitle(bu.branding.portalTitle || `${bu.name} Service Portal`);
      setWelcomeBannerTitle(bu.branding.welcomeBannerTitle || `${bu.name} IT Helpdesk`);
      setWelcomeBannerSubtitle(bu.branding.welcomeBannerSubtitle || `Support for ${bu.name}`);
      setBannerAnnouncement(bu.branding.bannerAnnouncement || '');
      setPrimaryColor(bu.branding.primaryColor || '#1e3a8a');
      setAccentColor(bu.branding.accentColor || '#3b82f6');
      setSupportHotline(bu.branding.supportHotline || 'Ext. 4001');
      setSupportEmail(bu.branding.supportEmail || `it-support@${bu.code.toLowerCase()}.myorg.com`);
      setDeskLocation(bu.branding.deskLocation || 'IT Support Hub');
    }
  };

  // Process uploaded local image file into base64 Data URL
  const processLocalImage = (file: File) => {
    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP, or GIF).');
      return;
    }

    // Limit size to 4MB for localStorage performance
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Image file is too large. Please choose an image under 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLogoUrl(dataUrl);
      setLogoFileName(file.name);
      setLogoFileSize((file.size / 1024).toFixed(1) + ' KB');
    };
    reader.onerror = () => {
      setUploadError('Failed to read local file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLocalImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLocalImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoFileName('');
    setLogoFileSize('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBranding: BusinessUnitBranding = {
      logoUrl: logoUrl.trim() || undefined,
      portalTitle: portalTitle.trim() || `${targetBU.name} Service Portal`,
      welcomeBannerTitle: welcomeBannerTitle.trim() || `${targetBU.name} IT Helpdesk`,
      welcomeBannerSubtitle: welcomeBannerSubtitle.trim() || `Technical Support for ${targetBU.name}`,
      bannerAnnouncement: bannerAnnouncement.trim() || undefined,
      primaryColor: primaryColor.trim() || '#1e3a8a',
      accentColor: accentColor.trim() || '#3b82f6',
      accentGradient: `linear-gradient(135deg, ${primaryColor.trim() || '#1e3a8a'} 0%, ${accentColor.trim() || '#3b82f6'} 100%)`,
      bannerTheme: 'blue',
      supportHotline: supportHotline.trim() || 'Ext. 4001',
      supportEmail: supportEmail.trim() || 'it-support@myorg.com',
      deskLocation: deskLocation.trim() || 'IT Helpdesk',
    };

    onSaveBranding(selectedBUId, updatedBranding);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  // Color preset swatches
  const colorPresets = [
    { name: 'Corporate Navy / Blue', primary: '#1e3a8a', accent: '#3b82f6' },
    { name: 'Hospitality Amber / Gold', primary: '#78350f', accent: '#d97706' },
    { name: 'Royal Hotel Indigo / Violet', primary: '#312e81', accent: '#6366f1' },
    { name: 'Emerald Green & Mint', primary: '#064e3b', accent: '#10b981' },
    { name: 'Slate Steel & Cyan', primary: '#0f172a', accent: '#06b6d4' },
    { name: 'Crimson Wine & Rose', primary: '#881337', accent: '#e11d48' },
  ];

  return (
    <div
      id="modal-branding-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="modal-branding-panel"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 my-6"
      >
        {/* Header (Clean Light Theme) */}
        <div className="px-6 py-4 bg-slate-50 text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Client Portal Customization &amp; Branding</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  Global Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload local logo, configure banner headlines, contact info, and theme colors across all Business Units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Branding changes saved successfully! Portal themes are updated.
            </div>
          )}

          {/* Business Unit Target Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Select Target Business Unit to Customize
            </label>
            <select
              id="branding-select-bu"
              value={selectedBUId}
              onChange={(e) => handleBUChange(e.target.value)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2.5 text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.code} — {bu.name}
                </option>
              ))}
            </select>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              Real-time Portal Header &amp; Banner Preview
            </label>
            <div
              className="rounded-xl overflow-hidden border border-slate-300 shadow-sm transition-all"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
              }}
            >
              <div className="p-4 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {logoUrl ? (
                    <div className="h-12 min-w-[50px] max-w-[140px] rounded-lg bg-white p-1 flex items-center justify-center shadow-xs shrink-0 border border-white/40">
                      <img
                        src={logoUrl}
                        alt="Preview Logo"
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-white/25 flex items-center justify-center font-bold text-sm">
                      {targetBU.code}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm leading-tight drop-shadow-xs">
                      {welcomeBannerTitle || `${targetBU.name} IT Helpdesk`}
                    </h3>
                    <p className="text-[11px] text-white/85 mt-0.5 drop-shadow-xs">
                      {welcomeBannerSubtitle || `Technical Support & Incident Desk for ${targetBU.code}`}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs border border-white/30">
                  {targetBU.code}
                </span>
              </div>
            </div>
          </div>

          {/* Logo Source Selection: Local Upload vs Web URL */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                Business Unit Logo Image
              </label>
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                    logoMode === 'upload'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Local File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 ${
                    logoMode === 'url'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Link className="w-3 h-3" />
                  <span>Image URL</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Option A: Local File Upload & Drag-and-Drop */}
            {logoMode === 'upload' && (
              <div className="space-y-2">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : logoUrl
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-9 h-9 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-600">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Click to choose image from your computer, or drag &amp; drop
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Supports PNG, JPG, SVG, WebP, GIF (Max 4MB)
                    </p>
                  </div>
                </div>

                {/* Selected/Uploaded Logo Preview & Clear Button */}
                {logoUrl && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="Current logo"
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{logoFileName || 'Custom Logo Attached'}</span>
                        </div>
                        {logoFileSize && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {logoFileSize} • Local File Base64
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Option B: Image Web URL input */}
            {logoMode === 'url' && (
              <div className="space-y-1">
                <input
                  type="url"
                  value={logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setLogoFileName('');
                    setLogoFileSize('');
                  }}
                  placeholder="https://images.unsplash.com/... or https://cdn.example.com/logo.png"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  Enter any direct image URL link hosted on the web or an S3/CDN bucket.
                </p>
              </div>
            )}
          </div>

          {/* Palette Color Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Theme Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#1e3a8a"
                  className="flex-1 text-xs rounded-lg border border-slate-300 p-2 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Accent Highlight Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 text-xs rounded-lg border border-slate-300 p-2 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preset Color Themes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Theme Palettes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setAccentColor(preset.accent);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 hover:border-slate-400 bg-slate-50 text-left transition"
                >
                  <div className="flex space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: preset.accent }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-700 truncate">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Welcome Banner Headline */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Welcome Banner Headline
            </label>
            <input
              type="text"
              value={welcomeBannerTitle}
              onChange={(e) => setWelcomeBannerTitle(e.target.value)}
              placeholder="e.g. CCEC Grand Convention Center • AV & IT Helpdesk"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Support Subtitle / Description
            </label>
            <input
              type="text"
              value={welcomeBannerSubtitle}
              onChange={(e) => setWelcomeBannerSubtitle(e.target.value)}
              placeholder="e.g. 24/7 Fast-Track Technical Escalation for Hall Keynote Speakers & Operations"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Optional Banner Announcement / Broadcast */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5 text-amber-500" />
              Live Announcement Bar (Optional)
            </label>
            <input
              type="text"
              value={bannerAnnouncement}
              onChange={(e) => setBannerAnnouncement(e.target.value)}
              placeholder="e.g. Scheduled Network Upgrade at 23:00 tonight"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                Hotline
              </label>
              <input
                type="text"
                value={supportHotline}
                onChange={(e) => setSupportHotline(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
                placeholder="Ext. 4001"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" />
                Support Email
              </label>
              <input
                type="text"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
                placeholder="it@bu.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Desk Location
              </label>
              <input
                type="text"
                value={deskLocation}
                onChange={(e) => setDeskLocation(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2"
                placeholder="Level 2, Rm 204"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              id="btn-save-branding"
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
            >
              Save &amp; Apply Branding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
