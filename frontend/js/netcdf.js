(() => {
  const input = document.querySelector("#netcdf-file");
  const status = document.querySelector("#netcdf-status");
  const details = document.querySelector("#netcdf-details");
  if (!input || !status || !details) {
    console.error("[SWO] NetCDF importer elements were not found.");
    return;
  }

  const formatDimensions = (reader, variable) =>
    (variable.dimensions || []).map(index => {
      const dimension = reader.dimensions[index];
      return dimension ? `${dimension.name}=${dimension.size}` : `dim ${index}`;
    }).join(" × ") || "scalar";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    details.hidden = true;
    details.replaceChildren();
    status.textContent = `File selected: ${file.name}. Preparing to read…`;

    if (!file.name.toLowerCase().endsWith(".nc")) {
      status.textContent = "Import failed: choose a .nc file.";
      input.value = "";
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      status.textContent = "Import blocked: files larger than 1 GiB are not accepted.";
      input.value = "";
      return;
    }

    try {
      status.textContent = `Reading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MiB)…`;

      // Load the parser only after a file is selected. A CDN/import failure
      // can no longer prevent this module from registering its file listener.
      const { NetCDFReader } = await import("https://esm.sh/netcdfjs@3.0.0");
      const buffer = await file.arrayBuffer();
      const reader = new NetCDFReader(buffer);

      const heading = document.createElement("strong");
      heading.textContent = file.name;
      const summary = document.createElement("p");
      summary.textContent = `${reader.dimensions.length} dimensions · ${reader.variables.length} variables · ${(file.size / 1024 / 1024).toFixed(1)} MiB`;

      const dimensionTitle = document.createElement("h3");
      dimensionTitle.textContent = "Dimensions";
      const dimensionList = document.createElement("p");
      dimensionList.textContent = reader.dimensions
        .map(d => `${d.name}: ${d.size}`).join(" · ") || "No dimensions";

      const variableTitle = document.createElement("h3");
      variableTitle.textContent = "Variables";
      const variableList = document.createElement("ul");
      reader.variables.forEach(variable => {
        const item = document.createElement("li");
        const units = variable.attributes?.find(a => a.name === "units")?.value;
        item.textContent = `${variable.name} — ${formatDimensions(reader, variable)}${units ? ` · ${units}` : ""}`;
        variableList.append(item);
      });

      details.append(heading, summary, dimensionTitle, dimensionList, variableTitle, variableList);
      details.hidden = false;
      status.textContent = "NetCDF classic file loaded successfully. Metadata is ready to inspect.";

      window.dispatchEvent(new CustomEvent("swo-netcdf-loaded", {
        detail: {
          fileName: file.name,
          dimensions: reader.dimensions,
          variables: reader.variables.map(v => ({
            name: v.name,
            dimensions: v.dimensions,
            attributes: v.attributes
          }))
        }
      }));
      window.SWO?.setNetCDF?.(reader, file.name);
    } catch (error) {
      console.error("[SWO] NetCDF import failed:", error);
      status.textContent = `Import error: ${error.message || error}. Check the connection and confirm the file is NetCDF classic (CDF-1/CDF-2).`;
    } finally {
      input.value = "";
    }
  });

  status.textContent = "NetCDF importer ready. Select a .nc file.";
})();
