# Documentation Expansion Plan

This plan describes how to turn the current experiment notes into a complete
student-facing documentation system for Phys Lab.

## Goal

Create a full experiment manual for `phys-lab.org` that includes:

- clear experiment descriptions
- student-friendly theory
- beautiful formulas
- apparatus pictures or diagrams
- expected data tables
- expected graphs
- short animations
- teacher notes and common error sources

The documentation should begin in Markdown, then be adapted into the website.
`EXPERIMENTS.md` remains the canonical content draft while the website manual is
the published version.

## Experiment Curriculum

The documentation should be organized into two chapters.

### Chapter 1: Rope Pendulum

#### Rope Pendulum: Mass Independence

Goal:
Show that pendulum frequency does not depend on bob mass when length is fixed.

Core relation:

```text
omega = sqrt(g / l)
f = (1 / (2*pi))*sqrt(g / l)
```

Expected result:
Changing mass should not significantly change the measured frequency if length,
release angle, and setup quality remain controlled.

#### Rope Pendulum: Length Law

Goal:
Show that pendulum frequency decreases as length increases.

Core relation:

```text
omega = sqrt(g / l)
f = (1 / (2*pi))*sqrt(g / l)
f proportional to 1 / sqrt(l)
```

Expected result:
Longer pendulums should oscillate more slowly. A plot of frequency versus
length should decrease nonlinearly. A plot of frequency versus `1 / sqrt(l)`
should be closer to linear.

### Chapter 2: Spring Pendulum

#### Spring Pendulum: Mass Dependence

Goal:
Show that vertical spring oscillation frequency decreases as mass increases
when the same spring is used.

Core relation:

```text
omega = sqrt(k / m)
f = (1 / (2*pi))*sqrt(k / m)
f proportional to 1 / sqrt(m)
```

Expected result:
Larger attached masses should produce lower measured frequencies.

#### Measuring Spring Constant

Goal:
Estimate the spring constant `k` using static extension.

Core relation:

```text
F = mg
F = kx
k = mg / x
```

Expected result:
For moderate extensions, force should be approximately proportional to
extension.

#### Springs In Parallel

Goal:
Show that two springs mounted side by side behave like a stiffer combined
spring.

Core relation:

```text
k* = k1 + k2
```

Expected result:
The combined spring system should have higher stiffness and therefore higher
oscillation frequency for the same mass.

#### Springs In Series

Goal:
Show that two springs connected end to end behave like a softer combined
spring.

Core relation:

```text
1 / k* = 1 / k1 + 1 / k2
k* = 1 / (1 / k1 + 1 / k2)
```

Expected result:
The combined spring system should have lower stiffness and therefore lower
oscillation frequency for the same mass.

## Standard Experiment Template

Each experiment should use the same structure.

### Required Sections

- Goal
- Theory
- Variables
- Apparatus
- Setup
- Procedure
- Data Table
- Expected Graph
- Expected Result
- Error Sources
- Teacher Notes
- App Support

### Theory Section Pattern

Each theory section should explain the physics in three layers:

1. Plain-language idea.
2. Formula block.
3. Graph or measurement consequence.

Example:

```text
If the pendulum length increases, the bob takes longer to complete each swing.
That means the frequency decreases.

f = (1 / (2*pi))*sqrt(g / l)

So frequency is proportional to 1 / sqrt(l).
```

## Formula Rendering Plan

Use proper visual math in the website rather than plain text formulas.

Recommended approach:

- Use KaTeX for lightweight static formula rendering.
- Prefer local assets or vendored files because the Cloudflare security headers
  currently restrict scripts and styles to the same origin.
- Keep formulas in semantic HTML with a fallback plain-text expression.
- Use display formulas for important equations and inline formulas for variable
  explanations.

Alternative:

- Use MathJax if the documentation grows into more complex notation or if
  accessibility requirements become stronger.

Do not depend on CDN scripts unless the Content Security Policy is deliberately
updated.

## Visual Asset Plan

Each experiment should have four visual types.

### Apparatus Picture

Real photo or generated image showing the physical setup:

- rope pendulum with bob and red marker
- spring pendulum with hanging mass and red marker
- two springs in parallel
- two springs in series

### Setup Diagram

Clean diagram showing:

- camera direction
- motion axis
- red marker position
- measured length or extension
- controlled variable
- varied variable

### Expected Graph

Simple graph showing expected trend:

- mass independence: frequency approximately flat versus mass
- length law: frequency decreases versus length
- length law linearized: frequency versus `1 / sqrt(l)` approximately linear
- spring mass law: frequency decreases versus mass
- spring mass law linearized: frequency versus `1 / sqrt(m)` approximately
  linear
- spring constant: force versus extension approximately linear
- parallel springs: combined stiffness increases
- series springs: combined stiffness decreases

