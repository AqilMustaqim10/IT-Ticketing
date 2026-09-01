/**
 * @file EmailIntegrationPage.tsx
 * @description Corporate Email & Inbound Mailbox Integration Studio.
 * Exclusively accessible by Global Administrators to configure company POP3/IMAP mailboxes,
 * outbound SMTP relays, auto-ticket ingestion rules, and corporate employee email processing.
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  Key,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Building2,
  FileText,
  Sliders,
  HelpCircle,
  ExternalLink,
  Clock,
  Sparkles,
  ArrowRight,
  Inbox,
  Paperclip,
  Trash2,
  Eye,
  Check,
  CornerDownLeft,
  MessageSquare,
  Lock,
  ShieldAlert,
  Layers,
  Settings,
  ChevronRight,
  Pencil,
  Unlock,
  X,
} from 'lucide-react';
import {
  BusinessUnit,
  Department,
  User,
  Pop3MailboxConfig,
  EmailSettings,
  InboundEmailLog,
  Ticket,
  TicketPriority,
} from '../../types';
import {
  emailIngestionService,
  DEFAULT_COMPANY_MAILBOX_CONFIG,
  DEFAULT_AUTO_REPLY_SUBJECT_TEMPLATE,
  DEFAULT_AUTO_REPLY_BODY_TEMPLATE,
} from '../../services/emailIngestionService';
import { storageService } from '../../services/storageService';
import { BUBadge } from '../BUBadge';

interface EmailIntegrationPageProps {
  currentUser: User;
  businessUnits: BusinessUnit[];
  departments: Department[];
  onSelectTicket?: (ticket: Ticket) => void;
  onTicketCreated?: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const EmailIntegrationPage: React.FC<EmailIntegrationPageProps> = ({
  currentUser,
  businessUnits,
  departments,
  onSelectTicket,
  onTicketCreated,
  onShowToast,
}) => {
  // Strict RBAC: Only Administrators can configure or access company email settings
  const isAdmin = currentUser.role === 'ADMIN';

  // Mailbox Configuration State
  const [config, setConfig] = useState<Pop3MailboxConfig>(() => {
    const fromStorage = storageService.getEmailSettings();
    const fromService = emailIngestionService.getConfig();
    return {
      ...fromService,
      ...fromStorage,
      host: fromStorage.host || fromService.host,
      port: fromStorage.port || fromService.port,
      user: fromStorage.user || fromStorage.username || fromService.username || 'ticket.support@uohospitality.com.my',
      username: fromStorage.user || fromStorage.username || fromService.username || 'ticket.support@uohospitality.com.my',
      password: fromStorage.password || fromStorage.appPassword || fromService.appPassword || '',
      appPassword: fromStorage.password || fromStorage.appPassword || fromService.appPassword || '',
      useSSL: fromStorage.useSSL !== undefined ? fromStorage.useSSL : fromService.useSsl,
      useSsl: fromStorage.useSSL !== undefined ? fromStorage.useSSL : fromService.useSsl,
    };
  });
  const [isTestingInbound, setIsTestingInbound] = useState(false);
  const [testInboundResult, setTestInboundResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testSmtpResult, setTestSmtpResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Inbound Email Logs
  const [logs, setLogs] = useState<InboundEmailLog[]>(() => emailIngestionService.getLogs());
  const [selectedLog, setSelectedLog] = useState<InboundEmailLog | null>(null);
  const [isSyncingMailbox, setIsSyncingMailbox] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'LOGS'>('SETTINGS');

  // Security Locking: Admin must explicitly click "Edit Configuration" before inputs become editable
  const [isEditing, setIsEditing] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<Pop3MailboxConfig | null>(null);

  useEffect(() => {
    // Load config from storageService and backend
    const local = storageService.getEmailSettings();
    if (local) {
      setConfig((prev) => ({
        ...prev,
        ...local,
        host: local.host || prev.host,
        port: local.port || prev.port,
        user: local.user || local.username || prev.user || prev.username,
        username: local.user || local.username || prev.user || prev.username,
        password: local.password || local.appPassword || prev.password || prev.appPassword,
        appPassword: local.password || local.appPassword || prev.password || prev.appPassword,
        useSSL: local.useSSL !== undefined ? local.useSSL : prev.useSSL,
        useSsl: local.useSSL !== undefined ? local.useSSL : prev.useSsl,
      }));
    }

    emailIngestionService.fetchServerConfig().then((srvConfig) => {
      if (srvConfig) {
        setConfig((prev) => ({ ...prev, ...srvConfig }));
        storageService.saveEmailSettings(srvConfig);
      }
    });

    // Load logs from backend
    emailIngestionService.fetchServerLogs().then((srvLogs) => {
      if (srvLogs) setLogs(srvLogs);
    });
  }, []);

  // If user is not an admin, block access with clear security notice
  if (!isAdmin) {
    return (
      <div id="page-email-restricted" className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Administrator Access Required</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          Company Mailbox configuration, inbound POP3/IMAP settings, and automated ticket ingestion rules can only be configured by System Administrators.
        </p>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Security Policy:</span>
          </div>
          <p>• Only Global Administrators can modify company mail server credentials.</p>
          <p>• Your current role: <strong className="uppercase text-slate-900">{currentUser.role}</strong> ({currentUser.fullName})</p>
          <p>• If you require mailbox integration changes, please contact your organization&apos;s Global IT Administrator.</p>
        </div>
      </div>
    );
  }

  const refreshLogs = () => {
    emailIngestionService.fetchServerLogs().then((srvLogs) => {
      setLogs(srvLogs || emailIngestionService.getLogs());
    });
  };

  const handleStartEdit = () => {
    setOriginalConfig({ ...config });
    setIsEditing(true);
    onShowToast('Mailbox settings unlocked for editing. Make your changes and click Save.', 'info');
  };

  const handleCancelEdit = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
    }
    setIsEditing(false);
    onShowToast('Edit canceled. Restored original configuration.', 'info');
  };

  const handleSaveSettings = async () => {
    const emailSettings: EmailSettings = {
      host: config.host,
      port: Number(config.port) || 995,
      user: config.user || config.username || config.emailAddress,
      username: config.user || config.username || config.emailAddress,
      password: config.password || config.appPassword,
      appPassword: config.password || config.appPassword,
      useSSL: config.useSSL !== undefined ? config.useSSL : (config.useSsl !== undefined ? config.useSsl : true),
      useSsl: config.useSSL !== undefined ? config.useSSL : (config.useSsl !== undefined ? config.useSsl : true),
      enabled: config.enabled,
      pollIntervalMinutes: config.pollIntervalMinutes,
      emailAddress: config.emailAddress || config.user || config.username,
      companyDomain: config.companyDomain,
      provider: config.provider,
      smtpEnabled: config.smtpEnabled,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUseSsl: config.smtpUseSsl,
      smtpUsername: config.smtpUsername,
      smtpPassword: config.smtpPassword,
      senderDisplayName: config.senderDisplayName,
      targetBusinessUnitId: config.targetBusinessUnitId,
      defaultDepartmentId: config.defaultDepartmentId,
      autoAssignCategory: config.autoAssignCategory,
      autoExtractPriority: config.autoExtractPriority,
      leaveCopyOnServer: config.leaveCopyOnServer,
      enableAutoReply: config.enableAutoReply,
      autoReplySubjectTemplate: config.autoReplySubjectTemplate,
      autoReplyBodyTemplate: config.autoReplyBodyTemplate,
    };

    storageService.saveEmailSettings(emailSettings);
    await emailIngestionService.saveConfig(config);
    setIsEditing(false);
    setOriginalConfig({ ...config });
    onShowToast('POP3 Email Settings saved & configuration locked successfully!', 'success');
  };

  const handleTestInboundConnection = async () => {
    setIsTestingInbound(true);
    setTestInboundResult(null);
    try {
      const result = await emailIngestionService.testPop3Connection(config);
      setTestInboundResult(result);
      if (result.success) {
        onShowToast(result.message, 'success');
      } else {
        onShowToast(result.message, 'error');
      }
    } catch (e: any) {
      setTestInboundResult({ success: false, message: e.message || 'Connection timeout.' });
      onShowToast('Failed to connect to company mail server', 'error');
    } finally {
      setIsTestingInbound(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    setTestSmtpResult(null);
    try {
      const result = await emailIngestionService.testSmtpConnection(config);
      setTestSmtpResult(result);
      if (result.success) {
        onShowToast(result.message, 'success');
      } else {
        onShowToast(result.message, 'error');
      }
    } catch (e: any) {
      setTestSmtpResult({ success: false, message: e.message || 'SMTP Connection timeout.' });
      onShowToast('Failed to connect to SMTP relay', 'error');
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSyncMailboxNow = async () => {
    setIsSyncingMailbox(true);
    try {
      const res = await emailIngestionService.fetchPop3EmailsNow(config);
      refreshLogs();
      if (onTicketCreated) {
        onTicketCreated();
      }
      if (res.fetchedCount > 0) {
        onShowToast(`POP3 Fetch complete: ${res.fetchedCount} new report(s) auto-converted into tickets!`, 'success');
      } else {
        onShowToast(res.message || 'POP3 Mailbox is up to date (no new unread reports).', 'info');
      }
    } catch (e: any) {
      onShowToast('Company mailbox sync failed', 'error');
    } finally {
      setIsSyncingMailbox(false);
    }
  };

  const handleClearLogs = async () => {
    await emailIngestionService.clearLogs();
    refreshLogs();
    setSelectedLog(null);
    onShowToast('Email logs cleared.', 'info');
  };

  // Quick Preset Handlers
  const handleSetUOAPreset = () => {
    const updated: Pop3MailboxConfig = {
      ...config,
      provider: 'COMPANY_POP3',
      companyDomain: 'uohospitality.com.my',
      host: 'mail.uohospitality.com.my',
      port: 995,
      useSsl: true,
      emailAddress: 'ticket.support@uohospitality.com.my',
      username: 'ticket.support@uohospitality.com.my',
      smtpEnabled: true,
      smtpHost: 'smtp.uohospitality.com.my',
      smtpPort: 587,
      smtpUseSsl: false,
      senderDisplayName: 'UOH Hospitality Support Desk',
    };
    setConfig(updated);
    emailIngestionService.saveConfig(updated);
    onShowToast('Applied UOH Hospitality Mail Server Preset (mail.uohospitality.com.my:995 SSL)', 'info');
  };

  const handleSetOffice365Preset = () => {
    const updated: Pop3MailboxConfig = {
      ...config,
      provider: 'OFFICE365',
      companyDomain: 'company.com',
      host: 'outlook.office365.com',
      port: 995,
      useSsl: true,
      emailAddress: 'support@company.com',
      username: 'support@company.com',
      smtpEnabled: true,
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpUseSsl: false,
      senderDisplayName: 'Corporate IT Service Desk',
    };
    setConfig(updated);
    emailIngestionService.saveConfig(updated);
    onShowToast('Applied Microsoft 365 Exchange Online Preset (outlook.office365.com)', 'info');
  };

  const handleSetCustomServerPreset = () => {
    const updated: Pop3MailboxConfig = {
      ...config,
      provider: 'CUSTOM_SERVER',
      companyDomain: 'custom-company.com',
      host: 'mail.custom-company.com',
      port: 995,
      useSsl: true,
      emailAddress: 'it-support@custom-company.com',
      username: 'it-support@custom-company.com',
      smtpEnabled: true,
      smtpHost: 'smtp.custom-company.com',
      smtpPort: 587,
      senderDisplayName: 'Company IT Helpdesk',
    };
    setConfig(updated);
    emailIngestionService.saveConfig(updated);
    onShowToast('Applied Custom Corporate Mail Server Preset', 'info');
  };

  return (
    <div id="page-email-integration" className="space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">
                Corporate Email &amp; Inbound Mailbox Gateway
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                <span>Admin Managed</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Connect your company email account (e.g. <strong>{config.emailAddress || 'ticket.support@uohospitality.com.my'}</strong>). 
              Inbound emails from staff are automatically converted into support tickets with business unit assignment, department routing, and auto-acknowledgment replies.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncMailboxNow}
            disabled={isSyncingMailbox}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMailbox ? 'animate-spin' : ''}`} />
            <span>{isSyncingMailbox ? 'Syncing Mailbox...' : 'Sync Mailbox Now'}</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Chooser Strip */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold shrink-0">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Quick Company Presets:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSetUOAPreset}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>UOA Group Mail (mail.uoa.com.my)</span>
          </button>
          <button
            type="button"
            onClick={handleSetOffice365Preset}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>Microsoft 365 Exchange</span>
          </button>
          <button
            type="button"
            onClick={handleSetCustomServerPreset}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Custom Corporate Server</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'SETTINGS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Company Mailbox &amp; SMTP Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'LOGS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbound Email Audit Logs ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: COMPANY MAILBOX & SMTP SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            {/* Top Edit / Lock Status Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span>Company Mailbox Ingestion Gateway</span>
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isEditing
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Unlock className="w-3 h-3 text-amber-600" />
                        <span>Editing Mode Active</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>Configuration Protected (Locked)</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isEditing
                    ? 'Modify the POP3/IMAP host, port, credentials, and SMTP settings below, then click "Save & Lock".'
                    : 'Settings are protected against accidental mistypes. Click "Edit Configuration" to make changes.'}
                </p>
              </div>

              {/* Action Buttons: Edit Configuration vs Save & Cancel */}
              <div className="flex items-center gap-2 shrink-0">
                {!isEditing ? (
                  <button
                    id="btn-unlock-email-settings"
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Configuration</span>
                  </button>
                ) : (
                  <>
                    <button
                      id="btn-cancel-email-settings"
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      id="btn-save-email-settings"
                      type="button"
                      onClick={handleSaveSettings}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save &amp; Lock</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Top Enable Switch */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Mailbox Ingestion Activation</h3>
                <p className="text-[11px] text-slate-500">
                  When active, the server continuously queries POP3 for incoming staff support requests.
                </p>
              </div>
              <label className={`relative inline-flex items-center ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Locked Fieldset Containing All Configuration Forms */}
            <fieldset disabled={!isEditing} className="space-y-6 disabled:opacity-95">

            {/* Section 1: POP3 Inbound Server Settings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Inbox className="w-4 h-4 text-blue-600" />
                    <span>1. POP3 Server Details &amp; Connection Credentials</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    POP3 SSL/TLS
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Captures POP3 host, port, user, password &amp; useSSL</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    POP3 Server Host <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-pop3-host"
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="mail.uoa.com.my"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. mail.uoa.com.my or outlook.office365.com</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    POP3 Port &amp; SSL/TLS Encryption <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-pop3-port"
                      type="number"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 995 })}
                      className="w-24 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      placeholder="995"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
                      <input
                        id="input-pop3-usessl"
                        type="checkbox"
                        checked={config.useSSL !== undefined ? config.useSSL : config.useSsl}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig({ ...config, useSSL: val, useSsl: val });
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>useSSL (Port 995)</span>
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 995 (SSL/TLS) or 110 (Plain)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    POP3 User / Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-pop3-user"
                    type="text"
                    value={config.user || config.username || config.emailAddress}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig({ ...config, user: val, username: val, emailAddress: val });
                    }}
                    placeholder="ticket.support@uohospitality.com.my"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Mailbox account user identifier</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    POP3 Password / App Secret <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-pop3-password"
                    type="password"
                    value={config.password || config.appPassword || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConfig({
                        ...config,
                        password: val,
                        appPassword: val,
                        smtpPassword: config.smtpPassword ? config.smtpPassword : val,
                      });
                    }}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">POP3 mailbox password or app password</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Corporate Email Address
                  </label>
                  <input
                    id="input-pop3-emailaddress"
                    type="email"
                    value={config.emailAddress}
                    onChange={(e) => setConfig({ ...config, emailAddress: e.target.value })}
                    placeholder="ticket.support@uohospitality.com.my"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Staff send inquiries to this company address</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Background Polling Interval
                  </label>
                  <select
                    id="select-poll-interval"
                    value={config.pollIntervalMinutes}
                    onChange={(e) => setConfig({ ...config, pollIntervalMinutes: parseInt(e.target.value, 10) || 3 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="1">Every 1 Minute (Fast Polling)</option>
                    <option value="3">Every 3 Minutes (Standard)</option>
                    <option value="5">Every 5 Minutes (Low Bandwidth)</option>
                    <option value="10">Every 10 Minutes</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Controls background ticket ingestion polling frequency</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Domain
                  </label>
                  <input
                    type="text"
                    value={config.companyDomain || ''}
                    onChange={(e) => setConfig({ ...config, companyDomain: e.target.value })}
                    placeholder="uohospitality.com.my"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Corporate Mail Provider
                  </label>
                  <select
                    value={config.provider}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="COMPANY_POP3">Corporate POP3 Server (SSL/TLS)</option>
                    <option value="COMPANY_IMAP">Corporate IMAP Server (SSL/TLS)</option>
                    <option value="OFFICE365">Microsoft 365 Exchange Online</option>
                    <option value="CUSTOM_SERVER">Custom Enterprise Mail Server</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.leaveCopyOnServer}
                      onChange={(e) => setConfig({ ...config, leaveCopyOnServer: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Leave original copy on mail server</span>
                  </label>
                </div>
              </div>

              {/* Inbound Test Connection Status */}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestInboundConnection}
                  disabled={isTestingInbound}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingInbound ? 'animate-spin' : ''}`} />
                  <span>{isTestingInbound ? 'Testing Connection...' : 'Test Inbound Mail Server'}</span>
                </button>

                {testInboundResult && (
                  <div
                    className={`text-xs p-3 rounded-xl border flex flex-col gap-1.5 w-full ${
                      testInboundResult.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {testInboundResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{testInboundResult.message}</span>
                      </div>
                      {testInboundResult.details?.pingMs !== undefined && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                          ⚡ {testInboundResult.details.pingMs}ms latency
                        </span>
                      )}
                    </div>
                    {testInboundResult.details && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>Host: <strong className="font-mono text-slate-900">{testInboundResult.details.host}:{testInboundResult.details.port}</strong></span>
                        <span>Protocol: <strong>{testInboundResult.details.ssl ? 'SSL/TLS (Port 995)' : 'Plain/STARTTLS (Port 110)'}</strong></span>
                        {testInboundResult.details.mailboxStatus && (
                          <span>Mailbox: <strong className="text-emerald-700 font-semibold">{testInboundResult.details.mailboxStatus}</strong></span>
                        )}
                        {testInboundResult.details.pendingMessagesCount !== undefined && (
                          <span>Pending Inbound Reports: <strong className="text-blue-700 font-bold">{testInboundResult.details.pendingMessagesCount}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Outbound SMTP Notification Relay */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>2. Outbound Corporate SMTP Relay (Ticket Notifications &amp; Replies)</span>
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.smtpEnabled ?? true}
                    onChange={(e) => setConfig({ ...config, smtpEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold">Enable SMTP Dispatch</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMTP Host Server
                  </label>
                  <input
                    type="text"
                    value={config.smtpHost || ''}
                    onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                    placeholder="smtp.uohospitality.com.my"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMTP Port &amp; Encryption
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.smtpPort || 587}
                      onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) || 587 })}
                      className="w-24 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.smtpUseSsl ?? false}
                        onChange={(e) => setConfig({ ...config, smtpUseSsl: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>SSL (465) / TLS (587)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={config.senderDisplayName || ''}
                    onChange={(e) => setConfig({ ...config, senderDisplayName: e.target.value })}
                    placeholder="UOH Hospitality Support Desk"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SMTP Credentials Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-dashed border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>SMTP Username / Outgoing User</span>
                    <span className="text-[10px] text-slate-400 font-normal">Defaults to POP3 User if empty</span>
                  </label>
                  <input
                    id="input-smtp-username"
                    type="text"
                    value={config.smtpUsername || ''}
                    onChange={(e) => setConfig({ ...config, smtpUsername: e.target.value })}
                    placeholder={config.user || config.username || config.emailAddress || 'ticket.support@uoahospitality.com.my'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>SMTP Password / Secret</span>
                    <button
                      type="button"
                      onClick={() => {
                        const incomingPass = config.password || config.appPassword || '';
                        setConfig({ ...config, smtpPassword: incomingPass });
                        onShowToast('Copied incoming POP3 password to SMTP password field', 'info');
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer underline"
                    >
                      Copy from POP3 Password
                    </button>
                  </label>
                  <input
                    id="input-smtp-password"
                    type="password"
                    value={config.smtpPassword || ''}
                    onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                    placeholder="Enter SMTP password or click 'Copy from POP3'"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Required for outgoing server authentication (resolves 535 error)</span>
                </div>
              </div>

              {/* SMTP Test Connection Status */}
              <div className="mt-3 flex flex-col sm:flex-row sm:items-start gap-3">
                <button
                  type="button"
                  onClick={handleTestSmtpConnection}
                  disabled={isTestingSmtp}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingSmtp ? 'animate-spin' : ''}`} />
                  <span>{isTestingSmtp ? 'Testing SMTP...' : 'Test SMTP Relay'}</span>
                </button>

                {testSmtpResult && (
                  <div
                    className={`text-xs p-3 rounded-xl border flex flex-col gap-1.5 w-full ${
                      testSmtpResult.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {testSmtpResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{testSmtpResult.message}</span>
                      </div>
                      {testSmtpResult.details?.pingMs !== undefined && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                          ⚡ {testSmtpResult.details.pingMs}ms latency
                        </span>
                      )}
                    </div>
                    {testSmtpResult.details && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>Relay: <strong className="font-mono text-slate-900">{testSmtpResult.details.host}:{testSmtpResult.details.port}</strong></span>
                        {testSmtpResult.details.banner && (
                          <span className="truncate max-w-xs">Server: <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-slate-200">{testSmtpResult.details.banner}</code></span>
                        )}
                        {testSmtpResult.details.authenticated !== undefined && (
                          <span>Auth: <strong className={testSmtpResult.details.authenticated ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>{testSmtpResult.details.authenticated ? 'Verified (RFC 4954)' : 'Anonymous/Open Relay'}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Automatic Ticket Ingestion & Routing Defaults */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>3. Corporate Business Unit &amp; Department Ingestion Defaults</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Business Unit (Fallback)
                  </label>
                  <select
                    value={config.targetBusinessUnitId}
                    onChange={(e) => setConfig({ ...config, targetBusinessUnitId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.code} - {bu.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Used if incoming employee email is not pre-registered in any Business Unit.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Smart Category &amp; Priority Detection
                  </label>
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoExtractPriority}
                        onChange={(e) => setConfig({ ...config, autoExtractPriority: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Auto-classify urgency (URGENT / HIGH / MEDIUM) from email body</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.autoAssignCategory}
                        onChange={(e) => setConfig({ ...config, autoAssignCategory: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Auto-route department from content keywords (e.g. POS, Kitchen, Front Desk)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Automated Acknowledgment Email Template */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>4. Automated Employee Acknowledgment Email Response</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Immediately send an email receipt to the employee with their generated Ticket Number.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableAutoReply}
                    onChange={(e) => setConfig({ ...config, enableAutoReply: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold">Enable Auto-Receipt</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject Template
                </label>
                <input
                  type="text"
                  value={config.autoReplySubjectTemplate || DEFAULT_AUTO_REPLY_SUBJECT_TEMPLATE}
                  onChange={(e) => setConfig({ ...config, autoReplySubjectTemplate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Body Template
                </label>
                <textarea
                  rows={6}
                  value={config.autoReplyBodyTemplate || DEFAULT_AUTO_REPLY_BODY_TEMPLATE}
                  onChange={(e) => setConfig({ ...config, autoReplyBodyTemplate: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-slate-800"
                />
              </div>

              {/* Dynamic Variables Chips */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                <span className="font-semibold text-slate-700 block">Available Template Variables:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{ticketNumber}',
                    '{ticketTitle}',
                    '{requesterName}',
                    '{businessUnitName}',
                    '{businessUnitCode}',
                    '{departmentName}',
                    '{priority}',
                    '{status}',
                    '{createdAt}',
                  ].map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-blue-700 font-semibold shadow-2xs"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

            {/* Save / Edit Control Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {isEditing ? (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                    Unsaved changes are active. Click &quot;Save &amp; Lock&quot; to apply.
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Fields are locked to protect against unintentional modification.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    id="btn-footer-edit-email-settings"
                    type="button"
                    onClick={handleStartEdit}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Configuration</span>
                  </button>
                ) : (
                  <>
                    <button
                      id="btn-footer-cancel-email-settings"
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      id="btn-footer-save-email-settings"
                      type="button"
                      onClick={handleSaveSettings}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save &amp; Lock Settings</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INBOUND EMAIL AUDIT LOGS */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Inbound Email Audit History ({logs.length} entries)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Audit trail of all inbound company emails and ticket creation events.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshLogs}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="Refresh Logs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No inbound emails have been processed yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the Simulator tab or click &quot;Sync Mailbox Now&quot; to test.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const matchedBU = businessUnits.find((b) => b.id === log.matchedBusinessUnitId);
                  const isSelected = selectedLog?.id === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`p-4 transition hover:bg-slate-50/80 ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'PROCESSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'REPLIED_TO_EXISTING'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.createdTicketNumber && (
                            <span className="font-mono text-xs font-bold text-slate-900">
                              [{log.createdTicketNumber}]
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {log.subject}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {new Date(log.receivedAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2 truncate">
                          <span>From: <strong>{log.fromName || log.fromAddress}</strong> ({log.fromAddress})</span>
                          {matchedBU && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px]">
                              {matchedBU.code}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedLog(isSelected ? null : log)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer shrink-0"
                        >
                          {isSelected ? 'Hide Details' : 'View Details →'}
                        </button>
                      </div>

                      {/* Expanded Log Details */}
                      {isSelected && (
                        <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs animate-in fade-in duration-150">
                          <div>
                            <span className="font-bold text-slate-700 block mb-0.5">
                              Inbound Message Body:
                            </span>
                            <pre className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px] whitespace-pre-wrap font-sans text-slate-800">
                              {log.rawBody || log.bodyPreview}
                            </pre>
                          </div>

                          {log.autoReplyBody && (
                            <div>
                              <span className="font-bold text-emerald-800 block mb-0.5">
                                Dispatched Auto-Acknowledgment Receipt:
                              </span>
                              <pre className="p-2 rounded bg-emerald-50/50 border border-emerald-100 text-[11px] whitespace-pre-wrap font-sans text-emerald-950">
                                {log.autoReplyBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
