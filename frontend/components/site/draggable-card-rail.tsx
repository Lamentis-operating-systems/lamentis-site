"use client";

import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type DraggableCardRailProps = {
  ariaLabel: string;
  children: ReactNode;
  className: string;
};

function cancelMomentum(animationFrame: React.RefObject<number | null>) {
  if (animationFrame.current !== null) {
    cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
  }
}

function startMomentum(
  rail: HTMLDivElement | null,
  animationFrame: React.RefObject<number | null>,
  setIsActive: (value: boolean) => void,
  velocity: number,
) {
  if (!rail || Math.abs(velocity) < 0.4) {
    setIsActive(false);
    return;
  }

  let currentVelocity = velocity;

  const step = () => {
    const nextScrollLeft = rail.scrollLeft - currentVelocity;

    rail.scrollLeft = nextScrollLeft;
    currentVelocity *= 0.92;

    if (
      Math.abs(currentVelocity) < 0.35 ||
      nextScrollLeft <= 0 ||
      nextScrollLeft >= rail.scrollWidth - rail.clientWidth
    ) {
      animationFrame.current = null;
      setIsActive(false);
      return;
    }

    animationFrame.current = requestAnimationFrame(step);
  };

  animationFrame.current = requestAnimationFrame(step);
}

function useMomentumRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const animationFrame = useRef<number | null>(null);
  const dragState = useRef({
    active: false,
    lastTime: 0,
    lastX: 0,
    pointerId: -1,
    scrollLeft: 0,
    startX: 0,
    velocity: 0,
  });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    return () => cancelMomentum(animationFrame);
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || event.button !== 0) {
      return;
    }

    const rail = railRef.current;

    if (!rail) {
      return;
    }

    cancelMomentum(animationFrame);
    dragState.current = {
      active: true,
      lastTime: performance.now(),
      lastX: event.clientX,
      pointerId: event.pointerId,
      scrollLeft: rail.scrollLeft,
      startX: event.clientX,
      velocity: 0,
    };
    rail.setPointerCapture(event.pointerId);
    setIsActive(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (
      !dragState.current.active ||
      event.pointerId !== dragState.current.pointerId
    ) {
      return;
    }

    const rail = railRef.current;

    if (!rail) {
      return;
    }

    event.preventDefault();
    const now = performance.now();
    const deltaX = event.clientX - dragState.current.lastX;
    const deltaTime = Math.max(1, now - dragState.current.lastTime);

    rail.scrollLeft =
      dragState.current.scrollLeft - (event.clientX - dragState.current.startX);
    dragState.current.lastTime = now;
    dragState.current.lastX = event.clientX;
    dragState.current.velocity =
      (dragState.current.velocity * 0.55) + ((deltaX / deltaTime) * 16 * 0.45);
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    const wasDragging = dragState.current.active;
    const rail = railRef.current;

    if (rail?.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }

    dragState.current.active = false;
    if (wasDragging) {
      startMomentum(
        rail,
        animationFrame,
        setIsActive,
        dragState.current.velocity,
      );
    }
  }

  return {
    isActive,
    onPointerCancel: stopDragging,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: stopDragging,
    railRef,
  };
}

export function DraggableCardRail({
  ariaLabel,
  children,
  className,
}: DraggableCardRailProps) {
  const {
    isActive,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    railRef,
  } = useMomentumRail();

  return (
    <div
      ref={railRef}
      aria-label={ariaLabel}
      className={isActive ? `${className} ${className}--dragging` : className}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
    </div>
  );
}
