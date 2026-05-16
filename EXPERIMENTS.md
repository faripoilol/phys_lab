# Phys Lab Experiment Manual

This document is the canonical draft for the student-facing experiment manual on
`phys-lab.org`. The website should publish polished versions of these
experiments while keeping the live measurement tool separate and easy to use.

## Shared Lab Context

Phys Lab is a browser-based oscillation laboratory for classroom experiments.
Students use a desktop or laptop browser, a webcam, one red marker, and a
controlled apparatus setup.

The normal workflow is:

1. Choose an experiment mode or manual section.
2. Prepare the apparatus.
3. Enter the mass and the required setup parameter.
4. Enable the camera.
5. Start and stop one run manually.
6. Review the measured frequency.
7. Save only trusted runs into the current session.
8. Compare saved runs.

The app stores runs locally in the browser and can export session data as JSON.

## Shared Setup Requirements

- Attach the required red marker to the pendulum bob or spring mass.
- Place the camera perpendicular to the plane of motion.
- Keep the background visually quiet.
- Keep lighting even and avoid reflections on the marker.
- Use small release angles for rope-pendulum experiments.
- Use small vertical stretches for spring-pendulum experiments.
- Frame rope motion mainly left-to-right.
- Frame spring motion mainly up-and-down.

## Shared Troubleshooting Notes

- The marker may blend into the background.
- Reflections may break red color detection.
- A poor camera angle can introduce apparent motion outside the chosen axis.
- Large release angles move the pendulum away from the simple model.
- Too few oscillations can make the final frequency estimate unstable.
- Background motion can produce false marker detections.

## Current App Support

The live app currently supports three experiment modes:

- Rope Pendulum: Mass Independence
- Rope Pendulum: Length Law
- Spring Pendulum: Mass Dependence

The manual also documents three planned spring experiments:

- Measuring Spring Constant
- Springs In Parallel
- Springs In Series

These planned experiments should be marked as documentation-only until matching
app modes exist.

## Chapter 1: Rope Pendulum

Rope-pendulum experiments use the small-angle pendulum model.

```text
T = 2*pi*sqrt(l / g)
f = 1 / T
f = (1 / (2*pi))*sqrt(g / l)
```

The main classroom idea is that, for small oscillations, frequency depends on
length and gravitational acceleration, not on bob mass.

## Experiment 1: Rope Pendulum - Mass Independence

### Goal

Show that the oscillation frequency of a simple pendulum does not depend on bob
mass when pendulum length is held fixed.

### Theory

For a small-angle pendulum, the restoring effect comes from gravity and the
geometry of the string. In the ideal model, mass cancels out of the equation of
motion.

```text
omega = sqrt(g / l)
f = (1 / (2*pi))*sqrt(g / l)
```

If length stays fixed, changing mass should not significantly change frequency.

### Variables

- Controlled variable: length `l`
- Varied variable: mass `m`
- Measured value: frequency `f`
- Current app warning tolerance: `0.005 m` for length consistency

### Apparatus

- Rope or string pendulum
- Interchangeable bob masses
- Red marker on the bob
- Meter stick or measuring tape
- Webcam or laptop camera

### Setup

- Measure length from the pivot to the center of the bob.
- Keep the same length for every run.
- Keep release angles small.
- Position the camera perpendicular to the swing plane.
- Align the swing mainly left-to-right in the camera frame.

### Procedure

1. Select `Mass Independence` in the live app.
2. Enter the fixed length.
3. Attach the first bob mass and enter its mass.
4. Start the run, release the bob gently, and record several oscillations.
5. Stop the run and keep it only if the marker trace is stable.
6. Repeat with different masses without changing length.
7. Compare saved frequency values.

### Data Table

| Run | Mass (g) | Length (m) | Frequency (Hz) | Keep? |
| --- | ---: | ---: | ---: | --- |
| 1 | 50 | 0.750 |  |  |
| 2 | 100 | 0.750 |  |  |
| 3 | 150 | 0.750 |  |  |

### Expected Graph

Frequency versus mass should be approximately flat.

### Expected Result

Changing the mass should produce only small frequency changes if length, release
angle, and camera setup remain controlled.

### Error Sources

- Accidentally changing pendulum length while changing the bob
- Releasing heavier or lighter bobs at different angles
- Marker slipping on the bob
- Air resistance and pivot friction

### Teacher Notes

Mass independence is an ideal-model result. It is strongest when the string is
light, the angle is small, and the pivot behaves consistently.

### App Support

Fully supported as a current live app mode.

## Experiment 2: Rope Pendulum - Length Law

### Goal

Show that pendulum frequency decreases as pendulum length increases.

### Theory

Longer pendulums take more time to complete each swing. The frequency follows an
inverse square-root dependence on length.

