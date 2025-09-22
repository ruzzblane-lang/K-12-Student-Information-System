import React, { useState, useRef, useEffect } from 'react';

const MobileTouchHandler = ({ children, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onLongPress, longPressDelay = 500 }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const elementRef = useRef(null);

  // Minimum distance for swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    
    // Start long press timer
    if (onLongPress) {
      const timer = setTimeout(() => {
        setIsLongPressing(true);
        onLongPress(e);
      }, longPressDelay);
      setLongPressTimer(timer);
    }
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const onTouchEnd = (e) => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Calculate vertical swipe
    const touchStartY = e.changedTouches[0].clientY;
    const touchEndY = e.changedTouches[0].clientY;
    const verticalDistance = touchStartY - touchEndY;
    const isUpSwipe = verticalDistance > minSwipeDistance;
    const isDownSwipe = verticalDistance < -minSwipeDistance;

    // Trigger appropriate swipe handlers
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft(e);
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight(e);
    } else if (isUpSwipe && onSwipeUp) {
      onSwipeUp(e);
    } else if (isDownSwipe && onSwipeDown) {
      onSwipeDown(e);
    }

    // Reset states
    setTouchStart(null);
    setTouchEnd(null);
    setIsLongPressing(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <div
      ref={elementRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`touch-handler ${isLongPressing ? 'long-pressing' : ''}`}
      style={{
        touchAction: 'pan-y pinch-zoom',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
    </div>
  );
};

export default MobileTouchHandler;
