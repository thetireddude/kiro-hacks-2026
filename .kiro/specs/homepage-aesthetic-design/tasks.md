# Implementation Plan: Homepage Aesthetic Design

## Overview

This implementation plan breaks down the homepage aesthetic design into discrete, sequential coding tasks. The homepage combines neon typography, animated gradients, and geometric proportion imagery to create a striking entry point to the New News application.

The implementation follows a layered approach: first establishing the CSS animation infrastructure, then building the background system, integrating the DecryptedText component, positioning imagery, creating the content boxes, and finally ensuring responsive design and testing across all breakpoints.

## Tasks

- [x] 1. Set up CSS keyframes and animation infrastructure
  - Add `animate-gradient` keyframe to `app/globals.css` for the 15-second background gradient animation
  - Add `animate-pulse` configuration if not already present in Tailwind
  - Verify keyframes are properly scoped and don't conflict with existing animations
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Create the main page component structure
  - Create `app/page.tsx` as a client component with `'use client'` directive
  - Set up the main container with `flex`, `flex-col`, `items-center`, `justify-center`, `min-h-screen`, `overflow-hidden`
  - Add `relative` positioning for absolute-positioned child elements
  - _Requirements: 1.1, 5.1, 6.1_

- [x] 3. Implement the animated gradient background layers
  - Add primary gradient background div with `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`
  - Apply `animate-gradient` animation with `bg-size-200% bg-200%`
  - Position as full-screen with `fixed inset-0 z-0`
  - Add secondary pulsing overlay div with `from-blue-900 via-purple-900 to-blue-900`, `opacity-30`, `animate-pulse`
  - Verify both layers animate smoothly without visual artifacts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Position the bg-proportions background image
  - Import Next.js Image component
  - Add bg-proportions image from `public/pallette/bg-proportions.png`
  - Position with `fixed inset-0 z-0 opacity-10`
  - Set `fill`, `priority={true}`, `object-contain`, `pointer-events-none`
  - Add alt text: "background proportions"
  - _Requirements: 3.1, 3.2, 3.10_

- [-] 5. Position the Vitruvian Man image (left side)
  - Add vitruvian.png image from `public/pallette/vitruvian.png`
  - Position with `absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-40`
  - Set size to `w-64 h-64` (256×256)
  - Set `priority={true}`, `object-contain`, `pointer-events-none`
  - Add alt text: "vitruvian man"
  - _Requirements: 3.3, 3.4, 6.4_

- [~] 6. Position the large-proportion image (left upper-middle)
  - Add large-proportion.png image from `public/pallette/large-proportion.png`
  - Position with `absolute left-12 top-1/3 z-5 opacity-20`
  - Set size to `w-48 h-48` (192×192)
  - Set `priority={true}`, `object-contain`, `pointer-events-none`
  - Add alt text: "large proportion"
  - _Requirements: 3.5, 3.10, 6.3_

- [~] 7. Position the proportions image (right upper-middle)
  - Add proportions.png image from `public/pallette/proportions.png`
  - Position with `absolute right-12 top-1/3 z-5 opacity-15`
  - Set size to `w-32 h-32` (128×128)
  - Set `priority={true}`, `object-contain`, `pointer-events-none`
  - Add alt text: "proportions"
  - _Requirements: 3.6, 3.10, 6.3_

- [~] 8. Position the proportions2 image (right lower-middle)
  - Add proportions2.png image from `public/pallette/proportions2.png`
  - Position with `absolute right-24 bottom-1/3 z-5 opacity-10`
  - Set size to `w-40 h-40` (160×160)
  - Set `priority={true}`, `object-contain`, `pointer-events-none`
  - Add alt text: "proportions 2"
  - _Requirements: 3.7, 3.10, 6.3_

- [~] 9. Position the proportions5 image (left bottom)
  - Add proportions5 (3).png image from `public/pallette/proportions5 (3).png`
  - Position with `absolute left-8 bottom-12 z-5 opacity-12`
  - Set size to `w-36 h-36` (144×144)
  - Set `priority={true}`, `object-contain`, `pointer-events-none`
  - Add alt text: "proportions 5"
  - _Requirements: 3.8, 3.10, 6.3_

