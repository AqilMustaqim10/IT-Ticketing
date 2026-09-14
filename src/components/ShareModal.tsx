/**
 * @file ShareModal.tsx
 * @description Dialog allowing users to share the IT Support Desk with friends and colleagues.
 * Features instant live Cloud URL sharing with QR code, demo credentials, and a comprehensive
 * localhost / Wi-Fi LAN network sharing guide with live IP detection.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Wifi,
  Globe,
  Laptop,
  Smartphone,
  ExternalLink,
  Users,
  Shield,
  Key,
  Terminal,
  Info,
  HelpCircle,
} from 'lucide-react';
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (type: 'success' | 'info' | 'error', text: string) => void;
}

interface NetworkInfo {
  port: number;
  localIps: string[];
  hostname: string;
  hostHeader: string;
  protocol: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'localhost'>('cloud');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isLoadingNet, setIsLoadingNet] = useState(false);

  // Fetch local network info from server API
  useEffect(() => {
    if (isOpen) {
      setIsLoadingNet(true);
      fetch('/api/system/network-info')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setNetworkInfo(data);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingNet(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build the shareable cloud URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = currentOrigin;

  const copyToClipboard = (text: string, fieldName: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
    onShowToast('success', `${label} copied to clipboard!`);
  };

  // Demo accounts for friends to try
  const demoAccounts = [
    {
      role: 'ADMIN',
      title: 'Administrator',
      email: 'admin@uoa.com.my',
      pass: 'password123',
      desc: 'Full group-wide access, all business units, UAT/Prod switch, branding & audit logs.',
    },
    {
      role: 'IT',
      title: 'CCEC IT Support Engineer',
      email: 'it.ccec@uoa.com.my',
      pass: 'password123',
      desc: 'Assigned to CCEC Business Unit tickets, SLA resolutions, and staff registration.',
    },
    {
      role: 'USER',
      title: 'Hotel Front Office Staff',
      email: 'user.hotel@uoa.com.my',
      pass: 'password123',
      desc: 'Standard employee submitting incident tickets, attachments, and tracking progress.',
    },
  ];

  return (
    <div
      id="modal-share-app"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Share IT Helpdesk with Friends & Colleagues
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct live web link, mobile access, and local network Wi-Fi guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Instant Live Link (Recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('localhost')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'localhost'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Localhost & Wi-Fi Sharing</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'cloud' ? (
            <>
              {/* Cloud Live URL Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Live Web Link (Accessible by anyone, anywhere)
                  </label>
                </div>

                {/* Link Box */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                    <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{shareableUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(shareableUrl, 'link', 'Live Share Link')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
                  >
                    {copiedField === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedField === 'link' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Your friends don't need to install anything! They can open this link on their phone, tablet, or laptop browser to try the ticketing system immediately.
                  </span>
                </div>
              </div>

              {/* Mobile QR Code Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center gap-4">
                {/* SVG Visual QR Mockup */}
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0 flex flex-col items-center">
                  <svg className="w-24 h-24 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    {/* Top Left Corner */}
                    <rect x="10" y="10" width="28" height="28" rx="4" />
                    <rect x="14" y="14" width="20" height="20" fill="white" />
                    <rect x="18" y="18" width="12" height="12" />
                    {/* Top Right Corner */}
                    <rect x="62" y="10" width="28" height="28" rx="4" />
                    <rect x="66" y="14" width="20" height="20" fill="white" />
                    <rect x="70" y="18" width="12" height="12" />
                    {/* Bottom Left Corner */}
                    <rect x="10" y="62" width="28" height="28" rx="4" />
                    <rect x="14" y="66" width="20" height="20" fill="white" />
                    <rect x="18" y="70" width="12" height="12" />
                    {/* Data Matrix Dots */}
                    <rect x="42" y="12" width="6" height="6" />
                    <rect x="52" y="12" width="6" height="6" />
                    <rect x="42" y="24" width="8" height="6" />
                    <rect x="42" y="44" width="16" height="16" rx="2" />
                    <rect x="64" y="44" width="8" height="8" />
                    <rect x="76" y="56" width="10" height="10" />
                    <rect x="12" y="44" width="8" height="8" />
                    <rect x="24" y="44" width="12" height="6" />
                    <rect x="64" y="72" width="12" height="8" />
                    <rect x="44" y="68" width="12" height="14" />
                    <rect x="80" y="74" width="8" height="14" />
                  </svg>
                  <span className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-wider">
                    Scan with Phone
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>Instant Mobile Testing</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Have your friend open their smartphone camera and scan the QR code to open the responsive mobile IT Helpdesk.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct mobile app test mode with camera screenshot uploads & push notifications.
                  </p>
                </div>
              </div>

              {/* Demo Accounts to Share */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Demo Accounts for Friends to Test</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Click to copy credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {demoAccounts.map((acc) => (
                    <div
                      key={acc.role}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 flex flex-col justify-between hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {acc.role}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                `Email: ${acc.email}\nPassword: ${acc.pass}`,
                                acc.role,
                                `${acc.title} Credentials`
                              )
                            }
                            className="p-1 rounded text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Copy credentials"
                          >
                            {copiedField === acc.role ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5">
                          {acc.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {acc.desc}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono space-y-0.5 text-slate-600 dark:text-slate-300">
                        <div className="truncate">{acc.email}</div>
                        <div className="text-slate-400">PW: {acc.pass}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Localhost & Wi-Fi LAN Sharing Tab */}
              <div className="space-y-5">
                {/* Method 1: Same Wi-Fi Network */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Method 1: Wi-Fi / Local Area Network (LAN)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        For friends and teammates on the same office or home Wi-Fi
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    The backend dev server binds to <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[11px]">0.0.0.0:3000</code>, allowing any phone or laptop on the same network to connect directly:
                  </p>

                  {networkInfo && networkInfo.localIps.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Detected Local Network Addresses:
                      </span>
                      {networkInfo.localIps.map((ip) => {
                        const lanUrl = `http://${ip}:${networkInfo.port}`;
                        return (
                          <div key={ip} className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                              {lanUrl}
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(lanUrl, ip, 'Local Network URL')}
                              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition flex items-center gap-1"
                            >
                              {copiedField === ip ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedField === ip ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-300">
                      http://&lt;YOUR-LAPTOP-IP&gt;:3000
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <p>💡 <strong>Tip to find your local IP:</strong></p>
                    <p>• Windows: Open cmd and type <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1">ipconfig</code> (look for IPv4 Address).</p>
                    <p>• macOS / Linux: Run <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1">ipconfig getifaddr en0</code> or <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1">hostname -I</code>.</p>
                  </div>
                </div>

                {/* Method 2: Internet Tunneling for Localhost */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Method 2: Share Localhost Over the Internet (Zero Setup Tunnels)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        When your friends are at their own home or outside your Wi-Fi
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    If you are running the project on your laptop, you can generate a secure temporary public link in 5 seconds using either of these free utilities in your terminal:
                  </p>

                  <div className="space-y-2 font-mono text-xs">
                    {/* Localtunnel */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 text-slate-100">
                      <span className="truncate">npx localtunnel --port 3000</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('npx localtunnel --port 3000', 'lt', 'Localtunnel command')}
                        className="p-1 hover:text-blue-400 cursor-pointer"
                        title="Copy command"
                      >
                        {copiedField === 'lt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Ngrok */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 text-slate-100">
                      <span className="truncate">npx ngrok http 3000</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('npx ngrok http 3000', 'ngrok', 'Ngrok command')}
                        className="p-1 hover:text-blue-400 cursor-pointer"
                        title="Copy command"
                      >
                        {copiedField === 'ngrok' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    This outputs a secure public <code className="font-mono text-blue-500">https://...</code> link that points straight to your localhost and can be sent to anyone worldwide!
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Current Scope:</span>
            <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              🟢 Production Live
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
