import React, { useState, useCallback } from 'react';
import { saveApiConfig } from '../../services/jekoService';
import { User } from '../../types';
import {
  Key,
  Zap,
  Phone,
  Bell,
  Server,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JekoConfig {
  apiKey: string;
  storeId: string;
}

interface SmsConfig {
  provider: string;
  apiKey: string;
  senderId: string;
}

type SmsProvider = 'Twilio' | 'Orange CI' | 'MTN CI' | 'Autre';
const SMS_PROVIDERS: SmsProvider[] = ['Twilio', 'Orange CI', 'MTN CI', 'Autre'];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_JEKO_KEY = 'admin_jeko_key';
const LS_JEKO_STORE = 'api_jeko_store_id';
const LS_JEKO_ENV = 'api_jeko_env';
const LS_SMS_CONFIG = 'admin_sms_config';

const VITE_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GEMINI_API_KEY',
] as const;

const DEPLOY_COMMANDS = [
  { id: 'npm', label: 'Installer les dépendances', cmd: 'cd functions && npm install' },
  { id: 'login', label: 'Se connecter à Firebase', cmd: 'firebase login' },
  {
    id: 'config',
    label: 'Configurer les secrets',
    cmd: 'firebase functions:config:set jeko.api_key="VOTRE_CLE" jeko.store_id="VOTRE_STORE_ID"',
  },
  { id: 'deploy', label: 'Déployer les functions', cmd: 'firebase deploy --only functions' },
];

// ---------------------------------------------------------------------------
// Small helper: copy-to-clipboard with 2s feedback
// ---------------------------------------------------------------------------

