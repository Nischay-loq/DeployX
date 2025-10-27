import React, { useState, useEffect, useCallback } from 'react';
import './css/SnapshotManager.css';

const SnapshotManager = ({ 
  socket, 
  selectedAgent, 
  isConnected,
  showAlert = (msg) => alert(msg),
  showConfirm = (msg, title, onConfirm) => window.confirm(msg) && onConfirm(),
  showError = (msg) => alert(msg),
  showSuccess = (msg) => alert(msg)
}) => {
  const [snapshots, setSnapshots] = useState([]);
  const [batches, setBatches] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, single, batch
  const [isRollingBack, setIsRollingBack] = useState(new Set());
  const [notification, setNotification] = useState(null);

  // Show notification
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Clear all snapshots
  const handleClearSnapshots = useCallback(() => {
    showConfirm(
      'Are you sure you want to clear all snapshots? This action cannot be undone.',
      'Clear All Snapshots',
      () => {
        setSnapshots([]);
        setBatches({});
        showNotification('All snapshots cleared', 'success');
      }
    );
  }, [showConfirm, showNotification]);

  // Handle batch command completed - add snapshot to list
  useEffect(() => {
    if (!socket) return;

    const handleBatchCommandCompleted = (data) => {
      console.log('Batch command completed:', data);
      
      if (data.snapshot_id) {
        const snapshot = {
          id: data.snapshot_id,
          command: data.command,
          batch_id: data.batch_id,
          command_index: data.command_index,
          success: data.success,
          timestamp: Date.now(),
          output: data.output || '',
          error: data.error || null,
          agent_id: selectedAgent
        };

        setSnapshots(prev => [...prev, snapshot]);

        // Update batch tracking
        if (data.batch_id) {
          setBatches(prev => ({
            ...prev,
            [data.batch_id]: [
              ...(prev[data.batch_id] || []),
              data.snapshot_id
            ]
          }));
        }

        showNotification(
          `Snapshot created: ${data.command.substring(0, 40)}${data.command.length > 40 ? '...' : ''}`,
          'success'
        );
      }
    };

    const handleRollbackCompleted = (data) => {
      console.log('Rollback completed:', data);
      setIsRollingBack(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.snapshot_id);
        return newSet;
      });

      if (data.success) {
        showNotification(`Rollback successful: ${data.snapshot_id}`, 'success');
        // Remove the snapshot after successful rollback
        setSnapshots(prev => prev.filter(s => s.id !== data.snapshot_id));
      } else {
        showNotification(`Rollback failed: ${data.error || 'Unknown error'}`, 'error');
      }
    };

    const handleBatchRollbackCompleted = (data) => {
      console.log('Batch rollback completed:', data);
      
      // Remove rolling back status for all snapshots in the batch
      if (data.batch_id && batches[data.batch_id]) {
        setIsRollingBack(prev => {
          const newSet = new Set(prev);
          batches[data.batch_id].forEach(snapshotId => newSet.delete(snapshotId));
          return newSet;
        });
      }

      if (data.success) {
        showNotification(`Batch rollback successful: ${data.batch_id}`, 'success');
        // Remove all snapshots in the batch
        if (data.batch_id && batches[data.batch_id]) {
          setSnapshots(prev => 
            prev.filter(s => !batches[data.batch_id].includes(s.id))
          );
          setBatches(prev => {
            const newBatches = { ...prev };
            delete newBatches[data.batch_id];
            return newBatches;
          });
        }
      } else {
        showNotification(`Batch rollback failed: ${data.error || 'Unknown error'}`, 'error');
      }
    };

    socket.on('batch_command_completed', handleBatchCommandCompleted);
    socket.on('rollback_completed', handleRollbackCompleted);
    socket.on('batch_rollback_completed', handleBatchRollbackCompleted);

    return () => {
      socket.off('batch_command_completed', handleBatchCommandCompleted);
      socket.off('rollback_completed', handleRollbackCompleted);
      socket.off('batch_rollback_completed', handleBatchRollbackCompleted);
    };
  }, [socket, selectedAgent, batches, showNotification]);

  // Rollback single snapshot
  const handleRollbackSnapshot = useCallback((snapshot) => {
    if (!socket || !socket.connected) {
      showNotification('Not connected to server', 'error');
      return;
    }

    showConfirm(
      `Are you sure you want to rollback this command?\n\nCommand: ${snapshot.command}\n\nThis will undo all changes made by this command.`,
      'Rollback Command',
      () => {
        setIsRollingBack(prev => new Set([...prev, snapshot.id]));
        
        console.log('Requesting rollback for snapshot:', snapshot.id);
        socket.emit('rollback_command', {
          agent_id: snapshot.agent_id || selectedAgent,
          snapshot_id: snapshot.id
        });

        showNotification(`Rolling back: ${snapshot.command.substring(0, 40)}...`, 'info');
      }
    );
  }, [socket, selectedAgent, showNotification, showConfirm]);

  // Rollback entire batch
  const handleRollbackBatch = useCallback((batchId) => {
    if (!socket || !socket.connected) {
      showNotification('Not connected to server', 'error');
      return;
    }

    const batchSnapshots = snapshots.filter(s => s.batch_id === batchId);
    const commandCount = batchSnapshots.length;

    showConfirm(
      `Are you sure you want to rollback this entire batch?\n\nBatch ID: ${batchId}\nCommands: ${commandCount}\n\nThis will undo all ${commandCount} commands in reverse order.`,
      'Rollback Batch',
      () => {
        // Mark all batch snapshots as rolling back
        setIsRollingBack(prev => {
          const newSet = new Set(prev);
          batchSnapshots.forEach(s => newSet.add(s.id));
          return newSet;
        });

        console.log('Requesting batch rollback:', batchId);
      socket.emit('rollback_batch', {
        agent_id: selectedAgent,
        batch_id: batchId
      });

      showNotification(`Rolling back batch (${commandCount} commands)...`, 'info');
      }
    );
  }, [socket, selectedAgent, snapshots, showNotification, showConfirm]);

  // Get time ago string
  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter snapshots
  const filteredSnapshots = snapshots.filter(snapshot => {
    if (filterType === 'single') return !snapshot.batch_id;
    if (filterType === 'batch') return snapshot.batch_id;
    return true;
  });

  // Group snapshots by batch
  const batchGroups = {};
  filteredSnapshots.forEach(snapshot => {
    if (snapshot.batch_id) {
      if (!batchGroups[snapshot.batch_id]) {
        batchGroups[snapshot.batch_id] = [];
      }
      batchGroups[snapshot.batch_id].push(snapshot);
    }
  });

  // Sort batch groups by command index
  Object.keys(batchGroups).forEach(batchId => {
    batchGroups[batchId].sort((a, b) => (a.command_index || 0) - (b.command_index || 0));
  });

  const singleSnapshots = filteredSnapshots.filter(s => !s.batch_id);

  return (
    <div className={`snapshot-manager ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {notification && (
        <div className={`snapshot-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="snapshot-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="snapshot-title">
          <span className="snapshot-icon">📸</span>
          <span>Snapshots</span>
          <span className="snapshot-count">{snapshots.length}</span>
        </div>
        <button className="toggle-btn">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="snapshot-content">
          <div className="snapshot-controls">
            <div className="filter-buttons">
              <button
                className={filterType === 'all' ? 'active' : ''}
                onClick={() => setFilterType('all')}
              >
                All ({snapshots.length})
              </button>
              <button
                className={filterType === 'single' ? 'active' : ''}
                onClick={() => setFilterType('single')}
              >
                Single ({singleSnapshots.length})
              </button>
              <button
                className={filterType === 'batch' ? 'active' : ''}
                onClick={() => setFilterType('batch')}
              >
                Batches ({Object.keys(batchGroups).length})
              </button>
            </div>
            {snapshots.length > 0 && (
              <button className="clear-all-btn" onClick={handleClearSnapshots}>
                Clear All
              </button>
            )}
          </div>

          <div className="snapshot-list">
            {filteredSnapshots.length === 0 ? (
              <div className="empty-state">
                <p>No snapshots yet</p>
                <small>Execute commands with snapshots enabled to see them here</small>
              </div>
            ) : (
              <>
                {/* Batch Snapshots */}
                {Object.keys(batchGroups).map(batchId => (
                  <div key={batchId} className="batch-group">
                    <div className="batch-header">
                      <div className="batch-info">
                        <span className="batch-icon">📦</span>
                        <span className="batch-id">Batch: {batchId}</span>
                        <span className="batch-count">{batchGroups[batchId].length} commands</span>
                      </div>
                      <button
                        className="rollback-batch-btn"
                        onClick={() => handleRollbackBatch(batchId)}
                        disabled={!isConnected || batchGroups[batchId].some(s => isRollingBack.has(s.id))}
                      >
                        {batchGroups[batchId].some(s => isRollingBack.has(s.id)) ? '⟳ Rolling back...' : '↶ Rollback Batch'}
                      </button>
                    </div>
                    <div className="batch-snapshots">
                      {batchGroups[batchId].map(snapshot => (
                        <div key={snapshot.id} className={`snapshot-item ${snapshot.success ? 'success' : 'failed'}`}>
                          <div className="snapshot-header-row">
                            <span className="snapshot-index">#{snapshot.command_index + 1}</span>
                            <code className="snapshot-command">{snapshot.command}</code>
                            <span className={`status-badge ${snapshot.success ? 'success' : 'error'}`}>
                              {snapshot.success ? '✓' : '✗'}
                            </span>
                          </div>
                          <div className="snapshot-meta">
                            <span className="snapshot-id" title={snapshot.id}>{snapshot.id.substring(0, 12)}...</span>
                            <span className="snapshot-time">{getTimeAgo(snapshot.timestamp)}</span>
                            <button
                              className="rollback-btn-small"
                              onClick={() => handleRollbackSnapshot(snapshot)}
                              disabled={!isConnected || isRollingBack.has(snapshot.id)}
                              title="Rollback this command only"
                            >
                              {isRollingBack.has(snapshot.id) ? '⟳' : '↶'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Single Snapshots */}
                {singleSnapshots.map(snapshot => (
                  <div key={snapshot.id} className={`snapshot-item single ${snapshot.success ? 'success' : 'failed'}`}>
                    <div className="snapshot-header-row">
                      <code className="snapshot-command">{snapshot.command}</code>
                      <span className={`status-badge ${snapshot.success ? 'success' : 'error'}`}>
                        {snapshot.success ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="snapshot-meta">
                      <span className="snapshot-id" title={snapshot.id}>{snapshot.id.substring(0, 12)}...</span>
                      <span className="snapshot-time">{getTimeAgo(snapshot.timestamp)}</span>
                      <button
                        className="rollback-btn"
                        onClick={() => handleRollbackSnapshot(snapshot)}
                        disabled={!isConnected || isRollingBack.has(snapshot.id)}
                      >
                        {isRollingBack.has(snapshot.id) ? '⟳ Rolling back...' : '↶ Rollback'}
                      </button>
                    </div>
                    {snapshot.error && (
                      <div className="snapshot-error">
                        <small>Error: {snapshot.error}</small>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotManager;
