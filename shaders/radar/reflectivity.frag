#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_reflectivity;
uniform float u_min_dbz;
uniform float u_max_dbz;

out vec4 out_color;

vec3 radarColor(float dbz) {
    if (dbz < 5.0)  return vec3(0.00, 0.00, 0.00);
    if (dbz < 15.0) return vec3(0.00, 0.55, 0.20);
    if (dbz < 25.0) return vec3(0.20, 0.85, 0.25);
    if (dbz < 35.0) return vec3(0.95, 0.90, 0.10);
    if (dbz < 45.0) return vec3(1.00, 0.55, 0.05);
    if (dbz < 55.0) return vec3(0.95, 0.10, 0.08);
    if (dbz < 65.0) return vec3(0.85, 0.05, 0.75);
    return vec3(0.95, 0.85, 1.00);
}

void main() {
    float sample_value = texture(u_reflectivity, v_uv).r;
    float dbz = mix(u_min_dbz, u_max_dbz, clamp(sample_value, 0.0, 1.0));

    // Treat values below 5 dBZ as transparent background.
    if (dbz < 5.0) {
        out_color = vec4(0.0);
        return;
    }

    out_color = vec4(radarColor(dbz), 0.92);
}
