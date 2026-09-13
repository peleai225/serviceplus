import React, { useState } from 'react';
import { AppConfig, PlatformOffer } from '../../services/configService';
import { ABIDJAN_ZONES } from '../../constants';
import { Plus, Trash2, Edit3, X, Check } from 'lucide-react';

interface AdminOffersPanelProps {
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
}

const BADGE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Ambre', value: 'bg-amber-400 text-amber-900' },
  { label: 'Rouge', value: 'bg-red-400 text-red-900' },
  { label: 'Bleu', value: 'bg-blue-400 text-blue-900' },
  { label: 'Violet', value: 'bg-purple-400 text-purple-900' },
];

const GRADIENT_OPTIONS: { label: string; value: string; preview: string }[] = [
  { label: 'Vert', value: 'from-green-700/80 to-emerald-600/80', preview: 'from-green-700 to-emerald-600' },
  { label: 'Orange', value: 'from-orange-700/80 to-amber-600/80', preview: 'from-orange-700 to-amber-600' },
  { label: 'Bleu', value: 'from-blue-700/80 to-indigo-600/80', preview: 'from-blue-700 to-indigo-600' },
  { label: 'Violet', value: 'from-purple-700/80 to-violet-600/80', preview: 'from-purple-700 to-violet-600' },
];

const ALL_ZONES = ['ALL', ...ABIDJAN_ZONES];

interface OfferForm {
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  bgImage: string;
  zones: string[];
  cta: string;
}

const EMPTY_FORM: OfferForm = {
  emoji: '',
  title: '',
  subtitle: '',
  badge: '',
  badgeColor: 'bg-amber-400 text-amber-900',
  gradient: 'from-green-700/80 to-emerald-600/80',
  bgImage: '',
  zones: ['ALL'],
  cta: '',
};

const AdminOffersPanel: React.FC<AdminOffersPanelProps> = ({ config, onSaveConfig }) => {
  const [offers, setOffers] = useState<PlatformOffer[]>(config.platformOffers ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (offer: PlatformOffer) => {
    setEditingId(offer.id);
    setForm({
      emoji: offer.emoji,
      title: offer.title,
      subtitle: offer.subtitle,
      badge: offer.badge,
      badgeColor: offer.badgeColor,
      gradient: offer.gradient,
      bgImage: offer.bgImage,
      zones: offer.zones,
      cta: offer.cta,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const updated = offers.filter(o => o.id !== id);
    setOffers(updated);
    onSaveConfig({ ...config, platformOffers: updated });
  };

  const toggleZone = (zone: string) => {
    setForm(prev => {
      if (zone === 'ALL') return { ...prev, zones: ['ALL'] };
      const withoutAll = prev.zones.filter(z => z !== 'ALL');
      const exists = withoutAll.includes(zone);
      const updated = exists ? withoutAll.filter(z => z !== zone) : [...withoutAll, zone];
      return { ...prev, zones: updated.length === 0 ? ['ALL'] : updated };
    });
  };

  const handleSaveForm = () => {
    if (!form.title.trim()) return;
    let updated: PlatformOffer[];
    if (editingId) {
      updated = offers.map(o =>
        o.id === editingId ? { ...form, id: editingId } : o
      );
    } else {
      const newOffer: PlatformOffer = { ...form, id: `offer_${Date.now()}` };
      updated = [...offers, newOffer];
    }
    setOffers(updated);
    onSaveConfig({ ...config, platformOffers: updated });
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Offres Carousel Prestataires</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gérez les offres promotionnelles affichées dans l'application
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
        >
          <Plus size={14} /> Ajouter une offre
        </button>
      </div>

      {/* Offer List */}
      {offers.length === 0 && !showForm ? (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm font-semibold mb-3">Aucune offre créée</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Plus size={14} /> Ajouter une offre
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {offers.map(offer => (
            <div
              key={offer.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{offer.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{offer.title}</p>
                  <p className="text-xs text-gray-400 truncate">
                    Zones: {offer.zones.join(', ')}
                  </p>
                </div>
                {offer.badge && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${offer.badgeColor}`}>
                    {offer.badge}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={() => openEdit(offer)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4">
          <h3 className="font-bold text-gray-800 text-sm">
            {editingId ? "Modifier l'offre" : 'Nouvelle offre'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Emoji */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={e => setForm({ ...form, emoji: e.target.value })}
                placeholder="🛠️"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Titre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Offre Pro Ménage"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sous-titre</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={e => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Accès prioritaire aux missions"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            {/* Badge label */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Badge label</label>
              <input
                type="text"
                value={form.badge}
                onChange={e => setForm({ ...form, badge: e.target.value })}
                placeholder="NOUVEAU"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            {/* CTA */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Texte bouton CTA</label>
              <input
                type="text"
                value={form.cta}
                onChange={e => setForm({ ...form, cta: e.target.value })}
                placeholder="Découvrir l'offre"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            {/* Background image */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Image de fond (fichier /public)
              </label>
              <input
                type="text"
                value={form.bgImage}
                onChange={e => setForm({ ...form, bgImage: e.target.value })}
                placeholder="/offer_pro.jpg"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>
          </div>

          {/* Badge Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Couleur du badge</label>
            <div className="flex flex-wrap gap-2">
              {BADGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, badgeColor: opt.value })}
                  className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-all ${opt.value} ${
                    form.badgeColor === opt.value ? 'border-gray-700 scale-105' : 'border-transparent opacity-70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Dégradé de fond</label>
            <div className="flex flex-wrap gap-3">
              {GRADIENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, gradient: opt.value })}
                  title={opt.label}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${opt.preview} border-2 transition-all ${
                    form.gradient === opt.value ? 'border-gray-700 scale-110 shadow-md' : 'border-white shadow-sm'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Zones */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Zones ciblées</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ZONES.map(zone => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => toggleZone(zone)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    form.zones.includes(zone)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                  }`}
                >
                  {zone === 'ALL' ? 'Toutes les zones' : zone}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={!form.title.trim()}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2 rounded-xl transition-all"
            >
              <Check size={14} /> Enregistrer
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 transition-all"
            >
              <X size={14} /> Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOffersPanel;
