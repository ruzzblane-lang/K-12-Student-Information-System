import React, { useState } from 'react';
import MobileTouchHandler from './MobileTouchHandler';

const MobileAttendanceCard = ({ student, onAttendanceChange, date, initialStatus = 'present' }) => {
  const [attendanceStatus, setAttendanceStatus] = useState(initialStatus);
  const [isPressed, setIsPressed] = useState(false);

  const statusOptions = [
    { value: 'present', label: 'Present', color: 'bg-green-500', icon: '✅' },
    { value: 'absent', label: 'Absent', color: 'bg-red-500', icon: '❌' },
    { value: 'late', label: 'Late', color: 'bg-yellow-500', icon: '⏰' },
    { value: 'excused', label: 'Excused', color: 'bg-blue-500', icon: '📝' }
  ];

  const handleStatusChange = (newStatus) => {
    setAttendanceStatus(newStatus);
    if (onAttendanceChange) {
      onAttendanceChange(student.id, newStatus, date);
    }
  };

  const handleSwipeLeft = () => {
    const currentIndex = statusOptions.findIndex(option => option.value === attendanceStatus);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    handleStatusChange(statusOptions[nextIndex].value);
  };

  const handleSwipeRight = () => {
    const currentIndex = statusOptions.findIndex(option => option.value === attendanceStatus);
    const prevIndex = currentIndex === 0 ? statusOptions.length - 1 : currentIndex - 1;
    handleStatusChange(statusOptions[prevIndex].value);
  };

  const handleLongPress = () => {
    // Show status selection modal or quick menu
    const currentIndex = statusOptions.findIndex(option => option.value === attendanceStatus);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    handleStatusChange(statusOptions[nextIndex].value);
  };

  const currentStatus = statusOptions.find(option => option.value === attendanceStatus);

  return (
    <MobileTouchHandler
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onLongPress={handleLongPress}
      longPressDelay={200}
    >
      <div className={`bg-white rounded-lg shadow-sm border-2 transition-all duration-200 ${
        currentStatus.color.replace('bg-', 'border-')
      } ${isPressed ? 'scale-95 shadow-lg' : ''}`}>
        
        <div 
          className="p-4"
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
        >
          <div className="flex items-center justify-between">
            {/* Student Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 font-medium text-sm">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {student.first_name} {student.last_name}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                  ID: {student.student_id}
                </p>
              </div>
            </div>

            {/* Status Display */}
            <div className="flex items-center space-x-2">
              <span className="text-lg">{currentStatus.icon}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
          </div>

          {/* Swipe Instructions */}
          <div className="mt-2 text-xs text-gray-400 text-center">
            ← Swipe to change status →
          </div>
        </div>

        {/* Quick Status Buttons (for larger screens or when needed) */}
        <div className="px-4 pb-4 grid grid-cols-4 gap-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`p-2 rounded text-xs font-medium transition-colors ${
                attendanceStatus === option.value
                  ? `${option.color} text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-sm">{option.icon}</span>
                <span className="text-xs">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MobileTouchHandler>
  );
};

export default MobileAttendanceCard;
