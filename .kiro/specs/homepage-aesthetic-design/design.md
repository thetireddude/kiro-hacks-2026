# Design Document: Homepage Aesthetic Design

## Overview

The New News homepage is a visually striking landing page that serves as the entry point to a voice-first AI news companion. The design combines neon typography, animated gradients, and geometric proportion imagery to create an immersive, modern interface that immediately communicates the brand identity and invites user exploration.

The homepage features:
- A centered, animated title ("THE. NEW. NEWS") with a decryption effect and neon gradient
- A continuously animated gradient background (dark blue → purple → dark blue)
- Layered geometric proportion imagery for visual depth and cohesion
- Two symmetrical, elegant boxes positioned below the title as content placeholders
- Responsive layout that adapts across mobile, tablet, and desktop viewports
- Performance-optimized animations using CSS keyframes and React Bits components

## Architecture

### Component Structure

The homepage is implemented as a single-page component (`app/page.tsx`) that composes:

1. **Background Layer System**
   - Animated gradient background (primary)
   - Secondary pulsing gradient overlay (opacity 30%)
   - Full-screen bg-proportions image (opacity 10%)

2. **Imagery Layer System**
   - Vitruvian Man (left side, z-index 10)
   - Large proportion image (left-upper, z-index 5)
   - Proportions image (right-upper, z-index 5)
   - Proportions2 image (right-lower, z-index 5)
   - Proportions5 image (left-bottom, z-index 5)

3. **Content Layer**
   - DecryptedText component (title)
   - Two symmetrical boxes (content placeholders)
   - All at z-index 20 (foreground)

### Technology Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 utility classes
- **Components**: React Bits (DecryptedText component)
- **Images**: Next.js Image component with optimization
- **Animations**: CSS keyframes (animate-gradient, animate-pulse)

### Client vs Server Rendering

- **Server Component**: `app/page.tsx` can be a server component for initial layout
- **Client Component**: DecryptedText requires `'use client'` directive for animation state management
- **Hybrid Approach**: The page uses `'use client'` to enable DecryptedText interactivity

## Components and Interfaces

### DecryptedText Component

**Purpose**: Animate text by progressively revealing characters with a staggered decryption effect.

**Props**:
```typescript
interface DecryptedTextProps {
  text: string;                    // Text to decrypt
  speed?: number;                  // Delay between character reveals (ms), default 50
  maxRandomDelay?: number;         // Max random delay per character (ms), default 150
  className?: string;              // Tailwind classes for styling
  style?: CSSProperties;           // Inline styles (for gradient, shadows, etc.)
}
```

**Behavior**:
- On mount, stagger the decryption of each character
- Each character starts as a random symbol, then reveals the actual character
- Opacity transitions from 0.6 (encrypted) to 1.0 (decrypted)
- Animation completes in approximately `(text.length * speed) + maxRandomDelay` milliseconds

**Integration**:
- Imported from `@/components/DecryptedText`
- Receives neon gradient and drop shadow styles via inline `style` prop
- Wrapped in a div with Tailwind classes for sizing and spacing

### Symmetrical Boxes Component

**Purpose**: Two equally-sized, elegant placeholder containers positioned below the title.

**Styling**:
- Shape: Rounded corners (rounded-3xl)
- Background: Gradient from slate-800/40 to purple-800/40
- Backdrop: Blur effect (backdrop-blur-md) for frosted glass appearance
- Border: Cyan with opacity 20% (border-cyan-500/20), increases to 40% on hover
- Shadow: 2xl shadow for depth
- Aspect Ratio: 1:1 (square)
- Responsive Gap: 12 units (gap-12) on mobile, 20 units (gap-20) on medium screens

**Interactivity**:
- Hover state: Border opacity increases from 20% to 40% with smooth transition
- Non-interactive content (empty placeholders for future integration)

### Background Gradient Animation

**Primary Gradient**:
- Colors: from-slate-900 via-purple-900 to-slate-900
- Animation: animate-gradient (15-second cycle)
- Keyframes: Shifts background-position from 0% to 100% and back

**Secondary Overlay**:
- Colors: from-blue-900 via-purple-900 to-blue-900
- Opacity: 30%
- Animation: animate-pulse (8-second cycle)
- Purpose: Adds subtle depth and visual interest without overwhelming

### Proportion Images

**Layering Strategy**:
- All images use `pointer-events-none` to prevent interaction
- All images use Next.js Image component with `priority={true}` for optimization
- All images use `object-contain` to preserve aspect ratio

**Image Specifications**:

