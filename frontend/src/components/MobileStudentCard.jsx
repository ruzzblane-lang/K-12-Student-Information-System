import React, { useState } from 'react';
import MobileTouchHandler from './MobileTouchHandler';

const MobileStudentCard = ({ _student, onEdit, onDelete, onView }) => {
  const [showActions, setShowActions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleSwipeLeft = () => {
    setShowActions(true);
  };

  const handleSwipeRight = () => {
    setShowActions(false);
  };

  const handleLongPress = () => {
    // Show quick actions menu
    setShowActions(true);
  };

  const handleQuickAction = (action) => {
    setShowActions(false);
    if (action === 'edit' && onEdit) onEdit(_student);
    if (action === 'delete' && onDelete) onDelete(_student._id);
    if (action === 'view' && onView) onView(_student);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'graduated': return 'bg-blue-100 text-blue-800';
      case 'transferred': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MobileTouchHandler
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onLongPress={handleLongPress}
      longPressDelay={300}
    >
      <div className={`relative bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
        showActions ? 'transform -translate-x-20' : ''
      } ${isPressed ? 'scale-95' : ''}`}>
        
        {/* Main Card Content */}
        <div 
          className="p-4 cursor-pointer"
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onClick={() => onView && onView(_student)}
        >
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {_student.first_name?.[0]}{_student.last_name?.[0]}
                </span>
              </div>
            </div>

            {/* Student Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {_student.first_name} {_student.last_name}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                ID: {_student.student_id}
              </p>
              <p className="text-sm text-gray-500 truncate">
                Grade {_student.grade}
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(_student.status)}`}>
                {_student.status}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              <span className="font-medium">Email:</span>
              <p className="truncate">{_student.email || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">Phone:</span>
              <p className="truncate">{_student.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions (revealed on swipe) */}
        <div className={`absolute right-0 top-0 h-full w-20 bg-gray-100 flex flex-col justify-center items-center space-y-2 transition-all duration-300 ${
          showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <button
            onClick={() => handleQuickAction('view')}
            className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-blue-600 transition-colors"
            title="View Details"
          >
            👁️
          </button>
          <button
            onClick={() => handleQuickAction('edit')}
            className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-yellow-600 transition-colors"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => handleQuickAction('delete')}
            className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
            title="Delete"
          >
            🗑️
          </button>
        </div>

        {/* Swipe Indicator */}
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs opacity-50">
          ← Swipe for actions
        </div>
      </div>
    </MobileTouchHandler>
  );
};

export default MobileStudentCard;
