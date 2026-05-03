import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { dashboardCardAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CARD_TYPES = [
  'balance_trend',
  'cash_flow',
  'expenses_structure',
  'budget_overview',
  'goal_progress',
  'last_records',
  'account_summary',
  'net_worth',
];

export default function DashboardCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    card_type: 'balance_trend',
    card_title: '',
    card_size: 'medium',
  });

  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await dashboardCardAPI.list();
      setCards(response.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        card_type: formData.card_type,
        card_title: formData.card_title || null,
        card_size: formData.card_size,
        card_position: cards.length,
        is_enabled: true,
      };
      await dashboardCardAPI.create(payload);
      setFormData({ card_type: 'balance_trend', card_title: '', card_size: 'medium' });
      await fetchCards();
    } catch (err) {
      setError(err?.message || 'Failed to create card');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEnabled = async (card) => {
    try {
      await dashboardCardAPI.update(card.card_config_id, { is_enabled: !card.is_enabled });
      await fetchCards();
    } catch (err) {
      setError(err?.message || 'Failed to update card status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dashboard card?')) return;

    try {
      await dashboardCardAPI.delete(id);
      await fetchCards();
    } catch (err) {
      setError(err?.message || 'Failed to delete card');
    }
  };

  const moveCard = async (index, direction) => {
    const newCards = [...cards];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCards.length) return;

    [newCards[index], newCards[targetIndex]] = [newCards[targetIndex], newCards[index]];

    const items = newCards.map((card, idx) => ({
      id: card.card_config_id,
      position: idx,
    }));

    try {
      await dashboardCardAPI.reorder({ items });
      setCards(newCards.map((c, idx) => ({ ...c, card_position: idx })));
    } catch (err) {
      setError(err?.message || 'Failed to reorder cards');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-24 md:pb-0">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 md:rounded-b-2xl">
        <h1 className="text-2xl font-bold">Dashboard Cards</h1>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="card-lg space-y-4">
          <h2 className="font-semibold text-gray-900">Add New Card</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={formData.card_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, card_type: e.target.value }))}
              className="input"
            >
              {CARD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={formData.card_title}
              onChange={(e) => setFormData((prev) => ({ ...prev, card_title: e.target.value }))}
              className="input"
              placeholder="Custom title (optional)"
            />

            <select
              value={formData.card_size}
              onChange={(e) => setFormData((prev) => ({ ...prev, card_size: e.target.value }))}
              className="input"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary">
            <Plus size={16} className="inline mr-2" />
            {submitting ? 'Adding...' : 'Add Card'}
          </button>
        </form>

        <div className="space-y-3">
          {cards.length > 0 ? (
            cards
              .slice()
              .sort((a, b) => a.card_position - b.card_position)
              .map((card, index) => (
                <div key={card.card_config_id} className="card-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{card.card_title || card.card_type}</p>
                    <p className="text-sm text-gray-500">
                      Type: {card.card_type} • Size: {card.card_size} • Position: {card.card_position}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveCard(index, 'up')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Move up"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => moveCard(index, 'down')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Move down"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      onClick={() => toggleEnabled(card)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        card.is_enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {card.is_enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => handleDelete(card.card_config_id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <div className="card-lg text-center py-10 text-gray-500">No dashboard cards configured yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