- [~] 10. Integrate the DecryptedText component for the title
  - Import DecryptedText from `@/components/DecryptedText`
  - Create a wrapper div with `relative z-20` for foreground positioning
  - Pass text prop: "THE. NEW. NEWS"
  - Pass speed prop: 50 (milliseconds between character reveals)
  - Pass maxRandomDelay prop: 150 (max random delay per character)
  - Pass className prop with responsive text sizing: `text-6xl md:text-7xl lg:text-8xl tracking-wider font-bold`
  - Pass style prop with neon gradient and drop shadow effects
  - Verify animation completes smoothly and text remains stable after completion
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [~] 11. Create the symmetrical boxes container
  - Create a flex container div with `relative z-20 flex gap-12 md:gap-20 items-center justify-center mt-12`
  - Ensure equal spacing and alignment for both boxes
  - _Requirements: 4.1, 4.2, 4.3, 5.3_

- [~] 12. Implement the first symmetrical box
  - Create a div with `w-full md:w-80 aspect-square rounded-3xl`
  - Add background gradient: `bg-gradient-to-br from-slate-800/40 to-purple-800/40`
  - Add backdrop blur: `backdrop-blur-md`
  - Add border: `border border-cyan-500/20 transition-all duration-300`
  - Add shadow: `shadow-2xl`
  - Add hover state: `hover:border-cyan-500/40`
  - Leave content empty (placeholder for future integration)
  - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

- [~] 13. Implement the second symmetrical box
  - Create a div with identical styling to the first box
  - Ensure both boxes have exactly the same classes and styling
  - Verify symmetry by comparing computed styles
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

- [~] 14. Implement responsive design for mobile (< 768px)
  - Verify title scales to `text-6xl` on mobile
  - Verify box gap is `gap-12` on mobile
  - Verify padding is `px-4` to prevent edge touching
  - Test at 375px viewport width
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [~] 15. Implement responsive design for tablet (768px - 1024px)
  - Verify title scales to `text-7xl` on medium screens
  - Verify box gap is `gap-20` on medium screens
  - Verify layout remains balanced
  - Test at 768px viewport width
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [~] 16. Implement responsive design for desktop (> 1024px)
  - Verify title scales to `text-8xl` on large screens
  - Verify box gap remains `gap-20` on large screens
  - Verify layout remains balanced at wide viewports
  - Test at 1920px viewport width
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [~] 17. Verify z-index layering is correct
  - Inspect computed z-index values for all elements
  - Verify background gradients are at z-0
  - Verify proportion images are at z-5
  - Verify Vitruvian Man is at z-10
  - Verify content (title and boxes) is at z-20
  - Verify no unexpected overlaps or visual glitches
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [~] 18. Verify animation performance and smoothness
  - Test that `animate-gradient` runs smoothly at 60fps
  - Test that `animate-pulse` overlay doesn't cause jank
  - Test that DecryptedText animation completes without stuttering
  - Verify no layout shifts during animations
  - Test on both modern and low-end devices if possible
  - _Requirements: 2.2, 2.5, 7.4_

