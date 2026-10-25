(() => {
  const $ = (selector) => document.querySelector(selector);
  let minutes = 18 * 60;
  let stormStep = 0;
  let nextId = 1;
  let selectedStorm = "A";
  let products = [];
  const log = $("#event-log");

  function timeLabel(value = minutes) {
    const h = Math.floor(value / 60) % 24;
    const m = value % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + "Z";
  }
  function addLog(message) {
    const item = document.createElement("li");
    const time = document.createElement("time");
    const text = document.createElement("span");
    time.textContent = timeLabel();
    text.textContent = message;
    item.append(time, text);
    log.prepend(item);
  }
  function renderProducts() {
    const list = $("#product-list");
    list.replaceChildren();
    const active = products.filter(p => p.active);
    $("#product-count").textContent = active.length + " ACTIVE";
    if (!active.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No products active. Issue a simulated product from the forecast desk.";
      list.append(empty);
      return;
    }
    active.slice().reverse().forEach(product => {
      const card = document.createElement("article");
      card.className = "product-card";
      const top = document.createElement("div"); top.className = "product-top";
      const title = document.createElement("strong"); title.textContent = product.type + " · " + product.area;
      const status = document.createElement("span"); status.className = "status"; status.textContent = "ACTIVE";
      top.append(title, status);
      const note = document.createElement("p"); note.textContent = product.note || "No forecaster note supplied.";
      const actions = document.createElement("div"); actions.className = "product-actions";
      const expires = document.createElement("span"); expires.textContent = "ISSUED " + product.issued + " · EXPIRES " + product.expires;
      const cancel = document.createElement("button"); cancel.className = "cancel-btn"; cancel.textContent = "Cancel";
      cancel.addEventListener("click", () => {
        product.active = false;
        addLog(product.type + " cancelled by forecaster (" + product.area + ").");
        renderProducts();
      });
      actions.append(expires, cancel);
      card.append(top, note, actions); list.append(card);
    });
  }
  function updateModelGuidance() {
    const model = $("#model-name").value;
    const run = $("#model-run").value;
    const field = $("#model-field").value;
    const hour = Number($("#forecast-hour").value);
    const fieldLabels = {
      reflectivity: "Simulated reflectivity",
      cape: "CAPE",
      shear: "0–6 km bulk shear",
      precip: "Accumulated precipitation"
    };
    const descriptions = {
      reflectivity: hour < 6 ? "Scattered simulated convection; monitor initiation zones." : hour < 18 ? "Organized simulated storm clusters are possible in the scenario." : "Later forecast hours have greater uncertainty in storm placement.",
      cape: hour < 12 ? "Synthetic instability field: use as environmental context, not a tornado prediction." : "Synthetic instability evolves with forecast time; values are illustrative, not observed or model-derived.",
      shear: "Illustrative wind-shear guidance for training. It is not calculated from a real model profile.",
      precip: hour < 12 ? "Synthetic precipitation signal is still developing in this scenario." : "Illustrative accumulated precipitation footprint; no real forecast data are loaded."
    };
    $("#forecast-hour-label").textContent = "F" + String(hour).padStart(3, "0");
    $("#model-summary-title").textContent = model + " · " + run + " · F" + String(hour).padStart(3, "0");
    $("#model-summary-text").textContent = fieldLabels[field] + ": " + descriptions[field];
  }
  ["#model-name", "#model-run", "#model-field", "#forecast-hour"].forEach(selector => {
    $(selector).addEventListener("input", updateModelGuidance);
    $(selector).addEventListener("change", updateModelGuidance);
  });
  function updateModelGuidance() {
    const model = $("#model-name").value;
    const run = $("#model-run").value;
    const field = $("#model-field").value;
    const hour = Number($("#forecast-hour").value);
    const fieldLabels = {
      reflectivity: "Simulated reflectivity",
      cape: "CAPE",
      shear: "0–6 km bulk shear",
      precip: "Accumulated precipitation"
    };
    const descriptions = {
      reflectivity: hour < 6 ? "Scattered simulated convection; monitor initiation zones." : hour < 18 ? "Organized simulated storm clusters are possible in the scenario." : "Later forecast hours have greater uncertainty in storm placement.",
      cape: hour < 12 ? "Synthetic instability field: use as environmental context, not a tornado prediction." : "Synthetic instability evolves with forecast time; values are illustrative, not observed or model-derived.",
      shear: "Illustrative wind-shear guidance for training. It is not calculated from a real model profile.",
      precip: hour < 12 ? "Synthetic precipitation signal is still developing in this scenario." : "Illustrative accumulated precipitation footprint; no real forecast data are loaded."
    };
    $("#forecast-hour-label").textContent = "F" + String(hour).padStart(3, "0");
    $("#model-summary-title").textContent = model + " · " + run + " · F" + String(hour).padStart(3, "0");
    $("#model-summary-text").textContent = fieldLabels[field] + ": " + descriptions[field];
  }
  ["#model-name", "#model-run", "#model-field", "#forecast-hour"].forEach(selector => {
    $(selector).addEventListener("input", updateModelGuidance);
    $(selector).addEventListener("change", updateModelGuidance);
  });
  function advance() {
    minutes += 5;
    stormStep += 1;
    $("#sim-time").textContent = timeLabel();
  updateModelGuidance();
    const stormA = $(".storm-a"), coreA = $(".core-a"), stormB = $(".storm-b"), coreB = $(".core-b");
    stormA.style.left = (39 + Math.min(stormStep * 1.15, 17)) + "%";
    stormA.style.top = (28 - Math.min(stormStep * .55, 8)) + "%";
    coreA.style.left = (54 + Math.min(stormStep * 1.15, 17)) + "%";
    coreA.style.top = (42 - Math.min(stormStep * .55, 8)) + "%";
    stormB.style.left = (13 + Math.min(stormStep * .8, 12)) + "%";
    coreB.style.left = (26 + Math.min(stormStep * .8, 12)) + "%";
    const dbz = Math.min(72, 62 + Math.floor(stormStep / 3));
    $("#max-dbz").innerHTML = dbz + ' <em>dBZ</em>';
    $("#storm-a-speed").textContent = (35 + Math.min(stormStep, 8)) + " kt";
    products.forEach(p => {
      if (p.active && minutes >= p.expiresAt) {
        p.active = false;
        addLog(p.type + " expired automatically (" + p.area + ").");
      }
    });
    addLog("Simulation advanced 5 minutes. Storm A max reflectivity: " + dbz + " dBZ.");
    renderProducts();
  }
  $("#advance-btn").addEventListener("click", advance);
  $("#reset-btn").addEventListener("click", () => {
    minutes = 18 * 60; stormStep = 0; products = [];
    $("#sim-time").textContent = timeLabel();
    $(".storm-a").style.left = "39%"; $(".storm-a").style.top = "28%";
    $(".core-a").style.left = "54%"; $(".core-a").style.top = "42%";
    $(".storm-b").style.left = "13%"; $(".core-b").style.left = "26%";
    $("#max-dbz").innerHTML = '62 <em>dBZ</em>'; $("#storm-a-speed").textContent = "35 kt";
    log.replaceChildren(); addLog("Scenario reset. Two simulated storms detected."); renderProducts();
  });
  document.querySelectorAll(".storm-row").forEach(row => row.addEventListener("click", () => {
    document.querySelectorAll(".storm-row").forEach(other => other.classList.remove("selected"));
    row.classList.add("selected"); selectedStorm = row.dataset.storm;
    addLog("Storm " + selectedStorm + " selected for monitoring.");
  }));
  $("#issue-btn").addEventListener("click", () => {
    const type = $("#product-type").value;
    const area = $("#product-area").value;
    const note = $("#product-text").value.trim();
    const duration = type === "Watch" ? 120 : type === "Warning" ? 60 : type === "Discussion" ? 90 : 30;
    const product = {id: nextId++, type, area, note, issued: timeLabel(), expires: timeLabel(minutes + duration), expiresAt: minutes + duration, active: true};
    products.push(product);
    $("#product-text").value = "";
    addLog(type + " issued for " + area + "; expires in " + duration + " simulated minutes.");
    renderProducts();
  });
  $("#sim-time").textContent = timeLabel();
  updateModelGuidance();
})();