function useCopyFeedback() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return { copiedId, copy };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyButton({ text, id, copiedId, copy }: {
  text: string;
  id: string;
  copiedId: string | null;
  copy: (text: string, id: string) => void;
}) {
  const copied = copiedId === id;
  return (
    <button
      onClick={() => copy(text, id)}
      title="Copier"
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
        copied
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

function CodeLine({ cmd, id, copiedId, copy }: {
  cmd: string;
  id: string;
  copiedId: string | null;
  copy: (text: string, id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-gray-900 rounded-xl px-4 py-2.5 group">
      <code className="flex-1 text-xs font-mono text-green-400 break-all">{cmd}</code>
      <CopyButton text={cmd} id={id} copiedId={copiedId} copy={copy} />
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

function StatusBadge({ ok, labelOk, labelKo }: { ok: boolean; labelOk: string; labelKo: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
      <CheckCircle size={11} /> {labelOk}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
      <XCircle size={11} /> {labelKo}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AdminIntegrationsPanelProps {
  currentUser: User;
}

const AdminIntegrationsPanel: React.FC<AdminIntegrationsPanelProps> = ({ currentUser }) => {
  // ---- Jèko state ----
  const [jekoKey, setJekoKey] = useState<string>(
    () => localStorage.getItem(LS_JEKO_KEY) ?? ''
  );
  const [jekoStoreId, setJekoStoreId] = useState<string>(
    () => localStorage.getItem(LS_JEKO_STORE) ?? ''
  );
  const [jekoEnv, setJekoEnv] = useState<'sandbox' | 'production'>(
    () => (localStorage.getItem(LS_JEKO_ENV) as 'sandbox' | 'production') ?? 'sandbox'
  );
  const [showJekoKey, setShowJekoKey] = useState(false);
  const [showJekoStore, setShowJekoStore] = useState(false);
  const [jekoFormOpen, setJekoFormOpen] = useState(true);
  const [jekoFormKey, setJekoFormKey] = useState('');
  const [jekoFormKeyId, setJekoFormKeyId] = useState('');
  const [jekoFormStore, setJekoFormStore] = useState('');
  const [jekoFormEnv, setJekoFormEnv] = useState<'sandbox' | 'production'>(
    () => (localStorage.getItem(LS_JEKO_ENV) as 'sandbox' | 'production') ?? 'sandbox'
  );
  const [jekoSaved, setJekoSaved] = useState(false);
  const [jekoSaveError, setJekoSaveError] = useState<string | null>(null);
  const [jekoSaving, setJekoSaving] = useState(false);

  // ---- SMS state ----
  const [smsConfig, setSmsConfig] = useState<SmsConfig>(() => {
    try {
      const raw = localStorage.getItem(LS_SMS_CONFIG);
      return raw ? JSON.parse(raw) : { provider: 'Twilio', apiKey: '', senderId: '' };
    } catch {
      return { provider: 'Twilio', apiKey: '', senderId: '' };
    }
  });
  const [smsSaved, setSmsSaved] = useState(false);
  const [showSmsKey, setShowSmsKey] = useState(false);

  // ---- Copy feedback ----
  const { copiedId, copy } = useCopyFeedback();

  // ---- Derived ----
  const jekoConfigured = jekoKey.length > 0 && jekoStoreId.length > 0;
  const smsConfigured = smsConfig.apiKey.length > 0;

  // ---- Handlers ----
  async function handleSaveJeko() {
    const k = jekoFormKey.trim();
    const kid = jekoFormKeyId.trim();
    const s = jekoFormStore.trim();
    if (!k && !kid && !s) return;
    setJekoSaving(true);
    setJekoSaveError(null);
    try {
      // Persist secrets to Firestore via Cloud Function (server-side only)
      const { password: _pw, ...safeUser } = currentUser as any;
      await saveApiConfig({
        adminUserId: currentUser.id,
        adminUserData: safeUser,
        jekoApiKey: k || undefined,
        jekoApiKeyId: kid || undefined,
        jekoStoreId: s || undefined,
        jekoEnv: jekoFormEnv,
      });
      // Also keep localStorage for UI display (non-secret values)
      localStorage.setItem(LS_JEKO_STORE, s);
      localStorage.setItem(LS_JEKO_ENV, jekoFormEnv);
      // Update display state (we show masked values from localStorage only)
      setJekoKey(k);
      setJekoStoreId(s);
      setJekoEnv(jekoFormEnv);
      setJekoSaved(true);
      setJekoFormOpen(false);
      setJekoFormKey('');
      setJekoFormKeyId('');
      setJekoFormStore('');
      setTimeout(() => setJekoSaved(false), 3000);
    } catch (err: any) {
      setJekoSaveError(err?.message ?? 'Erreur lors de la sauvegarde');
    } finally {
      setJekoSaving(false);
    }
  }

  function handleSaveSms() {
    localStorage.setItem(LS_SMS_CONFIG, JSON.stringify(smsConfig));
    setSmsSaved(true);
    setTimeout(() => setSmsSaved(false), 3000);
  }

  function mask(value: string, show: boolean): string {
    if (!value) return '(non défini)';
    if (show) return value;
    return '•'.repeat(Math.min(value.length, 16));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* 1. Statut des services                                              */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard>
        <div>
          <h2 className="text-base font-bold text-gray-900">Statut des services</h2>
          <p className="text-xs text-gray-400 mt-0.5">Vue d'ensemble des intégrations actives</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Firebase */}
          <div className="flex flex-col gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="text-xs font-bold text-gray-800">Firebase</span>
            </div>
            <StatusBadge ok labelOk="Configuré" labelKo="Non configuré" />
          </div>

          {/* Jèko */}
          <div className="flex flex-col gap-2 bg-purple-50 border border-purple-100 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-purple-600 shrink-0" />
              <span className="text-xs font-bold text-gray-800">Jèko Paiements</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-2.5 py-0.5">
              <CheckCircle size={11} /> Clés dans Cloud Functions ✓
            </span>
          </div>

          {/* SMS */}
          <div className="flex flex-col gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-blue-600 shrink-0" />
              <span className="text-xs font-bold text-gray-800">SMS Provider</span>
            </div>
            <StatusBadge ok={smsConfigured} labelOk="Configuré" labelKo="Non configuré" />
          </div>

          {/* Notifications */}
          <div className="flex flex-col gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-green-600 shrink-0" />
              <span className="text-xs font-bold text-gray-800">Notifications</span>
            </div>
            <StatusBadge ok labelOk="Firebase FCM" labelKo="Non configuré" />
          </div>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Configuration Jèko                                               */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">💳 Jèko — Paiement Mobile Money</h2>
            <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
              Les clés API Jèko sont stockées dans Firebase Cloud Functions pour la sécurité.
              Ne jamais mettre les clés dans le frontend.
            </p>
          </div>
          {jekoSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 shrink-0">
              <Check size={11} /> Enregistré
            </span>
          )}
        </div>

        {/* Formulaire de configuration Jèko */}
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <CheckCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Les clés sont sauvegardées de manière sécurisée dans <code className="font-mono bg-blue-100 px-1 rounded">platform/secrets</code> (serveur uniquement). Jamais exposées au navigateur.
            </p>
          </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">JEKO_API_KEY</label>
                <input
                  type="password"
                  value={jekoFormKey}
                  onChange={e => setJekoFormKey(e.target.value)}
                  placeholder="Entrez la clé API Jèko"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">JEKO_API_KEY_ID</label>
                <input
                  type="password"
                  value={jekoFormKeyId}
                  onChange={e => setJekoFormKeyId(e.target.value)}
                  placeholder="Entrez le Key ID Jèko"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">JEKO_STORE_ID</label>
                <input
                  type="password"
                  value={jekoFormStore}
                  onChange={e => setJekoFormStore(e.target.value)}
                  placeholder="Entrez votre Store ID"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Environnement</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setJekoFormEnv('sandbox')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition ${jekoFormEnv === 'sandbox' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                  >
                    Sandbox (Test)
                  </button>
                  <button
                    type="button"
                    onClick={() => setJekoFormEnv('production')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition ${jekoFormEnv === 'production' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                  >
                    Production
                  </button>
                </div>
              </div>

              {jekoSaveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{jekoSaveError}</p>
                </div>
              )}

          <button
            onClick={handleSaveJeko}
            disabled={(!jekoFormKey.trim() && !jekoFormStore.trim() && !jekoFormKeyId.trim()) || jekoSaving}
            className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-3 rounded-xl transition-all"
          >
            <Check size={14} /> {jekoSaving ? 'Sauvegarde en cours...' : 'Enregistrer (sécurisé)'}
          </button>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Configuration SMS                                                */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">📱 SMS — Notifications clients</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Envoi de SMS pour confirmations de missions et rappels
            </p>
          </div>
          <StatusBadge ok={smsConfigured} labelOk="Configuré" labelKo="Non configuré" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Provider */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Provider</label>
            <select
              value={smsConfig.provider}
              onChange={e => setSmsConfig(prev => ({ ...prev, provider: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              {SMS_PROVIDERS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Sender ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sender ID</label>
            <input
              type="text"
              value={smsConfig.senderId}
              onChange={e => setSmsConfig(prev => ({ ...prev, senderId: e.target.value }))}
              placeholder="ex: SERVI+"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>

          {/* API Key */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <input
                type={showSmsKey ? 'text' : 'password'}
                value={smsConfig.apiKey}
                onChange={e => setSmsConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Entrez votre clé API"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
              <button
                onClick={() => setShowSmsKey(v => !v)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                title={showSmsKey ? 'Masquer' : 'Afficher'}
              >
                {showSmsKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveSms}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Check size={14} /> Enregistrer
          </button>
          {smsSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <Check size={11} /> Enregistré
            </span>
          )}
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Variables d'environnement frontend                               */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard>
        <div>
          <h2 className="text-base font-bold text-gray-900">Variables d'environnement frontend</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Variables <code className="font-mono bg-gray-100 px-1 rounded text-gray-600">VITE_*</code> lues
            depuis <code className="font-mono bg-gray-100 px-1 rounded text-gray-600">import.meta.env</code>
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Variable</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5">Valeur</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {VITE_VARS.map(varName => {
                const val = (import.meta.env as Record<string, string | undefined>)[varName];
                const defined = val !== undefined && val !== '';
                return (
                  <tr key={varName} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {varName}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400 whitespace-nowrap">
                      {defined ? '•••••••••••' : '(non défini)'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {defined ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                          <CheckCircle size={13} /> ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                          <XCircle size={13} /> ✗
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
          <ExternalLink size={13} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Pour modifier ces variables, éditez le fichier{' '}
            <code className="font-mono bg-blue-100 px-1 rounded">.env</code>{' '}
            à la racine du projet, puis relancez le serveur de développement.
          </p>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Déploiement Cloud Functions                                      */}
      {/* ------------------------------------------------------------------ */}
      <SectionCard>
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Server size={16} className="text-gray-500" />
            Déploiement Cloud Functions
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Instructions étape par étape pour déployer les fonctions Firebase
          </p>
        </div>

        <ol className="space-y-3">
          {DEPLOY_COMMANDS.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-800 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold text-gray-600">{item.label}</span>
              </div>
              <CodeLine cmd={item.cmd} id={item.id} copiedId={copiedId} copy={copy} />
            </li>
          ))}
        </ol>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Les secrets configurés via <code className="font-mono bg-amber-100 px-1 rounded">functions:config:set</code>{' '}
            sont accessibles dans les Cloud Functions via{' '}
            <code className="font-mono bg-amber-100 px-1 rounded">functions.config().jeko.api_key</code>.
            Ils ne sont jamais exposés au client.
          </p>
        </div>
      </SectionCard>

    </div>
  );
};

export default AdminIntegrationsPanel;
