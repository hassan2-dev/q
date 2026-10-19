import React from "react";
import { PanGestureHandler, State } from "react-native-gesture-handler";

export default function SwipeBack({ children, onBack }) {
  const onGesture = (event) => {
    const { state, translationX, translationY, velocityX } = event.nativeEvent;
    if (state !== State.END) return;
    const across = Math.abs(translationX);
    const down = Math.abs(translationY);
    const swiped = across > 72 && across > down * 1.3;
    const flicked = Math.abs(velocityX) > 900 && across > 36 && across > down;
    if (swiped || flicked) onBack();
  };

  return (
    <PanGestureHandler
      activeOffsetX={[-24, 24]}
      failOffsetY={[-20, 20]}
      onHandlerStateChange={onGesture}
    >
      {children}
    </PanGestureHandler>
  );
}
