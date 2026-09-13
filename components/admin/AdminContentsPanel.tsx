import React, { useState } from 'react';
import { AppConfig, FlashAnnouncement, TrainingItem } from '../../services/configService';
import {
  Plus, Trash2, Edit3, X, Check, Megaphone, BookOpen, MessageSquare,
  ToggleLeft, ToggleRight, Video, ChevronRight,
} from 'lucide-react';

interface AdminContentsPanelProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
}

type Tab = 'announcements' | 'academy' | 'welcome';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Date.now().toString() + Math.random().toString(36).slice(2);

const shortenUrl = (url: string, max = 40) =>
  url.length > max ? url.slice(0, max) + '…' : url;

// ─── Sub-types for forms ──────────────────────────────────────────────────────

interface AnnouncementForm {
  text: string;
  type: 'promo' | 'flash' | 'info';
  target: 'ALL' | 'CLIENT' | 'PROVIDER';
  active: boolean;
}

const EMPTY_ANNOUNCEMENT: AnnouncementForm = { text: '', type: 'info', target: 'ALL', active: true };

interface TrainingForm {
  title: string;
  category: string;
  type: 'video' | 'test' | 'image';
  url: string;
  target: 'CLIENT' | 'PROVIDER';
  description: string;
}

const EMPTY_TRAINING: TrainingForm = {
  title: '',
  category: '',
  type: 'video',
  url: '',
  target: 'PROVIDER',
  description: '',
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

const ANNOUNCEMENT_TYPE_STYLES: Record<FlashAnnouncement['type'], string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  flash: 'bg-orange-100 text-orange-700 border-orange-200',
  promo: 'bg-green-100 text-green-700 border-green-200',
};

const ANNOUNCEMENT_TYPE_LABELS: Record<FlashAnnouncement['type'], string> = {
  info: 'Info',
  flash: 'Flash',
  promo: 'Promo',
};

