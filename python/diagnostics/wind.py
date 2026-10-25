"""Wind-profile diagnostics for idealized severe-weather scenarios.

Wind components use meteorological convention: u is east-west and v is
north-south, in m/s. Heights are meters AGL. This module operates on supplied
profiles; it does not fetch observations or run an atmospheric model.
"""
from __future__ import annotations

from collections.abc import Sequence
from math import hypot


def _validate_profile(
    heights_m: Sequence[float],
    u_ms: Sequence[float],
    v_ms: Sequence[float],
) -> None:
    if not (len(heights_m) == len(u_ms) == len(v_ms)):
        raise ValueError("heights_m, u_ms and v_ms must have equal lengths")
    if len(heights_m) < 2:
        raise ValueError("at least two wind levels are required")
    if any(b <= a for a, b in zip(heights_m, heights_m[1:])):
        raise ValueError("heights_m must be strictly increasing")


def interpolate_wind(
    heights_m: Sequence[float],
    values_ms: Sequence[float],
    target_m: float,
) -> float:
    """Linearly interpolate a wind component at a height in meters AGL."""
    if target_m < heights_m[0] or target_m > heights_m[-1]:
        raise ValueError("target height is outside the supplied profile")
    for i in range(len(heights_m) - 1):
        z0, z1 = heights_m[i], heights_m[i + 1]
        if z0 <= target_m <= z1:
            fraction = (target_m - z0) / (z1 - z0)
            return values_ms[i] + fraction * (values_ms[i + 1] - values_ms[i])
    return float(values_ms[-1])


def bulk_shear(
    heights_m: Sequence[float],
    u_ms: Sequence[float],
    v_ms: Sequence[float],
    bottom_m: float = 0.0,
    top_m: float = 6000.0,
) -> dict[str, float]:
    """Return signed u/v shear and vector magnitude between two heights."""
    _validate_profile(heights_m, u_ms, v_ms)
    if top_m <= bottom_m:
        raise ValueError("top_m must be greater than bottom_m")
    u_bottom = interpolate_wind(heights_m, u_ms, bottom_m)
    v_bottom = interpolate_wind(heights_m, v_ms, bottom_m)
    u_top = interpolate_wind(heights_m, u_ms, top_m)
    v_top = interpolate_wind(heights_m, v_ms, top_m)
    du, dv = u_top - u_bottom, v_top - v_bottom
    return {
        "bottom_m": float(bottom_m),
        "top_m": float(top_m),
        "du_ms": du,
        "dv_ms": dv,
        "magnitude_ms": hypot(du, dv),
    }


def storm_relative_helicity(
    heights_m: Sequence[float],
    u_ms: Sequence[float],
    v_ms: Sequence[float],
    storm_u_ms: float,
    storm_v_ms: float,
    bottom_m: float = 0.0,
    top_m: float = 3000.0,
) -> float:
    """Integrate storm-relative helicity using the supplied discrete profile.

    Returns m^2/s^2. The sign follows the supplied coordinate and wind
    conventions; no Northern/Southern Hemisphere sign flip is applied.
    Wind is linearly interpolated at layer boundaries before integration.
    """
    _validate_profile(heights_m, u_ms, v_ms)
    if top_m <= bottom_m:
        raise ValueError("top_m must be greater than bottom_m")
    if bottom_m < heights_m[0] or top_m > heights_m[-1]:
        raise ValueError("requested layer is outside the supplied profile")

    points = [(bottom_m,
               interpolate_wind(heights_m, u_ms, bottom_m),
               interpolate_wind(heights_m, v_ms, bottom_m))]
    points.extend(
        (z, u, v)
        for z, u, v in zip(heights_m, u_ms, v_ms)
        if bottom_m < z < top_m
    )
    points.append((top_m,
                   interpolate_wind(heights_m, u_ms, top_m),
                   interpolate_wind(heights_m, v_ms, top_m)))

    total = 0.0
    for (_, u0, v0), (_, u1, v1) in zip(points, points[1:]):
        u0r, v0r = u0 - storm_u_ms, v0 - storm_v_ms
        u1r, v1r = u1 - storm_u_ms, v1 - storm_v_ms
        total += u0r * v1r - v0r * u1r
    return total
