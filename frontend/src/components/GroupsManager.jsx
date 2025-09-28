import { useState, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import groupsService from '../services/groups.js';
import devicesService from '../services/devices.js';
import authService from '../services/auth.js';
import GroupForm from './GroupForm.jsx';

export default function GroupsManager() {
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Load groups and devices on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Update selectedGroup when groups data changes
  useEffect(() => {
    if (selectedGroup && groups.length > 0) {
      const updatedGroup = groups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) {
        console.log(`🔄 Updating selected group: ${updatedGroup.group_name} (${updatedGroup.devices?.length || 0} devices)`);
        setSelectedGroup(updatedGroup);
      } else {
        console.log('⚠️ Selected group not found in updated groups list');
      }
    }
  }, [groups, selectedGroup?.id]);

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Load devices always (don't let groups error block devices)
      const devicesPromise = devicesService.fetchDevices();

      // Only fetch groups if logged in (avoids 401/CORS preflight issues when unauthenticated)
      const shouldFetchGroups = authService.isLoggedIn();
      const groupsPromise = shouldFetchGroups ? groupsService.fetchGroups(forceRefresh) : Promise.resolve([]);

      const results = await Promise.allSettled([groupsPromise, devicesPromise]);

      // groups result
      if (results[0].status === 'fulfilled') {
        const groupsData = results[0].value;
        console.log('📦 Loaded groups:', groupsData.length, 'groups');
        groupsData.forEach(group => {
          console.log(`   - ${group.group_name}: ${group.devices?.length || 0} devices`);
        });
        setGroups(groupsData);
      } else {
        // Log and set empty groups so UI still works
        console.warn('Failed to fetch groups:', results[0].reason);
        setGroups([]);
        // If the failure was due to auth, show a non-blocking message
        if (String(results[0].reason).toLowerCase().includes('unauthorized') || String(results[0].reason).toLowerCase().includes('not authenticated')) {
          setError('Not authenticated. Please log in to see your groups.');
        } else {
          setError('Failed to load groups: ' + results[0].reason);
        }
      }

      // devices result
      if (results[1].status === 'fulfilled') {
        console.log('Loaded devices:', results[1].value);
        setDevices(results[1].value || []);
      } else {
        console.warn('Failed to fetch devices:', results[1].reason);
        setDevices([]);
        setError('Failed to load devices: ' + results[1].reason);
      }

    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      await groupsService.createGroup(groupData);
      await loadData(true); // Force refresh data
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create group: ' + err.message);
    }
  };

  const handleUpdateGroup = async (groupData) => {
    try {
      await groupsService.updateGroup(editingGroup.id, groupData);
      await loadData(true); // Force refresh data
      setEditingGroup(null);
    } catch (err) {
      setError('Failed to update group: ' + err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    
    try {
      await groupsService.deleteGroup(groupId);
      await loadData(true); // Force refresh data
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (err) {
      setError('Failed to delete group: ' + err.message);
    }
  };

  const handleAssignDevice = async (groupId, deviceId) => {
    try {
      console.log(`🔄 Assigning device ${deviceId} to group ${groupId}`);
      await groupsService.assignDevice(groupId, deviceId);
      console.log('✅ Device assigned, refreshing data...');
      
      // Force refresh data
      await loadData(true);
      
      // Small delay to ensure state has updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Data refreshed');
    } catch (err) {
      console.error('❌ Failed to assign device:', err);
      setError('Failed to assign device: ' + err.message);
    }
  };

  const handleRemoveDevice = async (groupId, deviceId) => {
    try {
      console.log(`🔄 Removing device ${deviceId} from group ${groupId}`);
      await groupsService.removeDevice(groupId, deviceId);
      console.log('✅ Device removed, refreshing data...');
      
      // Force refresh data
      await loadData(true);
      
      // Small delay to ensure state has updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Data refreshed');
    } catch (err) {
      console.error('❌ Failed to remove device:', err);
      setError('Failed to remove device: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electricBlue"></div>
        <span className="ml-2 text-gray-400">Loading groups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-orange-400 text-2xl">●</span>
          <h2 className="text-xl font-bold">Device Groups</h2>
          <span className="text-sm text-gray-400">({groups.length} groups)</span>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-electricBlue/20 border border-electricBlue/50 rounded-lg text-electricBlue hover:bg-electricBlue/30 transition-all"
        >
          + Create Group
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingGroup) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyberBlue border border-electricBlue/30 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto">
            <GroupForm
              initialData={editingGroup}
              devices={devices}
              onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingGroup(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <div
            key={group.id}
            className="bg-black/60 border border-electricBlue/30 rounded-lg p-4 hover:border-electricBlue/50 transition-all cursor-pointer group"
            onClick={() => setSelectedGroup(group)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: group.color || '#6c63ff' }}
                ></div>
                <h3 className="font-semibold text-softWhite">{group.group_name}</h3>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingGroup(group);
                  }}
                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 hover:text-blue-200 transition-all"
                  title="Edit Group"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 hover:text-red-200 transition-all"
                  title="Delete Group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {group.description && (
              <p className="text-gray-400 text-sm mb-3">{group.description}</p>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Devices:</span>
              <span className="text-electricBlue font-medium">
                {group.devices?.length || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {groups.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Groups Yet</h3>
          <p className="text-gray-500 mb-4">Create your first device group to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-electricBlue/20 border border-electricBlue/50 rounded-lg text-electricBlue hover:bg-electricBlue/30 transition-all"
          >
            Create First Group
          </button>
        </div>
      )}

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-cyberBlue border border-electricBlue/30 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedGroup.color || '#6c63ff' }}
                ></div>
                <h3 className="text-xl font-bold text-softWhite">{selectedGroup.group_name}</h3>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-gray-400 hover:text-softWhite text-xl"
              >
                ✕
              </button>
            </div>

            {selectedGroup.description && (
              <p className="text-gray-400 mb-4">{selectedGroup.description}</p>
            )}

            <div className="space-y-4">
              <h4 className="font-semibold text-electricBlue">Devices in this group:</h4>
              
              {selectedGroup.devices && selectedGroup.devices.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroup.devices.map(device => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between bg-black/40 border border-gray-600/30 rounded-lg p-3"
                    >
                      <div>
                        <div className="font-medium text-softWhite">{device.device_name}</div>
                        <div className="text-sm text-gray-400">{device.ip_address} • {device.os}</div>
                        <div className="text-xs text-gray-500">
                          Status: <span className={device.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                            {device.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDevice(selectedGroup.id, device.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No devices in this group</p>
              )}

              {/* Available devices to add */}
              <div>
                <h4 className="font-semibold text-electricBlue mb-2">Available devices to add:</h4>
                <div className="max-h-40 overflow-auto space-y-1">
                  {devices
                    .filter(device => !selectedGroup.devices?.some(d => d.id === device.id))
                    .map(device => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between bg-black/20 border border-gray-700/30 rounded p-2"
                      >
                        <div>
                          <div className="text-sm font-medium text-softWhite">{device.device_name}</div>
                          <div className="text-xs text-gray-400">{device.ip_address}</div>
                        </div>
                        <button
                          onClick={() => handleAssignDevice(selectedGroup.id, device.id)}
                          className="text-electricBlue hover:text-blue-300 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}