import React from 'react';
import { X } from 'lucide-react';

export default function DashboardCard({ title, content, icon: Icon, onEdit, onDelete, className = '' }) {
  return (
    <div className={`card-lg relative group ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} className="text-blue-500" />}
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        <div className="hidden group-hover:flex gap-2 absolute top-4 right-4">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit card"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
              title="Delete card"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {content}
    </div>
  );
}
