'use client';

import React from 'react';
import { STEP_NAMES, getStepIndicatorClass, STEP_INDEX } from './constants';
import type { CurrentStep } from './types';

interface StepIndicatorProps {
  currentStep: CurrentStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = STEP_INDEX[currentStep];

  return (
    <div className="flex gap-2 mb-8 items-center overflow-auto">
      {STEP_NAMES.map((step, idx) => (
        <div
          key={idx}
          className={getStepIndicatorClass(idx, currentIndex)}
        >
          {step}
        </div>
      ))}
    </div>
  );
}
