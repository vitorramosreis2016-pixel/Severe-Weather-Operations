const map = document.querySelector("#map-grid");
if (map) {
  const canvas = document.createElement("canvas");
  canvas.id = "radar-gl";
  canvas.setAttribute("aria-label", "GPU-rendered simulated radar reflectivity");
  canvas.setAttribute("role", "img");
  map.prepend(canvas);

  const gl = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!gl) {
    canvas.hidden = true;
    console.warn("WebGL2 unavailable; using the CSS radar fallback.");
  } else {
    const shaderURLs = [
      new URL("../../shaders/radar/reflectivity.vert", import.meta.url),
      new URL("../../shaders/radar/reflectivity.frag", import.meta.url)
    ];

    async function loadShader(url, type) {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load shader: " + url.pathname);
      const shader = gl.createShader(type);
      gl.shaderSource(shader, await response.text());
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message || "Shader compilation failed");
      }
      return shader;
    }

    function makeReflectivityTexture() {
      const width = 256, height = 192;
      const pixels = new Uint8Array(width * height * 4);
      const cells = [
        {x:.60,y:.38,rx:.19,ry:.22,power:1.0},
        {x:.48,y:.48,rx:.12,ry:.17,power:.78},
        {x:.24,y:.68,rx:.13,ry:.12,power:.68}
      ];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const nx = x / width, ny = y / height;
          let value = 0;
          for (const c of cells) {
            const dx = (nx-c.x)/c.rx, dy = (ny-c.y)/c.ry;
            const angle = Math.atan2(dy,dx);
            const radius = Math.sqrt(dx*dx + dy*dy);
            const irregular = 0.10*Math.sin(angle*5 + radius*9) + 0.06*Math.sin(angle*9-radius*5);
            const core = Math.max(0, 1-radius+irregular);
            value = Math.max(value, core*c.power);
          }
          const i = (y*width+x)*4;
          pixels[i] = Math.round(Math.min(1,value)*255);
          pixels[i+1] = 0;
          pixels[i+2] = 0;
          pixels[i+3] = value > .08 ? 255 : 0;
        }
      }
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return texture;
    }

    async function init() {
      const [vertexShader, fragmentShader] = await Promise.all([
        loadShader(shaderURLs[0], gl.VERTEX_SHADER),
        loadShader(shaderURLs[1], gl.FRAGMENT_SHADER)
      ]);
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Shader link failed");
      }
      gl.useProgram(program);

      const vertices = new Float32Array([
        -1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,
        -1,1, 0,1,   1,-1, 1,0,   1,1, 1,1
      ]);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
      const position = gl.getAttribLocation(program, "a_position");
      const uv = gl.getAttribLocation(program, "a_uv");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

      const texture = makeReflectivityTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_reflectivity"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_min_dbz"), 0);
      gl.uniform1f(gl.getUniformLocation(program, "u_max_dbz"), 75);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      function resize() {
        const rect = map.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(rect.width*dpr);
        canvas.height = Math.round(rect.height*dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      new ResizeObserver(resize).observe(map);
      resize();
      canvas.classList.add("radar-gl-ready");
      console.info("GLSL reflectivity shaders running on WebGL2.");
    }

    init().catch(error => {
      canvas.hidden = true;
      console.error("Radar shader initialization failed; using CSS fallback.", error);
    });
  }
}
