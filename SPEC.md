# 2D Billiards Game Specification

## Concept & Vision
A sleek, professional billiards simulation that captures the satisfying physics of a real pool table. The game should feel tactile and responsive, with smooth ball movements, realistic collisions, and satisfying pocket drops. The aesthetic evokes a high-end pool hall with rich green felt, polished wood rails, and crisp white lighting.

## Design Language

### Aesthetic Direction
Classic pool hall elegance — rich textures, warm lighting, and the satisfying visual feedback of real billiards. Think mahogany wood grain, emerald green felt, and the gleam of polished balls.

### Color Palette
- **Felt Green**: `#1a6b3c` (table surface)
- **Rail Wood**: `#5c3d2e` (table rails)
- **Cushion**: `#2d8a4e` (bumpers)
- **Pocket Black**: `#0a0a0a`
- **Cue Stick**: `#d4a574` (maple wood)
- **Background**: `#1a1a2e` (dark room ambiance)
- **UI Accent**: `#f4a261` (warm gold)
- **Text**: `#faf3e0` (warm white)

### Ball Colors
- Cue ball: `#ffffff` with subtle gradient
- 1 (yellow): `#ffd700`
- 2 (blue): `#1e3a8a`
- 3 (red): `#dc2626`
- 4 (purple): `#7c3aed`
- 5 (orange): `#ea580c`
- 6 (green): `#16a34a`
- 7 (maroon): `#7f1d1d`
- 8 (black): `#1a1a1a`
- 9-15: Striped versions with same colors

### Typography
- **Primary**: 'Playfair Display', serif — for headings and score
- **Secondary**: 'Inter', sans-serif — for UI elements

### Motion Philosophy
- Ball physics: realistic momentum, friction, and collision response
- Pocket drops: smooth fall animation with slight scale reduction
- Cue stick: smooth rotation following mouse, pull-back on shot
- Power indicator: animated fill with color gradient (green→yellow→red)

## Layout & Structure

### Game Screen
- Full-table view with slight perspective (top-down with subtle depth)
- Power slider on right side, vertical orientation
- Current player indicator top-center
- Ball rack display and remaining balls counter
- Reset/New Game button

### Visual Hierarchy
1. Table dominates (85% of viewport height)
2. Power slider accessible but unobtrusive
3. Game state info minimal and positioned peripherally

## Features & Interactions

### Core Mechanics
1. **Aiming**: Mouse position determines cue stick angle, visualized in real-time
2. **Power Control**: Vertical slider (0-100%) controls shot strength
3. **Shot Execution**: Click/Space to shoot when aiming
4. **Spin Control**: After power, click on cue ball to set spin position

### Ball Physics
- Realistic collision response with momentum transfer
- Friction coefficient for gradual slowdown (0.985 per frame)
- Cushion bounce with energy loss (0.8 coefficient)
- Ball-to-ball collision with proper angular deflection

### Spin Effects
- Top/Bottom/Left/Right spin affects post-collision trajectory
- Spin gradually reduces over time
- Visual indicator on cue ball shows applied spin

### Pocket Detection
- 6 pockets: 4 corners + 2 side
- Ball center within pocket radius = captured
- Pocket animation: ball shrinks and fades

### Game States
- **Aiming**: Player positions shot
- **Power**: Adjusting power slider
- **Spinning**: Setting ball spin
- **Simulating**: Balls in motion, input disabled
- **Game Over**: All balls pocketed or scratch

## Component Inventory

### Table Component
- Green felt surface with subtle texture
- Wooden rails with rounded corners
- 6 pocket holes with black fill
- Diamond markers on rails

### Balls
- Solid or striped based on number
- Subtle 3D shading (radial gradient)
- Shadow beneath each ball
- States: default, moving (motion blur), pocketed (fade out)

### Cue Stick
- Wooden texture gradient
- Visible only during aiming phase
- Rotates around cue ball position
- Pull-back animation based on power

### Power Slider
- Vertical bar with gradient fill
- Current power indicator
- Numeric percentage display
- Smooth animated transitions

### Spin Indicator
- Circular overlay on cue ball
- Drag to position spin point
- Visual feedback for spin direction/magnitude

## Technical Approach

### Physics Engine (Custom)
- Vector-based position and velocity
- Circle-circle collision detection
- Momentum conservation in collisions
- Frame-independent delta time updates

### Rendering
- Canvas-based 2D rendering
- 60fps target with requestAnimationFrame
- Layer system: table → shadows → balls → cue → UI

### State Management
- Game state machine for phase management
- Ball array with position, velocity, spin properties
- Turn-based play tracking

### Collision Math
```
Distance = √((x2-x1)² + (y2-y1)²)
Collision = Distance < r1 + r2
Response: velocity exchange along collision normal
```