### Animation

Use short, looped animations that clarify the motion:

- rope pendulum swing with horizontal tracking axis
- spring pendulum vertical oscillation
- static spring stretch under load
- parallel springs sharing one load
- series springs stretching together

Recommended implementation:

- Use CSS/SVG or Canvas for the first version.
- Use the Web Animations API when play/pause/speed controls are needed.
- Use Lottie or dotLottie only if we later create authored vector animations.

## Website Structure Plan

The website should keep the live lab available, but the manual should become a
larger documentation system.

Recommended sections:

- Overview
- Live Lab
- Experiment Manual
- Quick Start

Experiment Manual should contain:

- chapter navigation
- experiment cards
- detail sections for all six experiments
- formula blocks
- diagrams
- animation panels
- downloadable or copyable data table templates

Suggested anchors:

```text
#rope-mass
#rope-length
#spring-mass
#spring-k
#spring-parallel
#spring-series
```

## Implementation Phases

### Phase 1: Content Source

- Expand `EXPERIMENTS.md` into the full six-experiment manual.
- Keep the current app modes clearly marked.
- Mark planned experiments as documentation-only until the app supports them.

### Phase 2: Formula System

- Add local formula rendering support.
- Convert formula text blocks into rendered formula components.
- Keep text fallback readable.

### Phase 3: Visual Assets

- Add an `assets/diagrams/` directory.
- Add one diagram per experiment.
- Add one expected graph per experiment.
- Add one apparatus picture or generated image per experiment.

### Phase 4: Animations

- Add an `assets/animations/` directory if animations are file-based.
- Prefer inline SVG/CSS or Canvas modules for simple physics motion.
- Add reduced-motion support.
- Add play/pause controls if animations are interactive.

### Phase 5: Website Manual

- Expand the `#manual` section in `index.html`.
- Add styling for formulas, diagrams, graph cards, and animation panels.
- Add JavaScript only where needed for animation controls.
- Keep the live lab controls separate from documentation content.

### Phase 6: Verification And Deployment

- Run Python tests.
- Run the static build script.
- Verify `phys-lab.org` after deployment.
- Check desktop and mobile layouts.
- Check that formulas, images, animations, and camera access still work.

## Implementation Prompt

Use this prompt to ask Codex or another coding agent to implement the plan:

```text
You are working in /home/vlad/prj/phys_lab.

Use the required project Python environment:
source ~/envs/env312/bin/activate

Goal:
Implement the documentation expansion plan for Phys Lab. Use
DOCUMENTATION_PLAN.md and EXPERIMENTS.md as the source documents.

Requirements:
1. Keep GitHub source-only. Do not commit generated docs/. Cloudflare builds
   docs/ using ./scripts/build-static-site.sh.
2. Expand EXPERIMENTS.md into a full six-experiment manual:
   - Rope Pendulum: Mass Independence
   - Rope Pendulum: Length Law
   - Spring Pendulum: Mass Dependence
   - Measuring Spring Constant
   - Springs In Parallel
   - Springs In Series
3. Use the standard structure for each experiment:
   Goal, Theory, Variables, Apparatus, Setup, Procedure, Data Table,
   Expected Graph, Expected Result, Error Sources, Teacher Notes, App Support.
4. Add beautiful formula rendering to the website. Prefer local KaTeX or another
   same-origin static solution compatible with the current Content Security
   Policy. Do not depend on a CDN unless the CSP is intentionally changed.
5. Add visual assets for the manual:
   - apparatus picture or generated illustration
   - setup diagram
   - expected graph
   - short animation
6. Start with SVG/CSS or Canvas animations for pendulum and spring motion.
   Include reduced-motion handling.
7. Expand the website manual in index.html using anchors:
   #rope-mass, #rope-length, #spring-mass, #spring-k,
   #spring-parallel, #spring-series.
8. Preserve the existing live lab functionality.
9. Update styles.css and script.js only as needed for the manual, formulas,
   visuals, and animations.
10. Run verification:
   source ~/envs/env312/bin/activate && pytest -q
   ./scripts/build-static-site.sh
   git status -sb

Deliverables:
- Updated EXPERIMENTS.md
- Updated website manual
- Formula rendering support
- Diagram and animation assets or inline components
- Passing tests
- Clean source-only Git status except intended changes

Before editing, inspect the existing files and follow the current style. Keep
changes focused and avoid unrelated refactors.
```

## Open Decisions

- Whether formulas should use KaTeX, MathJax, or pre-rendered static HTML.
- Whether apparatus visuals should be generated images, real photos, or clean
  diagrams first.
- Whether planned experiments should appear in the live app immediately or only
  in the manual until the app modes exist.
- Whether animations should be inline SVG/CSS, Canvas, or Lottie/dotLottie.
