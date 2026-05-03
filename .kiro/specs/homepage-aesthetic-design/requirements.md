# Requirements Document: Homepage Aesthetic Design

## Introduction

The New News homepage serves as the entry point to a voice-first AI news companion. This document specifies the visual and interactive design requirements for the homepage, which features a striking aesthetic combining neon typography, gradient backgrounds, and geometric imagery to create an immersive, modern interface that invites users to explore trending news topics.

## Glossary

- **Homepage**: The main landing page of the New News application (app/page.tsx)
- **DecryptedText**: A React component that animates text by progressively revealing characters with a decryption effect
- **Gradient Background**: A smooth color transition across the viewport with animation
- **Vitruvian Man**: A classical proportion-based illustration used as a design element
- **Proportion Images**: Geometric/proportion-based PNG assets used for visual depth and design cohesion
- **Symmetrical Boxes**: Two equally-sized, curved containers positioned below the title
- **Neon Colors**: High-saturation, luminous colors (yellow #ffff00 and cyan #00ffff) used for visual emphasis
- **Backdrop Blur**: A CSS effect that blurs content behind an element for depth perception
- **Z-index Layering**: The stacking order of visual elements from background to foreground

## Requirements

### Requirement 1: Centered Title with Decryption Effect

**User Story:** As a visitor, I want to see an eye-catching title with an animated decryption effect, so that the homepage immediately communicates the brand identity and captures my attention.

#### Acceptance Criteria

1. WHEN the homepage loads, THE Homepage SHALL display the text "THE. NEW. NEWS" centered horizontally and positioned in the upper portion of the viewport
2. THE DecryptedText component SHALL animate the title text by progressively revealing each character with a staggered decryption effect
3. THE title text SHALL use a neon yellow to cyan gradient (linear gradient from #ffff00 to #00ffff)
4. THE title text SHALL have a drop shadow effect combining yellow and cyan glows to enhance the neon appearance
5. THE title SHALL be responsive, scaling from 6xl on mobile to 8xl on large screens
6. THE title text SHALL use wide letter spacing (tracking-wider) for visual impact
7. WHEN the decryption animation completes, THE title SHALL remain fully visible and stable

### Requirement 2: Animated Gradient Background

**User Story:** As a visitor, I want the background to have a calming, animated gradient, so that the homepage feels dynamic yet not overwhelming.

#### Acceptance Criteria

1. THE Homepage background SHALL use a gradient transitioning from dark blue through purple to dark blue (from-slate-900 via-purple-900 to-slate-900)
2. THE background gradient SHALL animate continuously with a very slow, smooth motion (15-second cycle)
3. THE background animation SHALL use the animate-gradient keyframe that shifts background-position from 0% to 100% and back
4. THE background SHALL include a secondary animated gradient layer with opacity 30% that pulses with an 8-second cycle
5. THE background animation SHALL be calming and non-intrusive, not causing visual fatigue

### Requirement 3: Layered Background Imagery

**User Story:** As a visitor, I want to see geometric proportion imagery layered throughout the background, so that the design feels cohesive and sophisticated.

#### Acceptance Criteria

1. WHEN the homepage loads, THE Homepage SHALL display the bg-proportions image (public/pallette/bg-proportions.png) as a full-screen background layer with 10% opacity
2. THE bg-proportions image SHALL be positioned behind all other content (z-index layering)
3. THE Vitruvian Man image (public/pallette/vitruvian.png) SHALL be positioned on the left side, vertically centered, with 40% opacity
4. THE Vitruvian Man image SHALL be non-interactive (pointer-events-none)
5. THE large-proportion image (public/pallette/large-proportion.png) SHALL be positioned on the left side at the upper-middle area with 20% opacity
6. THE proportions image (public/pallette/proportions.png) SHALL be positioned on the right side at the upper-middle area with 15% opacity
7. THE proportions2 image (public/pallette/proportions2.png) SHALL be positioned on the right side at the lower-middle area with 10% opacity
8. THE proportions5 image (public/pallette/proportions5 (3).png) SHALL be positioned on the left side at the bottom with 12% opacity
9. ALL proportion images SHALL be non-interactive (pointer-events-none)
10. THE proportion images SHALL create visual depth by layering at different z-index levels

### Requirement 4: Symmetrical Content Boxes

**User Story:** As a visitor, I want to see two symmetrical, elegant boxes below the title, so that the interface feels balanced and prepared for future content.

#### Acceptance Criteria

1. WHEN the homepage loads, THE Homepage SHALL display two equally-sized boxes positioned below the title
2. THE boxes SHALL be arranged horizontally with equal spacing between them
3. THE boxes SHALL be completely symmetrical in size, shape, and styling
4. EACH box SHALL have a rounded corner style (rounded-3xl) for a modern appearance
5. EACH box SHALL use a gradient background transitioning from slate-800/40 to purple-800/40 for subtle depth
6. EACH box SHALL have a backdrop blur effect (backdrop-blur-md) to create a frosted glass appearance
7. EACH box SHALL have a subtle border with cyan color (border-cyan-500/20) that increases opacity on hover
8. EACH box SHALL maintain a 1:1 aspect ratio (square shape)
9. EACH box SHALL be responsive, adjusting gap spacing from 12 units on mobile to 20 units on medium screens
10. EACH box SHALL have a shadow effect (shadow-2xl) for depth perception
11. EACH box SHALL be empty placeholders, ready for future content integration
12. WHEN a user hovers over a box, THE border opacity SHALL increase to cyan-500/40 with a smooth transition

### Requirement 5: Responsive Layout

**User Story:** As a visitor on any device, I want the homepage to display correctly and maintain visual balance, so that the experience is consistent across screen sizes.

#### Acceptance Criteria

1. THE Homepage layout SHALL be responsive, adapting to mobile, tablet, and desktop viewports
2. THE title text SHALL scale appropriately: 6xl on mobile, 7xl on medium screens, 8xl on large screens
3. THE spacing between the two boxes SHALL adjust: 12 units (gap-12) on mobile, 20 units (gap-20) on medium screens
4. THE proportion images SHALL maintain their visual hierarchy and positioning across all screen sizes
5. THE main content container SHALL have appropriate padding (px-4) to prevent content from touching screen edges
6. THE layout SHALL use overflow-hidden to prevent horizontal scrolling
7. WHILE the viewport is resized, THE layout SHALL smoothly transition without breaking or overlapping elements

### Requirement 6: Visual Hierarchy and Z-index Management

**User Story:** As a designer, I want clear layering of visual elements, so that the composition feels intentional and elements don't unexpectedly overlap.

#### Acceptance Criteria

1. THE background gradient layers SHALL be at z-index 0 (base layer)
2. THE bg-proportions image SHALL be at z-index 0 (behind all content)
3. THE proportion images (large-proportion, proportions, proportions2, proportions5) SHALL be at z-index 5
4. THE Vitruvian Man image SHALL be at z-index 10
5. THE main content container (title and boxes) SHALL be at z-index 20 (foreground)
6. THE z-index layering SHALL create clear visual depth without unexpected overlaps

### Requirement 7: Performance and Accessibility

**User Story:** As a user, I want the homepage to load quickly and be accessible, so that I can interact with the application smoothly regardless of my device or abilities.

#### Acceptance Criteria

1. ALL images SHALL be marked with priority={true} to optimize loading
2. THE DecryptedText component SHALL use the 'use client' directive for client-side rendering
3. THE homepage SHALL use Next.js Image component for optimized image delivery
4. THE animation keyframes SHALL use CSS animations (not JavaScript) for smooth 60fps performance
5. THE color contrast between the neon yellow/cyan text and dark background SHALL meet WCAG AA standards for readability
6. THE layout SHALL not use custom animations or effects beyond what React Bits, Aceternity UI, Magic UI, or Motion Primitives provide
7. WHEN the page loads, THE initial paint SHALL complete within acceptable performance budgets

### Requirement 8: Brand Consistency

**User Story:** As a brand stakeholder, I want the homepage to reflect the New News identity, so that visitors immediately understand the application's purpose and aesthetic.

#### Acceptance Criteria

1. THE color scheme SHALL use neon yellow (#ffff00) and cyan (#00ffff) as primary accent colors
2. THE background SHALL use dark blue and purple tones to create contrast with neon accents
3. THE typography SHALL use bold, wide-spaced lettering for impact
4. THE geometric proportion imagery SHALL reinforce the design system and create visual cohesion
5. THE overall aesthetic SHALL feel modern, tech-forward, and inviting
6. THE design SHALL align with the project's UI guidelines (ui.md) by using React Bits for aesthetic components

