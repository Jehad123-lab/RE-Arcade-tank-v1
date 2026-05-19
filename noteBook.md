# Developer Notebook

A log of all tasks, ideas, and progress for this project.

## To Do

-   [ ] Integrate Gemini API for a core feature.
-   [ ] Create a more complex page layout.
-   [ ] Add interactive 3D elements with Three.js.

## In Progress

-   ...

## Done

-   **[2026-05-19 17:05]**: **v0.4.2 Physics Stabilization & HP Bars**. Resolved "jittering" steering by switching from `SetRotation` to `SetAngularVelocity`. Decoupled visual banking (ground alignment) from physics to prevent jitter. Calibrated enemy physics body size to match 0.66x visual scale. Enabled billboarded unit health bars.
-   **[2026-05-19 16:55]**: **v0.4.1 Model & Enemy Alignment Fixes**. Scaled enemy models to 0.66x to match physics bodies. Refined component offsets in `Tank.ts` (Turret, Antenna, Hatch, Tracks) for better visual cohesion. Fixed enemy muzzle data to align with scaled models.
-   **[2026-05-19 16:40]**: **v0.4.0 Application Bug Fixes**. Fixed multiple TypeScript and runtime errors in `ErrorBoundary`, `Tank.ts`, `Enemy.ts`, and `App.tsx`. Resolved Jolt API mismatches and Quaternion usage errors. Backfilled missing `Scene3D` component and installed all missing dependencies. Linter now passes for all application-level code.
-   **[2026-05-12 17:35]**: **v0.3.4 Desktop Optimization**. Disabled virtual mobile controls in desktop mode to clean up the UI for keyboard/mouse players.
-   **[2026-05-12 17:30]**: **v0.3.3 Visual & Control Polish**. Fixed turret/body mesh intersection. Added grenade expiry explosions. Implemented Pointer Lock and enhanced desktop controls (Shift/E for Grenades).
-   **[2026-05-12 17:15]**: **v0.3.2 Projectile Overhaul**. Fixed major physics desync where shells had no rotation. Corrected muzzle spawn calculation with recoil compensation. Replaced fuzzy impact detection with high-precision vector delta tracking.
-   **[2026-02-20 08:45]**: Implemented "System Spec" floating window and toggle in the Inspector group. Added interactive visuals, SVG animations, and "Copy as Markdown" button.
-   **[2024-05-21 13:30]**: Replaced the number input in Range Sliders with an interactive, animated counter for a more dynamic feel.
-   **[2024-05-21 13:15]**: Added a toggleable measurement overlay to the Stage, showing real-time dimensions for the button component.
-   **[2024-05-21 13:00]**: Completed extensive refactor into granular components (new Core inputs, Package panels for each window, Section for Stage).
-   **[2024-05-21 12:30]**: Refactored MetaPrototype into a modular component structure (App, Package, Section, Core) for better organization and scalability.
-   **[2024-05-21 12:00]**: Implemented Meta Prototype environment with draggable windows and State Layer physics.
-   **[2024-05-21 10:30]**: Implemented Tier 3 documentation files (`README.md`, `LLM.md`, `noteBook.md`, `bugReport.md`) as per system prompt.
-   **[2024-05-21 09:00]**: Initial project setup with React, Theme Provider, and responsive breakpoints.