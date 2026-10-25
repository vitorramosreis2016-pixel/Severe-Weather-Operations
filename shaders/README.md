# GLSL shaders

This directory contains the initial GPU-rendering layer for Severe Weather Operations.

## Radar

- `radar/reflectivity.vert`: WebGL 2 vertex shader for a textured quad.
- `radar/reflectivity.frag`: maps normalized texture samples to radar-style reflectivity colors.

## Current status

These shaders are a starting point and are **not yet connected to the frontend**. The fragment shader expects a single-channel texture whose values are normalized between 0 and 1, plus `u_min_dbz` and `u_max_dbz` uniforms describing the data range. A later JavaScript WebGL2 renderer must compile the shaders, upload the reflectivity texture, set the uniforms, and draw the quad.

The color ramp is a visualization convention, not a meteorological retrieval algorithm. It does not calculate reflectivity from atmospheric variables.
