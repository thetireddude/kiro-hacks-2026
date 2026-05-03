# UI Component & Animation Guidelines

## Component Libraries

Use shadcn/ui as the base component system. For aesthetic and animation enhancements, use the following libraries. Do not introduce custom animation or visual effect implementations when these libraries cover the use case.

### shadcn/ui (Primary)
- **Docs**: https://ui.shadcn.com
- Base component library for all standard UI elements: buttons, cards, badges, dialogs, inputs
- All shadcn components live in `components/ui/`
- Use the CLI to add components: `npx shadcn@latest add [component]`

### React Bits
- **Docs**: https://react-bits.dev
- General-purpose aesthetic and animation components
- Use for: text animations, scroll-triggered effects, background textures

### Aceternity UI
- **Docs**: https://ui.aceternity.com
- Gold standard for high-end landing page components
- Use for: background beams, tracing lines, sticky scroll reveals, spotlight effects
- Good candidate for the feed background or card entrance animations

### Magic UI
- **Docs**: https://magicui.design
- Designed for "design engineers"
- Use for: animated beams, dock menus, shiny borders, shimmer effects
- Good candidate for loading states, card borders, and CTA button effects

### Motion Primitives
- **Docs**: https://motion-primitives.com
- From the creators of Framer Motion
- Use for: lower-level animation building blocks, layout transitions, gesture-driven animations
- Good candidate for swipe transitions and card enter/exit animations

## Animation Principles

- Animations should feel natural and purposeful — never gratuitous
- Card transitions: smooth, physics-based swipe with spring easing
- Card entrance: subtle fade + slide up when first appearing
- Loading states: shimmer or skeleton, not spinners
- Keep animation durations short: 200–400ms for micro-interactions, 400–600ms for transitions
- Respect `prefers-reduced-motion` — disable non-essential animations when set

## Color System

Use Tailwind CSS v4 theme tokens. Define a category color map for topic badges:

| Category       | Color suggestion       |
|----------------|------------------------|
| Politics       | Blue (`blue-500`)      |
| Technology     | Purple (`purple-500`)  |
| World          | Emerald (`emerald-500`)|
| Business       | Amber (`amber-500`)    |
| Science        | Cyan (`cyan-500`)      |
| Sports         | Red (`red-500`)        |
| Entertainment  | Pink (`pink-500`)      |
| Health         | Green (`green-500`)    |

Confidence indicators:
- High: green dot/icon
- Medium: yellow dot/icon
- Low: gray dot/icon

## Typography

- Title: bold, large (text-2xl on mobile, text-3xl on desktop)
- Summary: regular weight, muted foreground (text-muted-foreground)
- Metadata: small, muted (text-sm text-muted-foreground)
- Category badge: small, semibold, uppercase tracking

## Dark Mode

- Support dark mode from the start using Tailwind's `dark:` variant
- Cards should have distinct background from the page in both modes
- Ensure all text meets WCAG AA contrast in both modes

## Icon Usage

- Use Lucide React icons (bundled with shadcn/ui)
- Keep icon usage minimal and meaningful
- Icons for: source count, confidence, timestamp, navigation arrows, reload