| Image | Position | Size | Opacity | Z-Index | Purpose |
|-------|----------|------|---------|---------|---------|
| bg-proportions | Full screen (inset-0) | Fill | 10% | 0 | Background texture |
| Vitruvian Man | Left, vertically centered | 256×256 | 40% | 10 | Primary visual anchor |
| large-proportion | Left, upper-middle | 192×192 | 20% | 5 | Left-side depth |
| proportions | Right, upper-middle | 128×128 | 15% | 5 | Right-side depth |
| proportions2 | Right, lower-middle | 160×160 | 10% | 5 | Right-side lower depth |
| proportions5 | Left, bottom | 144×144 | 12% | 5 | Left-side lower depth |

## Data Models

### No Dynamic Data

The homepage is a static, presentation-only component. There are no data models, API calls, or state management beyond the DecryptedText animation state.

### Future Integration Points

When the homepage evolves to display trending topics, the following data structure will be needed:

```typescript
interface NewsEvent {
  id: string;
  title: string;
  summary: string;
  category: string;
  trending: boolean;
  fetchedAt: string;
}
```

Currently, the two symmetrical boxes are empty placeholders awaiting this integration.

## Correctness Properties

This feature is primarily a **visual/aesthetic design** with CSS animations and static imagery. Property-based testing is not applicable because:

1. **No transformation logic**: The component renders static content and CSS animations
2. **No input variation**: The homepage displays the same content regardless of user input
3. **No universal properties**: Visual design and animation timing are deterministic, not probabilistic
4. **Rendering-focused**: The component is a presentation layer, not a business logic layer

**Testing Strategy**: This feature requires visual regression testing, snapshot testing, and manual accessibility review rather than property-based testing. See Testing Strategy section below.

## Error Handling

### Image Loading Failures

**Scenario**: An image fails to load (network error, missing file, etc.)

**Handling**:
- Next.js Image component provides built-in error handling
- Images have `priority={true}` to load early and fail fast
- If an image fails, the layout remains intact (images are positioned absolutely)
- Fallback: The background gradient and other images remain visible

**User Experience**:
- No error message displayed (images are decorative)
- Layout remains visually balanced even if some images fail
- The title and boxes remain fully functional

### Animation Performance

**Scenario**: Browser cannot sustain 60fps animations (low-end device, high CPU load)

**Handling**:
- CSS animations (animate-gradient, animate-pulse) are hardware-accelerated
- DecryptedText uses CSS transitions (transition-all duration-300) for smooth rendering
- No JavaScript-based animation loops that could block the main thread
- Animations degrade gracefully on low-end devices (slower but still visible)

**User Experience**:
- Animations may appear slower on low-end devices, but remain smooth
- No layout shifts or visual glitches
- Content remains readable and interactive

### Responsive Layout Issues

**Scenario**: Viewport is extremely narrow (< 320px) or extremely wide (> 2560px)

**Handling**:
- Tailwind breakpoints handle common viewport sizes
- `overflow-hidden` on main element prevents horizontal scrolling
- `px-4` padding ensures content doesn't touch edges
- Flex layout with `flex-1` ensures boxes scale proportionally

**User Experience**:
- Layout remains balanced across all viewport sizes
- No content overflow or horizontal scrolling
- Boxes maintain 1:1 aspect ratio and equal sizing

## Testing Strategy

### Visual Regression Testing

**Purpose**: Ensure the homepage visual appearance remains consistent across changes.

**Approach**:
- Use a visual regression testing tool (e.g., Percy, Chromatic, or Playwright visual comparisons)
- Capture baseline screenshots at key breakpoints: mobile (375px), tablet (768px), desktop (1920px)
- Compare new screenshots against baselines after code changes
- Flag any unintended visual changes

**Test Cases**:
1. Homepage loads with correct layout and styling
2. Title displays with neon gradient and decryption animation
3. Background gradient animates smoothly
4. Proportion images display at correct positions and opacities
5. Symmetrical boxes display with correct styling and hover effects
6. Layout remains balanced at mobile, tablet, and desktop breakpoints

### Snapshot Testing

**Purpose**: Ensure the DOM structure and Tailwind classes remain consistent.

**Approach**:
- Use Jest snapshot testing to capture the rendered HTML
- Snapshot includes all Tailwind classes, inline styles, and component props
- Update snapshots when intentional changes are made

**Test Cases**:
1. Homepage renders with correct component structure
2. DecryptedText receives correct props (text, speed, maxRandomDelay, className, style)
3. Image components receive correct props (src, alt, fill, priority, className)
4. Z-index layering is correct in the DOM

### Manual Accessibility Review

**Purpose**: Ensure the homepage is accessible to users with disabilities.

**Approach**:
- Manual testing with screen readers (NVDA, JAWS, VoiceOver)
- Keyboard navigation testing (Tab, Enter, Escape)
- Color contrast verification (WCAG AA standards)
- Focus indicator visibility

