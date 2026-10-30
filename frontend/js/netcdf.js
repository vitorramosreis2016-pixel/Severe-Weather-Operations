import { NetCDFReader } from "https://esm.sh/netcdfjs@3.0.0";

(() => {
  const input = document.querySelector("#netcdf-file");
  const status = document.querySelector("#netcdf-status");
  const details = document.querySelector("#netcdf-details");
  if (!input || !status || !details) return;

  const formatDimensions = (reader, variable) => {
    const names = (variable.dimensions || []).map(index => {
      const dimension = reader.dimensions[index];
      return dimension ? `${dimension.name}=${dimension.size}` : `dim ${index}`;
    });
    return names.length ? names.join(" × ") : "scalar";
  };

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    details.hidden = true;
    details.replaceChildren();

    if (!file.name.toLowerCase().endsWith(".nc")) {
      status.textContent = "Import failed: choose a .nc file.";
      input.value = "";
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      status.textContent = "Import blocked: files larger than 1 GiB are not accepted in this browser importer.";
      input.value = "";
      return;
    }

    status.textContent = `Reading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MiB)…`;
    try {
      const buffer = await file.arrayBuffer();
      const reader = new NetCDFReader(buffer);
      const heading = document.createElement("strong");
      heading.textContent = file.name;
      const summary = document.createElement("p");
      summary.textContent = `${reader.dimensions.length} dimensions · ${reader.variables.length} variables · ${(file.size / 1024 / 1024).toFixed(1)} MiB`;
      const dimensionTitle = document.createElement("h3");
      dimensionTitle.textContent = "Dimensions";
      const dimensionList = document.createElement("p");
      dimensionList.textContent = reader.dimensions.map(d => `${d.name}: ${d.size}`).join(" · ") || "No dimensions";
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
      status.textContent = `Could not read this file: ${error.message}. It may be NetCDF-4/HDF5, which this browser importer does not support yet.`;
    } finally {
      input.value = "";
    }
  });
})();