```text
omega = sqrt(g / l)
f = (1 / (2*pi))*sqrt(g / l)
f proportional to 1 / sqrt(l)
```

### Variables

- Controlled variable: mass `m`
- Varied variable: length `l`
- Measured value: frequency `f`
- Current app warning tolerance: `0.5 g` for mass consistency

### Apparatus

- Rope or string pendulum
- One bob mass
- Red marker on the bob
- Meter stick or measuring tape
- Webcam or laptop camera

### Setup

- Measure each length from the pivot to the center of the bob.
- Use the same bob for all runs.
- Keep release angles small.
- Position the camera perpendicular to the swing plane.

### Procedure

1. Select `Length Law` in the live app.
2. Enter the fixed mass.
3. Set the first length and enter it.
4. Capture and review a clean run.
5. Repeat with several different lengths.
6. Compare frequency versus length.
7. Optional: compare frequency versus `1 / sqrt(l)` for a more linear trend.

### Data Table

| Run | Mass (g) | Length (m) | 1/sqrt(length) | Frequency (Hz) |
| --- | ---: | ---: | ---: | ---: |
| 1 | 100 | 0.400 |  |  |
| 2 | 100 | 0.600 |  |  |
| 3 | 100 | 0.800 |  |  |

### Expected Graph

Frequency should decrease as length increases. Frequency versus `1 / sqrt(l)`
should be closer to a straight line.

### Expected Result

Longer pendulums oscillate more slowly.

### Error Sources

- Measuring length to the bottom of the bob instead of the center
- Large release angles
- Camera not perpendicular to the motion plane
- Too few oscillations in a run

### Teacher Notes

The length law is a good place to introduce linearization: compare `f` versus
`l`, then compare `f` versus `1 / sqrt(l)`.

### App Support

Fully supported as a current live app mode.

## Chapter 2: Spring Pendulum

Spring-pendulum experiments use the small vertical oscillation model for a mass
on a spring.

```text
omega = sqrt(k / m)
f = (1 / (2*pi))*sqrt(k / m)
```

The main classroom idea is that frequency increases with spring stiffness and
decreases with attached mass.

## Experiment 3: Spring Pendulum - Mass Dependence

### Goal

Show that vertical spring oscillation frequency decreases as attached mass
increases when the same spring is used.

### Theory

A heavier mass has more inertia, so the same spring accelerates it less strongly.
For one fixed spring:

```text
omega = sqrt(k / m)
f = (1 / (2*pi))*sqrt(k / m)
f proportional to 1 / sqrt(m)
```

### Variables

- Controlled variable: spring constant `k`
- Varied variable: mass `m`
- Measured value: frequency `f`
- Current app warning tolerance: `0.1 N/m` for spring constant consistency

### Apparatus

- One vertical spring
- Several hanging masses
- Red marker on the moving mass
- Support stand
- Webcam or laptop camera

### Setup

- Use the same spring for all runs.
- Keep motion vertical.
- Avoid sideways swinging.
- Keep stretches moderate so the spring stays close to Hooke's law behavior.
- Position the camera perpendicular to the vertical motion plane.

### Procedure

1. Select `Spring Pendulum` in the live app.
2. Enter the spring constant.
3. Attach the first mass and enter its mass.
4. Pull down slightly and release gently.
5. Capture several vertical oscillations.
6. Repeat with different masses.
7. Compare frequency versus mass.

### Data Table

| Run | Mass (g) | Spring k (N/m) | Frequency (Hz) | Keep? |
| --- | ---: | ---: | ---: | --- |
| 1 | 50 | 5.0 |  |  |
| 2 | 100 | 5.0 |  |  |
| 3 | 150 | 5.0 |  |  |

### Expected Graph

Frequency should decrease as mass increases. Frequency versus `1 / sqrt(m)`
should be closer to a straight line if mass is converted to kilograms.

### Expected Result

Increasing mass lowers the oscillation frequency for the same spring.

### Error Sources

- Sideways swinging
- Spring coils colliding
- Large stretches outside the linear range
- Forgetting to convert grams to kilograms for theory calculations

### Teacher Notes

This experiment is the spring equivalent of the pendulum length law. It also
prepares students for measuring and combining spring constants.

### App Support

Fully supported as a current live app mode.

## Experiment 4: Measuring Spring Constant

### Goal

Estimate the spring constant `k` using static extension.

### Theory

At rest, the downward weight of the mass is balanced by the upward spring force.

```text
F = mg
F = kx
k = mg / x
```

Here `x` is the extension from the spring's unloaded length.

### Variables

- Controlled variable: spring
- Varied variable: hanging mass
- Measured value: static extension `x`
- Calculated value: spring constant `k`