// ─── Reusable Toggle ──────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center gap-2 group"
    aria-pressed={checked}
  >
    {checked ? (
      <ToggleRight size={22} className="text-green-600 transition-colors" />
    ) : (
      <ToggleLeft size={22} className="text-gray-300 transition-colors" />
    )}
    {label && (
      <span className={`text-xs font-semibold transition-colors ${checked ? 'text-green-700' : 'text-gray-400'}`}>
        {label}
      </span>
    )}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminContentsPanel: React.FC<AdminContentsPanelProps> = ({ config, onSaveConfig }) => {
  const [activeTab, setActiveTab] = useState<Tab>('announcements');

  // ── Announcements state ──
  const [announcements, setAnnouncements] = useState<FlashAnnouncement[]>(
    config.flashAnnouncements ?? []
  );
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementForm>(EMPTY_ANNOUNCEMENT);

  // ── Training state ──
  const [trainingItems, setTrainingItems] = useState<TrainingItem[]>(
    config.trainingContent ?? []
  );
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [trainingForm, setTrainingForm] = useState<TrainingForm>(EMPTY_TRAINING);

  // ── Welcome state ──
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // ─── Announcement handlers ───────────────────────────────────────────────────

  const openAddAnnouncement = () => {
    setEditingAnnouncementId(null);
    setAnnouncementForm(EMPTY_ANNOUNCEMENT);
    setShowAnnouncementForm(true);
  };

  const openEditAnnouncement = (a: FlashAnnouncement) => {
    setEditingAnnouncementId(a.id);
    setAnnouncementForm({ text: a.text, type: a.type, target: a.target, active: a.active });
    setShowAnnouncementForm(true);
  };

  const cancelAnnouncementForm = () => {
    setShowAnnouncementForm(false);
    setEditingAnnouncementId(null);
    setAnnouncementForm(EMPTY_ANNOUNCEMENT);
  };

  const saveAnnouncement = () => {
    if (!announcementForm.text.trim()) return;
    const item: FlashAnnouncement = {
      id: editingAnnouncementId ?? genId(),
      text: announcementForm.text,
      type: announcementForm.type,
      target: announcementForm.target,
      active: announcementForm.active,
    };
    const updated = editingAnnouncementId
      ? announcements.map(a => a.id === editingAnnouncementId ? item : a)
      : [...announcements, item];
    setAnnouncements(updated);
    onSaveConfig({ ...config, flashAnnouncements: updated });
    cancelAnnouncementForm();
  };

  const deleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    onSaveConfig({ ...config, flashAnnouncements: updated });
  };

  const toggleAnnouncementActive = (id: string) => {
    const updated = announcements.map(a =>
      a.id === id ? { ...a, active: !a.active } : a
    );
    setAnnouncements(updated);
    onSaveConfig({ ...config, flashAnnouncements: updated });
  };

  // ─── Training handlers ───────────────────────────────────────────────────────

  const openAddTraining = () => {
    setEditingTrainingId(null);
    setTrainingForm(EMPTY_TRAINING);
    setShowTrainingForm(true);
  };

  const openEditTraining = (t: TrainingItem) => {
    setEditingTrainingId(t.id);
    setTrainingForm({
      title: t.title,
      category: t.category,
      type: t.type,
      url: t.url ?? '',
      target: t.target,
      description: t.description,
    });
    setShowTrainingForm(true);
  };

  const cancelTrainingForm = () => {
    setShowTrainingForm(false);
    setEditingTrainingId(null);
    setTrainingForm(EMPTY_TRAINING);
  };

  const saveTraining = () => {
    if (!trainingForm.title.trim()) return;
    const item: TrainingItem = {
      id: editingTrainingId ?? genId(),
      title: trainingForm.title,
      category: trainingForm.category,
      type: trainingForm.type,
      url: trainingForm.url || undefined,
      target: trainingForm.target,
      description: trainingForm.description,
    };
    const updated = editingTrainingId
      ? trainingItems.map(t => (t.id === editingTrainingId ? item : t))
      : [...trainingItems, item];
    setTrainingItems(updated);
    onSaveConfig({ ...config, trainingContent: updated });
    cancelTrainingForm();
  };

  const deleteTraining = (id: string) => {
    const updated = trainingItems.filter(t => t.id !== id);
    setTrainingItems(updated);
    onSaveConfig({ ...config, trainingContent: updated });
  };

  // ─── Welcome handler ─────────────────────────────────────────────────────────

  const saveWelcome = () => {
    // welcomeMessage and maintenanceMode stored separately (not in AppConfig type)
    localStorage.setItem('admin_welcome_message', welcomeMessage);
    localStorage.setItem('admin_maintenance_mode', maintenanceMode ? '1' : '0');
  };

  // ─── Tab definitions ─────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'announcements',
      label: 'Annonces Flash',
      icon: <Megaphone size={14} />,
      count: announcements.length,
    },
    {
      id: 'academy',
      label: 'Académie',
      icon: <BookOpen size={14} />,
      count: trainingItems.length,
    },
    {
      id: 'welcome',
      label: "Message d'accueil",
      icon: <MessageSquare size={14} />,
    },
  ];

  // ─── Shared input style ───────────────────────────────────────────────────────

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white transition-shadow';

  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      {/* Panel header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">Gestion des Contenus</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Annonces, formations et message d'accueil de l'application
        </p>
      </div>

      {/* Tabs – pill style */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Annonces Flash ───────────────────────────────────────────── */}
      {activeTab === 'announcements' && (
        <div className="space-y-3">
          {/* Add button */}
          <div className="flex justify-end">
            {!showAnnouncementForm && (
              <button
                onClick={openAddAnnouncement}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
              >
                <Plus size={14} /> Nouvelle annonce
              </button>
            )}
          </div>

          {/* List */}
          {announcements.length === 0 && !showAnnouncementForm ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <Megaphone size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-semibold mb-3">Aucune annonce créée</p>
              <button
                onClick={openAddAnnouncement}
                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                <Plus size={14} /> Ajouter une annonce
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.map(a => (
                <div
                  key={a.id}
                  className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 border transition-all cursor-pointer hover:border-gray-200 ${
                    a.active ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/50 border-gray-100 opacity-60'
                  }`}
                  onClick={() => openEditAnnouncement(a)}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`mt-0.5 shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        ANNOUNCEMENT_TYPE_STYLES[a.type]
                      }`}
                    >
                      {ANNOUNCEMENT_TYPE_LABELS[a.type]}
                    </span>
                    <p className="text-sm text-gray-800 leading-snug line-clamp-2 flex-1">
                      {a.text}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <Toggle
                      checked={a.active}
                      onChange={() => toggleAnnouncementActive(a.id)}
                    />
                    <button
                      onClick={() => openEditAnnouncement(a)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Announcement Form */}
          {showAnnouncementForm && (
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4">
              <h3 className="font-bold text-gray-800 text-sm">
                {editingAnnouncementId ? "Modifier l'annonce" : 'Nouvelle annonce'}
              </h3>

              {/* Text */}
              <div>
                <label className={labelCls}>
                  Texte de l'annonce <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={announcementForm.text}
                  onChange={e => setAnnouncementForm({ ...announcementForm, text: e.target.value })}
                  placeholder="Ex : Nouvelle fonctionnalité disponible dès maintenant…"
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>

              {/* Type selector */}
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(['info', 'flash', 'promo'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAnnouncementForm({ ...announcementForm, type: t })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        ANNOUNCEMENT_TYPE_STYLES[t]
                      } ${
                        announcementForm.type === t
                          ? 'ring-2 ring-offset-1 ring-current scale-105'
                          : 'opacity-60 hover:opacity-90'
                      }`}
                    >
                      {ANNOUNCEMENT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <Toggle
                  checked={announcementForm.active}
                  onChange={v => setAnnouncementForm({ ...announcementForm, active: v })}
                  label={announcementForm.active ? 'Active' : 'Inactive'}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveAnnouncement}
                  disabled={!announcementForm.text.trim()}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2 rounded-xl transition-all"
                >
                  <Check size={14} /> Enregistrer
                </button>
                <button
                  type="button"
                  onClick={cancelAnnouncementForm}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 transition-all"
                >
                  <X size={14} /> Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Académie & Formations ────────────────────────────────────── */}
      {activeTab === 'academy' && (
        <div className="space-y-3">
          {/* Add button */}
          <div className="flex justify-end">
            {!showTrainingForm && (
              <button
                onClick={openAddTraining}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
              >
                <Plus size={14} /> Ajouter une formation
              </button>
            )}
          </div>

          {/* Grid */}
          {trainingItems.length === 0 && !showTrainingForm ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm font-semibold mb-3">Aucune formation ajoutée</p>
              <button
                onClick={openAddTraining}
                className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                <Plus size={14} /> Ajouter une formation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trainingItems.map(t => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                    <span className="text-4xl select-none">{t.type === 'video' ? '🎬' : t.type === 'test' ? '📝' : '🖼️'}</span>
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                      {t.type}
                    </span>
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${t.target === 'PROVIDER' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                      {t.target === 'PROVIDER' ? 'Prestataire' : 'Client'}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{t.title}</p>
                        {t.category && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                            {t.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditTraining(t)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => deleteTraining(t.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {t.url && (
                      <div className="mt-2 flex items-center gap-1.5 text-gray-400">
                        <Video size={11} className="shrink-0" />
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-500 hover:underline truncate"
                          title={t.url}
                          onClick={e => e.stopPropagation()}
                        >
                          {shortenUrl(t.url)}
                        </a>
                        <ChevronRight size={11} className="text-blue-400 shrink-0" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Training Form */}
          {showTrainingForm && (
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4">
              <h3 className="font-bold text-gray-800 text-sm">
                {editingTrainingId ? 'Modifier la formation' : 'Nouvelle formation'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    Titre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={trainingForm.title}
                    onChange={e => setTrainingForm({ ...trainingForm, title: e.target.value })}
                    placeholder="Ex : Maîtriser le service client"
                    className={inputCls}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={labelCls}>Catégorie</label>
                  <input
                    type="text"
                    value={trainingForm.category}
                    onChange={e => setTrainingForm({ ...trainingForm, category: e.target.value })}
                    placeholder="Ex : Communication"
                    className={inputCls}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className={labelCls}>Type</label>
                  <select value={trainingForm.type} onChange={e => setTrainingForm({ ...trainingForm, type: e.target.value as 'video'|'test'|'image' })} className={inputCls}>
                    <option value="video">Vidéo</option>
                    <option value="test">Quiz/Test</option>
                    <option value="image">Image</option>
                  </select>
                </div>

                {/* Target */}
                <div>
                  <label className={labelCls}>Audience</label>
                  <select value={trainingForm.target} onChange={e => setTrainingForm({ ...trainingForm, target: e.target.value as 'CLIENT'|'PROVIDER' })} className={inputCls}>
                    <option value="PROVIDER">Prestataires</option>
                    <option value="CLIENT">Clients</option>
                  </select>
                </div>

                {/* URL */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>URL (vidéo / lien)</label>
                  <input
                    type="url"
                    value={trainingForm.url}
                    onChange={e => setTrainingForm({ ...trainingForm, url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=…"
                    className={inputCls}
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea
                    value={trainingForm.description}
                    onChange={e => setTrainingForm({ ...trainingForm, description: e.target.value })}
                    placeholder="Brève description de la formation…"
                    rows={3}
                    className={inputCls + ' resize-none'}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveTraining}
                  disabled={!trainingForm.title.trim()}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2 rounded-xl transition-all"
                >
                  <Check size={14} /> Enregistrer
                </button>
                <button
                  type="button"
                  onClick={cancelTrainingForm}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 transition-all"
                >
                  <X size={14} /> Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Message d'accueil ─────────────────────────────────────────── */}
      {activeTab === 'welcome' && (
        <div className="space-y-4">
          {/* Welcome message */}
          <div>
            <label className={labelCls}>Message d'accueil de l'application</label>
            <textarea
              value={welcomeMessage}
              onChange={e => setWelcomeMessage(e.target.value)}
              placeholder="Ex : Bienvenue sur Servi+ ! Trouvez les meilleurs prestataires près de chez vous."
              rows={6}
              className={inputCls + ' resize-none'}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Ce message est affiché sur l'écran d'accueil de l'application mobile.
            </p>
          </div>

          {/* Maintenance mode */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4">
            <div>
              <p className="text-sm font-bold text-gray-800">Mode maintenance</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Affiche un écran de maintenance aux utilisateurs
              </p>
            </div>
            <div className="flex items-center gap-3">
              {maintenanceMode && (
                <span className="text-[10px] font-black bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded-full animate-pulse">
                  MAINTENANCE
                </span>
              )}
              <Toggle
                checked={maintenanceMode}
                onChange={setMaintenanceMode}
                label={maintenanceMode ? 'Activé' : 'Désactivé'}
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={saveWelcome}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <Check size={14} /> Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContentsPanel;
