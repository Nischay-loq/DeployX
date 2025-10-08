import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info', // 'info', 'warning', 'danger', 'success'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          borderColor: 'border-yellow-500',
          buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
        };
      case 'danger':
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          borderColor: 'border-red-500',
          buttonBg: 'bg-red-500 hover:bg-red-600',
        };
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          borderColor: 'border-green-500',
          buttonBg: 'bg-green-500 hover:bg-green-600',
        };
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          borderColor: 'border-blue-500',
          buttonBg: 'bg-blue-500 hover:bg-blue-600',
        };
    }
  };

  const { icon: Icon, iconColor, borderColor, buttonBg } = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`bg-gray-800 rounded-lg shadow-2xl border-2 ${borderColor} w-full max-w-md mx-4 transform transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${iconColor}`} />
            <h3 className="text-xl font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-gray-300 whitespace-pre-line">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${buttonBg} text-white rounded-lg transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
