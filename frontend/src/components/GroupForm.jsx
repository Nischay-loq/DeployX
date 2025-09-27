import { useState, useEffect } from 'react';

export default function GroupForm({ initialData, devices, onSubmit, onCancel }) {
  console.log('GroupForm received devices:', devices);
  console.log('Devices is array?', Array.isArray(devices));
  console.log('Devices length:', devices?.length);
  
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    color: '#6c63ff',
    device_ids: []
  });
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        group_name: initialData.group_name || '',
        description: initialData.description || '',
        color: initialData.color || '#6c63ff',
        device_ids: initialData.devices?.map(d => d.id) || []
      });
      setSelectedDevices(initialData.devices || []);
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddDevice = (device) => {
    if (!selectedDevices.some(d => d.id === device.id)) {
      setSelectedDevices(prev => [...prev, device]);
      setFormData(prev => ({
        ...prev,
        device_ids: [...prev.device_ids, device.id]
      }));
    }
  };

  const handleRemoveDevice = (device) => {
    setSelectedDevices(prev => prev.filter(d => d.id !== device.id));
    setFormData(prev => ({
      ...prev,
      device_ids: prev.device_ids.filter(id => id !== device.id)
    }));
  };

  const handleAddAllDevices = () => {
    if (!devices) return;
    
    const availableDevices = devices.filter(device => !selectedDevices.some(d => d.id === device.id));
    setSelectedDevices(prev => [...prev, ...availableDevices]);
    setFormData(prev => ({
      ...prev,
      device_ids: [...prev.device_ids, ...availableDevices.map(d => d.id)]
    }));
  };

  const handleRemoveAllDevices = () => {
    setSelectedDevices([]);
    setFormData(prev => ({
      ...prev,
      device_ids: []
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.group_name.trim()) {
      newErrors.group_name = 'Group name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const predefinedColors = [
    '#6c63ff', '#ff6b6b', '#4ecdc4', '#45b7d1', 
    '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-softWhite mb-4">
        {initialData ? 'Edit Group' : 'Create New Group'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Group Name *
          </label>
          <input
            type="text"
            name="group_name"
            value={formData.group_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-softWhite focus:border-electricBlue focus:outline-none"
            placeholder="Enter group name"
          />
          {errors.group_name && (
            <p className="text-red-400 text-xs mt-1">{errors.group_name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-softWhite focus:border-electricBlue focus:outline-none resize-none"
            placeholder="Enter group description (optional)"
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Group Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {predefinedColors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-full border-2 ${
                  formData.color === color ? 'border-electricBlue' : 'border-gray-600'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-8 h-8 rounded-full border-2 border-gray-600"
            />
          </div>
        </div>

        {/* Device Selection - Two Column Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Device Assignment
          </label>
          <div className="grid grid-cols-2 gap-6">
            {/* Available Devices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-400">
                  Available Devices
                </h4>
                <span className="text-xs text-gray-500 bg-gray-700/30 px-2 py-1 rounded">
                  {devices ? devices.filter(device => !selectedDevices.some(d => d.id === device.id)).length : 0}
                </span>
              </div>
              <div className="h-64 overflow-auto bg-black/20 border border-gray-600 rounded-lg p-3 space-y-2">
                {devices && devices.length > 0 ? (
                  devices
                    .filter(device => !selectedDevices.some(d => d.id === device.id))
                    .map(device => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-3 hover:bg-cyberBlue/20 rounded border border-gray-700/30 transition-all"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm font-medium text-softWhite truncate">{device.device_name}</div>
                          <div className="text-xs text-gray-400 truncate">{device.ip_address}</div>
                          <div className="text-xs text-gray-500 truncate">{device.os}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                            device.status === 'online' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {device.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddDevice(device)}
                            className="text-electricBlue hover:text-blue-300 text-sm px-3 py-1 bg-electricBlue/20 rounded hover:bg-electricBlue/30 transition-all whitespace-nowrap"
                          >
                            Add →
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center text-sm">No devices available</p>
                  </div>
                )}
                {devices && devices.filter(device => !selectedDevices.some(d => d.id === device.id)).length === 0 && devices.length > 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center text-sm">All devices are selected</p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Devices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-electricBlue">
                  Selected Devices
                </h4>
                <span className="text-xs text-electricBlue bg-electricBlue/20 px-2 py-1 rounded">
                  {selectedDevices.length}
                </span>
              </div>
              <div className="h-64 overflow-auto bg-black/20 border border-electricBlue/30 rounded-lg p-3 space-y-2">
                {selectedDevices.length > 0 ? (
                  selectedDevices.map(device => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-3 hover:bg-electricBlue/10 rounded border border-electricBlue/30 transition-all"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="text-sm font-medium text-softWhite truncate">{device.device_name}</div>
                        <div className="text-xs text-gray-400 truncate">{device.ip_address}</div>
                        <div className="text-xs text-gray-500 truncate">{device.os}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                          device.status === 'online' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {device.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDevice(device)}
                          className="text-red-400 hover:text-red-300 text-sm px-3 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition-all whitespace-nowrap"
                        >
                          ← Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center text-sm">No devices selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex justify-center gap-3 mt-4 pt-3 border-t border-gray-700/30">
            <button
              type="button"
              onClick={handleAddAllDevices}
              disabled={!devices || devices.filter(device => !selectedDevices.some(d => d.id === device.id)).length === 0}
              className="text-sm px-6 py-2 bg-electricBlue/20 text-electricBlue rounded hover:bg-electricBlue/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add All →
            </button>
            <button
              type="button"
              onClick={handleRemoveAllDevices}
              disabled={selectedDevices.length === 0}
              className="text-sm px-6 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Remove All
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-700/30">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-electricBlue/20 border border-electricBlue/50 rounded-lg text-electricBlue hover:bg-electricBlue/30 transition-all font-medium"
          >
            {initialData ? 'Update Group' : 'Create Group'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600/20 border border-gray-600/50 rounded-lg text-gray-400 hover:bg-gray-600/30 transition-all font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}