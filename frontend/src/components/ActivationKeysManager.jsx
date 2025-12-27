import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Filter,
  Search
} from 'lucide-react';
import activationService from '../services/activation.js';

export default function ActivationKeysManager() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [newKeyNotes, setNewKeyNotes] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    includeUsed: true,
    includeExpired: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showKey, setShowKey] = useState({});

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activationService.listKeys({
        include_used: filters.includeUsed,
        include_expired: filters.includeExpired
      });
      setKeys(response.keys || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch activation keys');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerateKey = async () => {
    try {
      setGenerating(true);
      setError(null);
      const response = await activationService.generateKey({
        notes: newKeyNotes || undefined,
        expiry_days: expiryDays
      });
      setSuccess(`Activation key generated: ${response.key}`);
      setNewKeyNotes('');
      setShowNotes(false);
      fetchKeys();
      
      // Auto-dismiss success after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.message || 'Failed to generate activation key');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      setError(null);
      await activationService.deleteKey(keyId);
      setSuccess('Activation key deleted successfully');
      setDeleteConfirm(null);
      fetchKeys();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete activation key');
    }
  };

  const copyToClipboard = async (key) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'N/A';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Less than 1h';
  };

  const getStatusBadge = (key) => {
    if (key.is_used) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Used
        </span>
      );
    }
    if (key.is_expired) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <CheckCircle className="w-3 h-3 mr-1" />
        Available
      </span>
    );
  };

  const filteredKeys = keys.filter(key => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      key.key.toLowerCase().includes(search) ||
      (key.notes && key.notes.toLowerCase().includes(search)) ||
      (key.used_by_agent_id && key.used_by_agent_id.toLowerCase().includes(search)) ||
      (key.used_by_machine_id && key.used_by_machine_id.toLowerCase().includes(search))
    );
  });

  const maskKey = (key) => {
    if (!key) return '';
    return key.substring(0, 4) + '-****-****-' + key.substring(key.length - 4);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-lg">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Activation Keys</h2>
            <p className="text-gray-400 text-sm">Manage agent activation keys</p>
          </div>
        </div>
        <button
          onClick={fetchKeys}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
          <span className="text-green-400 flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Generate New Key Section */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Generate New Activation Key</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Expiry Period (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 30)))}
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {showNotes && (
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={newKeyNotes}
                  onChange={(e) => setNewKeyNotes(e.target.value)}
                  placeholder="e.g., For Production Server #1"
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            <button
              onClick={() => setShowNotes(!showNotes)}
              className="px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {showNotes ? 'Hide Notes' : 'Add Notes'}
            </button>

            <button
              onClick={handleGenerateKey}
              disabled={generating}
              className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-cyan text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Generate Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keys, notes, or agent IDs..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 flex items-center space-x-2 border rounded-lg transition-colors ${
            showFilters ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
          <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includeUsed}
              onChange={(e) => setFilters({ ...filters, includeUsed: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700"
            />
            <span>Show Used Keys</span>
          </label>
          <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.includeExpired}
              onChange={(e) => setFilters({ ...filters, includeExpired: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-gray-700"
            />
            <span>Show Expired Keys</span>
          </label>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No activation keys found</p>
            <p className="text-gray-500 text-sm mt-1">Generate a new key to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Key</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Used By</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono text-white bg-gray-700/50 px-2 py-1 rounded">
                          {showKey[key.id] ? key.key : maskKey(key.key)}
                        </code>
                        <button
                          onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })}
                          className="text-gray-400 hover:text-white transition-colors"
                          title={showKey[key.id] ? 'Hide key' : 'Show key'}
                        >
                          {showKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedKey === key.key ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(key)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formatDate(key.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className={`text-sm ${key.is_expired ? 'text-red-400' : 'text-gray-300'}`}>
                          {getTimeRemaining(key.expires_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {key.used_by_agent_id ? (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Agent: {key.used_by_agent_id.substring(0, 12)}...</div>
                          <div className="text-xs text-gray-500">Machine: {key.used_by_machine_id?.substring(0, 12)}...</div>
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-[200px] truncate" title={key.notes || ''}>
                      {key.notes || <span className="text-gray-600">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {deleteConfirm === key.id ? (
                        <div className="flex items-center justify-end space-x-2">
                          <span className="text-xs text-gray-400">Delete?</span>
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(key.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{keys.length}</p>
              <p className="text-sm text-gray-400">Total Keys</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{keys.filter(k => !k.is_used && !k.is_expired).length}</p>
              <p className="text-sm text-gray-400">Available</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Check className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{keys.filter(k => k.is_used).length}</p>
              <p className="text-sm text-gray-400">Used</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{keys.filter(k => k.is_expired && !k.is_used).length}</p>
              <p className="text-sm text-gray-400">Expired</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
