"use client";

import React, { ElementType, ReactNode } from "react";
import { motion, Variants, Transition } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Enterprise Scroll Animation Configuration
 * Modeled after Linear, Apple, Stripe and Microsoft design systems.
 * - Easing: cubic-bezier(0.22, 1, 0.36, 1) [Smooth Quintic Out]
 * - Distance: 16px
 * - Duration: 550ms (0.55s)
 * - Stagger: 60ms (0.06s)
 */
export const ENTERPRISE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const ENTERPRISE_DURATION = 0.55;
export const ENTERPRISE_DISTANCE = 16;
export const ENTERPRISE_STAGGER = 0.06;

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Direction from which the element slides into view */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Custom translation distance in pixels (default 16) */
  distance?: number;
  /** Custom duration in seconds (default 0.55) */
  duration?: number;
  /** Delay in seconds before animation triggers */
  delay?: number;
  /** Stagger index for manual calculation: delay + staggerIndex * 0.06 */
  staggerIndex?: number;
  /** Viewport intersection threshold (0 to 1, default 0.12) */
  threshold?: number;
  /** Trigger animation once and keep in final state (default true) */
  once?: boolean;
  /** HTML tag or component to render as (default 'div') */
  as?: ElementType;
  /** Margin for viewport intersection (e.g. "-30px") */
  viewportMargin?: string;
}

export function ScrollReveal({
  children,
  className,
  direction = "up",
  distance = ENTERPRISE_DISTANCE,
  duration = ENTERPRISE_DURATION,
  delay = 0,
  staggerIndex,
  threshold = 0.12,
  once = true,
  as = "div",
  viewportMargin = "-30px",
}: ScrollRevealProps) {
  const calculatedDelay = staggerIndex !== undefined ? delay + staggerIndex * ENTERPRISE_STAGGER : delay;

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { opacity: 0, y: distance };
      case "down":
        return { opacity: 0, y: -distance };
      case "left":
        return { opacity: 0, x: distance };
      case "right":
        return { opacity: 0, x: -distance };
      case "none":
      default:
        return { opacity: 0 };
    }
  };

  const getTargetPosition = () => {
    switch (direction) {
      case "up":
      case "down":
        return { opacity: 1, y: 0 };
      case "left":
      case "right":
        return { opacity: 1, x: 0 };
      case "none":
      default:
        return { opacity: 1 };
    }
  };

  const MotionComponent = motion(as as any);

  return (
    <MotionComponent
      initial={getInitialPosition()}
      whileInView={getTargetPosition()}
      viewport={{ once, amount: threshold, margin: viewportMargin }}
      transition={{
        duration,
        delay: calculatedDelay,
        ease: ENTERPRISE_EASE,
      }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Container that automatically orchestrates staggered reveal for all <StaggerItem> children
 * Children animate in sequence with 60ms interval.
 */
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { stagger?: number; delay?: number } = {}) => ({
    opacity: 1,
    transition: {
      staggerChildren: custom.stagger ?? ENTERPRISE_STAGGER,
      delayChildren: custom.delay ?? 0,
    },
  }),
};

export interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  threshold?: number;
  once?: boolean;
  viewportMargin?: string;
  as?: ElementType;
}

export function StaggerContainer({
  children,
  className,
  delay = 0,
  stagger = ENTERPRISE_STAGGER,
  threshold = 0.1,
  once = true,
  viewportMargin = "-40px",
  as = "div",
}: StaggerContainerProps) {
  const MotionComponent = motion(as as any);

  return (
    <MotionComponent
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold, margin: viewportMargin }}
      custom={{ delay, stagger }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Child item designed to sit inside a <StaggerContainer>
 */
const itemVariants: Variants = {
  hidden: { opacity: 0, y: ENTERPRISE_DISTANCE },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ENTERPRISE_DURATION,
      ease: ENTERPRISE_EASE,
    },
  },
};

export interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function StaggerItem({ children, className, as = "div" }: StaggerItemProps) {
  const MotionComponent = motion(as as any);

  return (
    <MotionComponent
      variants={itemVariants}
      className={cn("will-change-transform", className)}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * Specialized enterprise card wrapper with scroll entrance and subtle micro-interaction
 */
export interface ScrollCardProps {
  children: ReactNode;
  className?: string;
  index?: number;
  delay?: number;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export function ScrollCard({
  children,
  className,
  index = 0,
  delay = 0,
  hoverEffect = true,
  onClick,
}: ScrollCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: ENTERPRISE_DISTANCE, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.1, margin: "-20px" }}
      transition={{
        duration: ENTERPRISE_DURATION,
        delay: delay + index * ENTERPRISE_STAGGER,
        ease: ENTERPRISE_EASE,
      }}
      onClick={onClick}
      className={cn(
        "will-change-transform",
        hoverEffect && "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Section container with clean viewport entrance and optional divider
 */
export interface ScrollSectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}

export function ScrollSection({
  children,
  className,
  id,
  delay = 0,
}: ScrollSectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08, margin: "-50px" }}
      transition={{
        duration: ENTERPRISE_DURATION + 0.1,
        delay,
        ease: ENTERPRISE_EASE,
      }}
      className={cn("relative will-change-transform", className)}
    >
      {children}
    </motion.section>
  );
}