**Test Cases**:
1. Screen reader announces title text correctly
2. Images have descriptive alt text
3. Color contrast between neon text and dark background meets WCAG AA
4. Keyboard focus is visible and logical
5. No keyboard traps or inaccessible interactive elements

### Performance Testing

**Purpose**: Ensure the homepage loads quickly and animations run smoothly.

**Approach**:
- Use Lighthouse, WebPageTest, or similar tools
- Measure Core Web Vitals: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
- Monitor animation frame rate (target 60fps)

**Test Cases**:
1. Initial page load completes within acceptable time budget
2. Images load with `priority={true}` and don't block rendering
3. CSS animations run at 60fps on modern devices
4. No layout shifts during animation or image loading
5. DecryptedText animation completes without jank

### Unit Tests (Example-Based)

**Purpose**: Verify specific component behavior and edge cases.

**Test Cases**:

1. **DecryptedText Animation Timing**
   - Given: text="THE. NEW. NEWS", speed=50, maxRandomDelay=150
   - When: component mounts
   - Then: all characters are decrypted within ~2 seconds

2. **Symmetrical Boxes Styling**
   - Given: two box elements
   - When: rendered
   - Then: both have identical classes and styling

3. **Image Loading**
   - Given: all images in public/pallette/
   - When: page loads
   - Then: all images load successfully with correct alt text

4. **Responsive Breakpoints**
   - Given: viewport at 375px (mobile)
   - When: page renders
   - Then: title is text-6xl, gap between boxes is gap-12

5. **Responsive Breakpoints**
   - Given: viewport at 768px (tablet)
   - When: page renders
   - Then: title is text-7xl, gap between boxes is gap-20

6. **Z-index Layering**
   - Given: all elements rendered
   - When: inspecting computed z-index
   - Then: background=0, proportions=5, vitruvian=10, content=20

### Integration Tests

**Purpose**: Verify the homepage integrates correctly with Next.js and Tailwind.

**Test Cases**:

1. **Next.js Image Optimization**
   - Given: page loads
   - When: images are requested
   - Then: images are optimized and served with correct cache headers

2. **Tailwind CSS Compilation**
   - Given: design.md specifies Tailwind classes
   - When: build runs
   - Then: all Tailwind classes are compiled and available

3. **CSS Animation Keyframes**
   - Given: animate-gradient and animate-pulse are used
   - When: page loads
   - Then: keyframes are defined and animations run smoothly

## Design Decisions and Rationales

### Why CSS Animations Instead of JavaScript

**Decision**: Use CSS keyframes (animate-gradient, animate-pulse) for background animations instead of JavaScript-based animations.

**Rationale**:
- CSS animations are hardware-accelerated and run on the GPU
- No JavaScript execution required, reducing main thread blocking
- Smoother 60fps performance on all devices
- Better battery life on mobile devices
- Simpler code and easier to maintain

### Why DecryptedText Uses Client-Side Rendering

**Decision**: DecryptedText component uses `'use client'` directive for client-side rendering.

**Rationale**:
- Animation state (decryptedIndices) must be managed on the client
- useEffect hook required to stagger character decryption
- Server-side rendering cannot handle dynamic animation state
- Client-side rendering enables smooth, interactive animation

### Why Proportion Images Are Absolutely Positioned

**Decision**: All proportion images use absolute positioning instead of being part of the document flow.

**Rationale**:
- Allows precise layering and z-index control
- Enables overlapping images for visual depth
- Doesn't affect layout of main content (title and boxes)
- Easier to adjust positions and sizes responsively
- `pointer-events-none` prevents accidental interaction

### Why Two Boxes Are Empty Placeholders

**Decision**: The two symmetrical boxes below the title are empty, with no content or functionality.

**Rationale**:
- Aligns with requirements (boxes are placeholders for future content)
- Keeps the homepage focused on aesthetic design
- Allows future integration of trending topics or other content
- Maintains visual balance and symmetry
- Reduces complexity and cognitive load

### Why Neon Colors (Yellow and Cyan)