### Apparatus

- Vertical spring
- Support stand
- Several known masses
- Ruler or meter stick
- Pointer or marker for measuring extension

### Setup

- Measure the unloaded spring length.
- Hang each mass gently.
- Wait for the mass to come to rest before recording extension.
- Keep the ruler parallel to the spring.

### Procedure

1. Measure the unloaded spring length.
2. Hang a known mass.
3. Measure the new length.
4. Compute extension `x`.
5. Compute `k = mg / x`.
6. Repeat for several masses.
7. Compare the values of `k`.

### Data Table

| Run | Mass (kg) | Force mg (N) | Extension x (m) | k = mg/x (N/m) |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0.050 |  |  |  |
| 2 | 0.100 |  |  |  |
| 3 | 0.150 |  |  |  |

### Expected Graph

Force versus extension should be approximately linear. The slope is the spring
constant.

### Expected Result

For moderate extensions, the calculated `k` values should be similar.

### Error Sources

- Reading the ruler at an angle
- Measuring total length instead of extension
- Oscillations not fully stopped
- Using masses large enough to deform the spring

### Teacher Notes

This is a good bridge between static force balance and dynamic oscillation. The
measured `k` can be used in the spring frequency model.

### App Support

Documentation-only for now. The current live app lets students enter `k` but
does not yet guide static-extension measurements.

## Experiment 5: Springs In Parallel

### Goal

Show that two springs mounted side by side behave like a stiffer combined
spring.

### Theory

Parallel springs share the same extension. Their restoring forces add.

```text
k* = k1 + k2
```

### Variables

- Controlled variable: attached mass
- Varied variable: spring arrangement
- Measured value: frequency or static extension
- Calculated value: combined spring constant `k*`

### Apparatus

- Two springs
- Support stand with two mounting points
- One hanging mass
- Connector bar or hanger
- Red marker on the moving mass or hanger

### Setup

- Mount both springs side by side.
- Attach the same mass to both springs together.
- Keep the hanger level.
- Keep vertical motion centered.

### Procedure

1. Measure or identify `k1` and `k2`.
2. Mount the two springs in parallel.
3. Attach the mass to both springs together.
4. Measure static extension or oscillation frequency.
5. Compare the result with `k* = k1 + k2`.

### Data Table

| Spring 1 k (N/m) | Spring 2 k (N/m) | Predicted k* (N/m) | Measured k* (N/m) |
| ---: | ---: | ---: | ---: |
|  |  |  |  |

### Expected Graph

Compared with one spring, the parallel combination should have a larger `k` and
higher frequency for the same mass.

### Expected Result

The system becomes stiffer because both springs pull back at the same time.

### Error Sources

- Unequal spring lengths before loading
- Hanger not level
- One spring carrying more load than the other
- Sideways motion

### Teacher Notes

This experiment makes force addition visible. It is also a useful comparison
against the series spring experiment.

### App Support

Documentation-only for now. A future app mode should let students enter `k1`,
`k2`, arrangement type, and measured frequency.

## Experiment 6: Springs In Series

### Goal

Show that two springs connected end to end behave like a softer combined spring.

### Theory

Series springs carry the same force, but their extensions add.

```text
1 / k* = 1 / k1 + 1 / k2
k* = 1 / (1 / k1 + 1 / k2)
```

### Variables

- Controlled variable: attached mass
- Varied variable: spring arrangement
- Measured value: frequency or static extension
- Calculated value: combined spring constant `k*`

### Apparatus

- Two springs
- Support stand
- Connector between springs
- One hanging mass
- Red marker on the moving mass

### Setup

- Connect the springs end to end.
- Attach the mass to the lower spring.
- Keep the system vertical.
- Keep stretches moderate.

### Procedure

1. Measure or identify `k1` and `k2`.
2. Connect the springs in series.
3. Attach the mass to the lower spring.
4. Measure static extension or oscillation frequency.
5. Compare the result with the series-spring prediction.

### Data Table

| Spring 1 k (N/m) | Spring 2 k (N/m) | Predicted k* (N/m) | Measured k* (N/m) |
| ---: | ---: | ---: | ---: |
|  |  |  |  |

### Expected Graph

Compared with either spring alone, the series combination should have a smaller
`k` and lower frequency for the same mass.

### Expected Result

The system becomes softer because the total extension is the sum of both spring
extensions.

### Error Sources

- Springs rubbing against each other or the stand
- Connector mass not included consistently
- Large stretch outside the linear range
- Sideways motion

### Teacher Notes

Series springs are a useful contrast with parallel springs: same force,
different extension behavior.

### App Support

Documentation-only for now. A future app mode should let students compare
series and parallel arrangements directly.