- [~] 19. Verify color contrast and accessibility
  - Check neon yellow (#ffff00) and cyan (#00ffff) contrast against dark background
  - Verify contrast ratio meets WCAG AA standards (> 4.5:1)
  - Use WebAIM Contrast Checker or similar tool
  - Verify all images have descriptive alt text
  - _Requirements: 1.3, 1.4, 7.5_

- [~] 20. Verify image loading and optimization
  - Confirm all images load successfully with `priority={true}`
  - Verify images are optimized by Next.js Image component
  - Check that images don't block page rendering
  - Verify no broken image placeholders or 404 errors
  - _Requirements: 3.1, 3.3, 3.5, 3.6, 3.7, 3.8, 7.1, 7.3_

- [~] 21. Checkpoint - Ensure all visual elements render correctly
  - Verify all layers (background, images, content) render without errors
  - Verify no console errors or warnings
  - Verify layout is balanced and visually appealing
  - Ask the user if questions arise.

- [~] 22. Write snapshot test for page component structure
  - Create test file `app/__tests__/page.test.tsx`
  - Render the homepage component
  - Capture snapshot of rendered HTML
  - Verify snapshot includes all Tailwind classes and structure
  - _Requirements: 1.1, 4.1, 5.1_

- [~] 23. Write snapshot test for DecryptedText integration
  - Test that DecryptedText receives correct props
  - Verify text prop is "THE. NEW. NEWS"
  - Verify speed and maxRandomDelay props are set correctly
  - Verify className includes responsive text sizing
  - Verify style prop includes gradient and shadow effects
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [~] 24. Write snapshot test for symmetrical boxes
  - Test that both boxes render with identical styling
  - Verify both boxes have correct Tailwind classes
  - Verify border, background, and shadow classes are present
  - Verify aspect-square is applied
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [~] 25. Write snapshot test for image components
  - Test that all images render with correct props
  - Verify all images have `priority={true}`
  - Verify all images have `pointer-events-none`
  - Verify all images have descriptive alt text
  - Verify all images have correct positioning classes
  - _Requirements: 3.1, 3.3, 3.5, 3.6, 3.7, 3.8, 3.10_

- [~] 26. Write unit test for responsive breakpoints
  - Test title text size at mobile (375px): should be text-6xl
  - Test title text size at tablet (768px): should be text-7xl
  - Test title text size at desktop (1920px): should be text-8xl
  - Test box gap at mobile (375px): should be gap-12
  - Test box gap at tablet (768px): should be gap-20
  - _Requirements: 5.1, 5.2, 5.3_

- [~] 27. Write unit test for z-index layering
  - Test that background elements have z-0
  - Test that proportion images have z-5
  - Test that Vitruvian Man has z-10
  - Test that content has z-20
  - Verify computed z-index values match expected values
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [~] 28. Write unit test for image loading
  - Test that all images load successfully
  - Test that images don't cause layout shifts
  - Test that images have correct alt text
  - Test that images are positioned correctly
  - _Requirements: 3.1, 3.3, 3.5, 3.6, 3.7, 3.8, 7.1, 7.3_

- [~] 29. Write unit test for animation keyframes
  - Test that `animate-gradient` keyframe is defined
  - Test that `animate-pulse` animation is available
  - Test that animations run without errors
  - Verify animation timing (15s for gradient, 8s for pulse)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.4_

- [~] 30. Write unit test for color contrast
  - Test that neon yellow (#ffff00) contrast ratio > 4.5:1
  - Test that cyan (#00ffff) contrast ratio > 4.5:1
  - Verify contrast against dark background (slate-900)
  - _Requirements: 1.3, 1.4, 7.5_

- [~] 31. Checkpoint - Ensure all tests pass
  - Run all snapshot tests and verify they pass
  - Run all unit tests and verify they pass
  - Verify no test failures or warnings
  - Ask the user if questions arise.

- [~] 32. Verify responsive layout across all breakpoints
  - Test layout at 320px (small mobile)
  - Test layout at 375px (mobile)
  - Test layout at 768px (tablet)
  - Test layout at 1024px (large tablet)
  - Test layout at 1920px (desktop)
  - Verify no horizontal scrolling at any breakpoint
  - Verify content doesn't touch screen edges
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_

- [~] 33. Verify visual hierarchy and layering
  - Inspect visual appearance at each breakpoint
  - Verify background gradients are visible but not overwhelming
  - Verify proportion images create depth without obscuring content
  - Verify title and boxes are clearly in foreground
  - Verify no unexpected overlaps or visual glitches
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [~] 34. Verify brand consistency and aesthetic
  - Verify neon yellow and cyan colors are used correctly
  - Verify dark blue and purple background tones are present
  - Verify typography is bold and wide-spaced
  - Verify geometric proportion imagery is visible and cohesive
  - Verify overall aesthetic feels modern and tech-forward
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [~] 35. Final checkpoint - Ensure all visual elements are complete
  - Verify all layers render correctly
  - Verify all animations run smoothly
  - Verify responsive design works across all breakpoints
  - Verify accessibility standards are met
  - Verify brand consistency is maintained
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (none in this plan)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and catch issues early
- Visual regression testing and manual accessibility review are recommended but not included as tasks (see design document for details)
- All tasks focus on implementation and testing of code; deployment and user acceptance testing are out of scope
- The DecryptedText component is already implemented in `components/DecryptedText.tsx` and should be imported as-is
- No property-based testing is applicable to this feature (see design document for rationale)