**Decision**: Use neon yellow (#ffff00) and cyan (#00ffff) for the title gradient and accents.

**Rationale**:
- High contrast against dark background (meets WCAG AA)
- Visually striking and memorable
- Aligns with "New News" brand identity (modern, tech-forward)
- Neon aesthetic is trendy and appeals to target audience
- Cyan and yellow are complementary colors (visually pleasing)

### Why Dark Blue and Purple Background

**Decision**: Use dark blue (slate-900) and purple (purple-900) for the background gradient.

**Rationale**:
- Provides high contrast for neon text
- Creates a calming, sophisticated aesthetic
- Reduces eye strain compared to bright backgrounds
- Aligns with modern SaaS and tech product design
- Purple conveys creativity and innovation

## Implementation Notes

### Tailwind CSS Configuration

The design uses standard Tailwind v4 utilities. No custom CSS or configuration is required beyond what's already in the project.

**Key Utilities Used**:
- `bg-gradient-to-br`: Background gradient direction
- `animate-gradient`: Custom animation (requires keyframes in globals.css)
- `animate-pulse`: Built-in pulsing animation
- `backdrop-blur-md`: Frosted glass effect
- `rounded-3xl`: Rounded corners
- `shadow-2xl`: Drop shadow
- `opacity-*`: Opacity levels
- `z-*`: Z-index layering
- `pointer-events-none`: Disable pointer events
- `aspect-square`: 1:1 aspect ratio
- `flex`, `gap-*`, `items-center`, `justify-center`: Flexbox layout

### CSS Keyframes

The following keyframes must be defined in `app/globals.css`:

```css
@keyframes gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.animate-gradient {
  background-size: 200% 200%;
  animation: gradient 15s ease infinite;
}
```

### Image Optimization

All images use Next.js Image component with:
- `fill`: Fills the parent container
- `priority={true}`: Loads early (above the fold)
- `object-contain`: Preserves aspect ratio
- `className`: Tailwind classes for sizing and positioning

### Responsive Design Breakpoints

- **Mobile**: < 768px (default Tailwind breakpoint)
  - Title: text-6xl
  - Box gap: gap-12
  - Padding: px-4

- **Tablet**: 768px - 1024px (md: breakpoint)
  - Title: text-7xl
  - Box gap: gap-20

- **Desktop**: > 1024px (lg: breakpoint)
  - Title: text-8xl
  - Box gap: gap-20

## Future Enhancements

### Phase 2: Trending Topics Integration

When the homepage evolves to display trending topics, the two symmetrical boxes will be replaced with:
- A vertical scrolling feed of trending news topics
- Each topic card displays title, summary, and category
- Clicking a topic navigates to the topic detail page

### Phase 3: Interactive Elements

Future enhancements may include:
- Hover effects on proportion images (scale, opacity change)
- Click handlers on boxes to navigate to topic pages
- Search functionality integrated into the boxes
- User authentication and personalization

### Phase 4: Advanced Animations

Future enhancements may include:
- Parallax scrolling for proportion images
- Scroll-triggered animations for content reveal
- Micro-interactions on hover and click
- Animated transitions between pages

## Accessibility Considerations

### Color Contrast

The neon yellow (#ffff00) and cyan (#00ffff) text on dark background (slate-900) meets WCAG AA standards for color contrast (ratio > 4.5:1).

**Verification**: Use WebAIM Contrast Checker or similar tool to verify contrast ratios.

### Alt Text

All images have descriptive alt text:
- "background proportions"
- "vitruvian man"
- "large proportion"
- "proportions"
- "proportions 2"
- "proportions 5"

### Keyboard Navigation

The homepage has no interactive elements (boxes are empty placeholders), so keyboard navigation is not required. When content is added to the boxes, keyboard navigation must be implemented.

### Screen Reader Compatibility

The DecryptedText component renders actual text (not images or canvas), so screen readers can read the title correctly. The animation is visual only and doesn't affect screen reader output.

### Motion Preferences

Consider adding `prefers-reduced-motion` media query to disable animations for users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-gradient,
  .animate-pulse {
    animation: none;
  }
}
```

## Performance Optimization

### Image Optimization

- All images use Next.js Image component for automatic optimization
- `priority={true}` ensures images load early
- Images are served in modern formats (WebP) with fallbacks
- Responsive image sizes are automatically generated

### CSS Animation Performance

- CSS animations are hardware-accelerated (GPU)
- No JavaScript animation loops
- Smooth 60fps performance on modern devices
- Graceful degradation on low-end devices

### Bundle Size

- DecryptedText component is small (~1.6KB)
- No external animation libraries required
- Tailwind CSS utilities are tree-shaken in production
- Total bundle impact is minimal

## Deployment Considerations

### Build Process

- Next.js build includes image optimization
- Tailwind CSS is compiled and tree-shaken
- CSS keyframes are included in the output CSS
- No additional build steps required

### Environment Variables

No environment variables are required for the homepage.

### Caching Strategy

- Images should be cached with long TTL (e.g., 1 year)
- HTML should be cached with short TTL (e.g., 1 hour)
- CSS and JavaScript should be cached with long TTL (e.g., 1 year)

## Conclusion

The homepage aesthetic design creates a visually striking, modern entry point to the New News application. By combining neon typography, animated gradients, and geometric imagery, the design immediately communicates the brand identity and invites user exploration. The implementation is performance-optimized, accessible, and ready for future content integration.
