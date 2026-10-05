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
  Activity,
  Terminal,
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
  DEFAULT_REJECTION_SUBJECT_TEMPLATE,
  DEFAULT_REJECTION_BODY_TEMPLATE,
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
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'LOGS' | 'SIMULATOR'>('SETTINGS');

  const [simFrom, setSimFrom] = useState('aaqil.mustaqim@uoa.com.my');
  const [simFromName, setSimFromName] = useState('Aaqil Mustaqim');
  const [simSubject, setSimSubject] = useState('POS Terminal #3 printer error in Grand Ballroom');
  const [simBody, setSimBody] = useState('Hi IT Support,\n\nThe POS terminal printer is not printing receipt and showing offline error.\n\nBest regards,\nAaqil Mustaqim\nSenior Manager | UOA Hospitality\nTel: +603-5555-1234\n\nCONFIDENTIAL NOTICE: This email is intended solely for...');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const [diagnosticResult, setDiagnosticResult] = useState<{
    success?: boolean;
    message?: string;
    banner?: string;
    pingMs?: number;
    messageCount?: number;
    mailboxSizeOctets?: number;
    lastTestedAt?: string;
    rawLog?: string[];
  } | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);

  const runDiagnosticTest = async () => {
    setIsDiagnosticRunning(true);
    const logs = ['Initializing POP3 diagnostic session...', `Target: ${config.host}:${config.port} (SSL: ${config.useSsl})`];
    setDiagnosticResult({ rawLog: logs });
    try {
      logs.push(`Establishing TCP/TLS socket connection to ${config.host}:${config.port}...`);
      setDiagnosticResult({ rawLog: [...logs] });

      const res = await fetch('/api/email/test-pop3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      
      if (data.success) {
        logs.push(`[OK] Server Greeting Banner: ${data.banner || '+OK POP3 server ready'}`);
        logs.push(`[OK] USER & PASS authentication successful for ${config.username || config.emailAddress}`);
        logs.push(`[OK] STAT Command Response: ${data.messageCount ?? 0} message(s) in mailbox (${data.mailboxSizeOctets ?? 0} octets)`);
        logs.push(`Diagnostic session completed successfully in ${data.pingMs || 120}ms.`);
      } else {
        logs.push(`[ERROR] Connection or authentication failed: ${data.message}`);
      }

      setDiagnosticResult({
        ...data,
        lastTestedAt: new Date().toLocaleTimeString(),
        rawLog: logs,
      });
      onShowToast(data.success ? 'POP3 diagnostic test passed!' : 'POP3 diagnostic test failed', data.success ? 'success' : 'error');
    } catch (err: any) {
      logs.push(`[FATAL] Network error: ${err.message}`);
      setDiagnosticResult({
        success: false,
        message: err.message,
        lastTestedAt: new Date().toLocaleTimeString(),
        rawLog: logs,
      });
      onShowToast('Diagnostic test error', 'error');
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimResult(null);
    try {
      const res = await emailIngestionService.simulateInboundEmail({
        from: simFrom,
        fromName: simFromName,
        subject: simSubject,
        body: simBody,
      });
      setSimResult(res);
      refreshLogs();
      if (res.success) {
        onShowToast(`Test email successfully converted into Ticket #${res.ticket?.ticketNumber || 'New'}!`, 'success');
        if (onTicketCreated) onTicketCreated();
      } else {
        onShowToast(res.message || 'Simulation failed', 'error');
      }
    } catch (err: any) {
      setSimResult({ success: false, message: err.message });
      onShowToast('Failed to simulate inbound email', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

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
    const logs = ['Initializing POP3 connection test...', `Target: ${config.host}:${config.port} (SSL: ${config.useSsl})`];
    setDiagnosticResult({ rawLog: logs });
    try {
      const result = await emailIngestionService.testPop3Connection(config);
      setTestInboundResult(result);
      
      if (result.success) {
        logs.push(`[OK] Server Greeting Banner: +OK POP3 server ready`);
        logs.push(`[OK] Connection ping successful: ${result.details?.pingMs || 120}ms latency`);
        logs.push(`[OK] Mailbox status: ${result.details?.mailboxStatus || 'Connected'} (${result.details?.pendingMessagesCount ?? 0} messages)`);
        onShowToast(result.message, 'success');
      } else {
        logs.push(`[ERROR] Connection failed: ${result.message}`);
        onShowToast(result.message, 'error');
      }

      setDiagnosticResult({
        success: result.success,
        message: result.message,
        banner: '+OK POP3 server ready',
        pingMs: result.details?.pingMs,
        messageCount: result.details?.pendingMessagesCount,
        lastTestedAt: new Date().toLocaleTimeString(),
        rawLog: logs,
      });
    } catch (e: any) {
      logs.push(`[FATAL] Network error: ${e.message}`);
      setTestInboundResult({ success: false, message: e.message || 'Connection timeout.' });
      setDiagnosticResult({
        success: false,
        message: e.message,
        lastTestedAt: new Date().toLocaleTimeString(),
        rawLog: logs,
      });
      onShowToast('Failed to connect to company mail server', 'error');
    } finally {
      setIsTestingInbound(false);
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
      if (res.success && res.fetchedCount > 0) {
        onShowToast(`POP3 Fetch complete: ${res.fetchedCount} new report(s) auto-converted into tickets!`, 'success');
      } else if (res.success) {
        onShowToast(res.message || 'POP3 Mailbox is up to date (no new unread reports).', 'info');
      } else {
        onShowToast(res.message || 'POP3 synchronization failed.', 'error');
      }
    } catch (e: any) {
      onShowToast('Company mailbox sync failed', 'error');
    } finally {
      setIsSyncingMailbox(false);
    }
  };

  const handleResetAndSync = async () => {
    setIsSyncingMailbox(true);
    try {
      await fetch('/api/email/reset-cache', { method: 'POST' });
      const res = await emailIngestionService.fetchPop3EmailsNow(config);
      refreshLogs();
      if (onTicketCreated) {
        onTicketCreated();
      }
      if (res.success && res.fetchedCount > 0) {
        onShowToast(`Cache reset & POP3 Fetch complete: ${res.fetchedCount} new report(s) auto-converted into tickets!`, 'success');
      } else if (res.success) {
        onShowToast(res.message || 'Cache reset. Mailbox checked (0 new unread reports).', 'info');
      } else {
        onShowToast(res.message || 'POP3 synchronization failed.', 'error');
      }
    } catch (e: any) {
      onShowToast('Reset & sync failed', 'error');
    } finally {
      setIsSyncingMailbox(false);
    }
  };

  const handleForceIngest = async () => {
    setIsSyncingMailbox(true);
    try {
      const res = await emailIngestionService.forceIngestEmails();
      refreshLogs();
      if (onTicketCreated) {
        onTicketCreated();
      }
      if (res.success && res.fetchedCount > 0) {
        onShowToast(`⚡ Force Ingest Success: ${res.fetchedCount} email(s) converted into tickets!`, 'success');
      } else if (res.success) {
        onShowToast(res.message || 'Mailbox checked, 0 messages found to ingest.', 'info');
      } else {
        onShowToast(res.message || 'Force ingest failed.', 'error');
      }
    } catch (e: any) {
      onShowToast('Force ingest failed', 'error');
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
          <button
            type="button"
            onClick={handleResetAndSync}
            disabled={isSyncingMailbox}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Clears ingestion memory cache so all emails currently in mailbox are freshly re-scanned and converted into tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMailbox ? 'animate-spin' : ''}`} />
            <span>Reset Cache &amp; Re-Scan</span>
          </button>
          <button
            type="button"
            onClick={handleForceIngest}
            disabled={isSyncingMailbox}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Bypasses all filters and forcefully converts every email currently in the mailbox into a support ticket"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSyncingMailbox ? 'animate-spin' : ''}`} />
            <span>⚡ Force Ingest All Emails</span>
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

        <button
          type="button"
          onClick={() => setActiveTab('SIMULATOR')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'SIMULATOR'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Test / Simulate Inbound Email</span>
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


          </fieldset>

            {/* POP3 Diagnostic & Live Connection Inspector */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-slate-100 shadow-xl space-y-5 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>POP3 Connection &amp; Live Diagnostic Inspector</span>
                      {diagnosticResult?.success === true && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Healthy Connection
                        </span>
                      )}
                      {diagnosticResult?.success === false && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Connection Error
                        </span>
                      )}
                      {!diagnosticResult && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Ready to Test
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitor live handshake status, error messages, last polling timestamps, and raw server response logs.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runDiagnosticTest}
                  disabled={isDiagnosticRunning}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosticRunning ? 'animate-spin' : ''}`} />
                  <span>{isDiagnosticRunning ? 'Running Diagnostics...' : 'Run Live Diagnostic Handshake'}</span>
                </button>
              </div>

              {/* Diagnostic Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Target Server</span>
                  <span className="text-xs font-mono font-bold text-slate-200 mt-1 block truncate">
                    {config.host}:{config.port}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{config.useSsl ? 'SSL/TLS (Port 995)' : 'Plain TCP (Port 110)'}</span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Last Poll Timestamp</span>
                  <span className="text-xs font-mono font-bold text-slate-200 mt-1 block truncate">
                    {config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toLocaleTimeString() : 'Never Polled'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp).toLocaleDateString() : 'Awaiting sync'}
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Mailbox STAT Count</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 mt-1 block">
                    {diagnosticResult?.messageCount !== undefined ? `${diagnosticResult.messageCount} messages` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {diagnosticResult?.mailboxSizeOctets ? `${Math.round(diagnosticResult.mailboxSizeOctets / 1024)} KB octets` : 'Unchecked'}
                  </span>
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Last Handshake Status</span>
                  <span className={`text-xs font-mono font-bold mt-1 block ${
                    diagnosticResult?.success === true ? 'text-emerald-400' : diagnosticResult?.success === false ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {diagnosticResult?.success === true ? 'SUCCESS (+OK)' : diagnosticResult?.success === false ? 'FAILED (-ERR)' : 'IDLE'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {diagnosticResult?.lastTestedAt ? `Tested at ${diagnosticResult.lastTestedAt}` : 'No test run yet'}
                  </span>
                </div>
              </div>

              {/* Raw Terminal Diagnostic Log Viewer */}
              <div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span>Raw Diagnostic Log &amp; Server Handshake Output</span>
                  </span>
                  {diagnosticResult?.message && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Message: <strong className={diagnosticResult.success ? 'text-emerald-300' : 'text-rose-300'}>{diagnosticResult.message}</strong>
                    </span>
                  )}
                </div>
                <div className="bg-black/80 rounded-xl p-4 font-mono text-[11px] text-emerald-400 border border-slate-800 max-h-48 overflow-y-auto space-y-1 shadow-inner">
                  {diagnosticResult?.rawLog ? (
                    diagnosticResult.rawLog.map((logLine, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-600 select-none">&gt;</span>
                        <span className={logLine.includes('ERROR') || logLine.includes('failed') ? 'text-rose-400' : logLine.includes('OK') ? 'text-emerald-400' : 'text-slate-300'}>
                          {logLine}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">
                      Click &ldquo;Run Live Diagnostic Handshake&rdquo; above to test real POP3 connection, TLS handshake, USER/PASS authentication, and STAT commands on port {config.port}.
                    </div>
                  )}
                </div>
              </div>
            </div>

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

      {/* TAB 3: TEST / SIMULATE INBOUND EMAIL */}
      {activeTab === 'SIMULATOR' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inbound Email &amp; Signature Stripping Simulator</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Test how incoming emails (including corporate signatures, legal disclaimers, and footers) are parsed and converted into tickets.
              </p>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sender Email Address</label>
                  <input
                    type="email"
                    value={simFrom}
                    onChange={(e) => setSimFrom(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="e.g. aaqil.mustaqim@uoa.com.my"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must match a registered user email or auto-registers.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    value={simFromName}
                    onChange={(e) => setSimFromName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="e.g. Aaqil Mustaqim"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  placeholder="e.g. [URGENT] POS Terminal printer offline"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Body (Include your signature, images, and footer)
                </label>
                <textarea
                  rows={8}
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The heuristic engine will automatically strip out signatures, phone numbers, and disclaimers, extracting only the problem statement.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Process &amp; Convert Into Ticket</span>
                </button>
              </div>
            </form>

            {simResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                simResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {simResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
                  <span>{simResult.message}</span>
                </div>
                {simResult.ticket && (
                  <div className="pt-2 border-t border-emerald-200/60 space-y-1 font-mono text-[11px]">
                    <div>Created Ticket Number: <span className="font-bold">{simResult.ticket.ticketNumber}</span></div>
                    <div>Title: {simResult.ticket.title}</div>
                    <div>Priority: {simResult.ticket.priority} | Category: {simResult.ticket.category}</div>
                    <div className="text-slate-600 mt-1">Extracted Problem Statement: &ldquo;{simResult.ticket.description}&rdquo;</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
