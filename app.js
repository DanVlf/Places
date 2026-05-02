const storageKey = "places.items.v1";
const mapPanel = document.querySelector(".mapPanel");
const mapView = document.querySelector("#mapView");
const mapCanvas = document.querySelector("#mapCanvas");
const locationOverlay = document.querySelector("#locationOverlay");
const context = mapCanvas.getContext("2d");
const placesList = document.querySelector("#placesList");
const categoryList = document.querySelector("#categoryList");
const placeTemplate = document.querySelector("#placeTemplate");
const countLabel = document.querySelector("#countLabel");
const toast = document.querySelector("#toast");
const addButton = document.querySelector("#addButton");
const locateButton = document.querySelector("#locateButton");
const importButton = document.querySelector("#importButton");
const exportButton = document.querySelector("#exportButton");
const fileInput = document.querySelector("#fileInput");
const placesButton = document.querySelector("#placesButton");
const categoriesButton = document.querySelector("#categoriesButton");
const mapPage = document.querySelector("#mapPage");
const categoryPage = document.querySelector("#categoryPage");
const editor = document.querySelector("#editor");
const placeForm = document.querySelector("#placeForm");
const cancelButton = document.querySelector("#cancelButton");
const nameInput = document.querySelector("#nameInput");
const latInput = document.querySelector("#latInput");
const lngInput = document.querySelector("#lngInput");
const tagInput = document.querySelector("#tagInput");
const noteInput = document.querySelector("#noteInput");
const iconInput = document.querySelector("#iconInput");
const iconPicker = document.querySelector("#iconPicker");
const dismissKeyboardButton = document.querySelector("#dismissKeyboardButton");
const deletePanel = document.querySelector("#deletePanel");
const deletePlaceButton = document.querySelector("#deletePlaceButton");

let places = loadPlaces();
let editingId = null;
let selectedId = places[0]?.id ?? null;
let activePage = "places";
let map = null;
let markerLayer = null;
let locationMarker = null;
let currentLocation = null;
let toastTimer = null;
let locating = false;
let centerOnLocation = false;
let browserWatchId = null;
let activeCategory = null;
let expandedCategory = null;
let deleteArmed = false;
let renamingCategory = null;
const defaultCenter = [50.0755, 14.4378];
const defaultZoom = 16;
const emptyBounds = { minLat: 49.96, maxLat: 50.16, minLng: 14.25, maxLng: 14.58 };
const categoryIcons = [
  { key: "pin", label: "Place", glyph: "+", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z\"/><circle cx=\"12\" cy=\"9\" r=\"2\"/></svg>" },
  { key: "home", label: "Home", glyph: "H", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M4 11 12 4l8 7\"/><path d=\"M6 10v10h12V10\"/><path d=\"M10 20v-6h4v6\"/></svg>" },
  { key: "cafe", label: "Cafe", glyph: "C", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z\"/><path d=\"M16 9h2a3 3 0 0 1 0 6h-2\"/><path d=\"M7 4v2M11 4v2M15 4v2\"/></svg>" },
  { key: "hospital", label: "Hospital", glyph: "M", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 21V5h14v16\"/><path d=\"M9 21v-5h6v5\"/><path d=\"M12 8v5M9.5 10.5h5\"/></svg>" },
  { key: "food", label: "Food", glyph: "F", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M7 3v8M10 3v8M7 7h3M17 3v18M14 3v7a3 3 0 0 0 3 3\"/></svg>" },
  { key: "shop", label: "Shop", glyph: "S", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 10h14l-1 11H6Z\"/><path d=\"M8 10a4 4 0 0 1 8 0\"/></svg>" },
  { key: "work", label: "Work", glyph: "W", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M4 8h16v12H4Z\"/><path d=\"M9 8V5h6v3\"/><path d=\"M4 13h16\"/></svg>" },
  { key: "park", label: "Park", glyph: "P", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 21V9\"/><path d=\"M8 13a4 4 0 1 1 8 0\"/><path d=\"M7 10a5 5 0 0 1 10 0\"/></svg>" },
  { key: "car", label: "Car", glyph: "A", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M5 16h14l-2-6H7Z\"/><path d=\"M5 16v3M19 16v3\"/><circle cx=\"8\" cy=\"18\" r=\"1\"/><circle cx=\"16\" cy=\"18\" r=\"1\"/></svg>" },
  { key: "star", label: "Favorite", glyph: "*", svg: "<svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9Z\"/></svg>" }
];

function loadPlaces() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]").filter(isPlace);
  } catch {
    return [];
  }
}

function savePlaces() {
  localStorage.setItem(storageKey, JSON.stringify(places));
}

function isPlace(place) {
  return place && typeof place.name === "string" && Number.isFinite(place.lat) && Number.isFinite(place.lng);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePlace(input) {
  const coordinates = readCoordinates(input);
  if (!coordinates) {
    return null;
  }
  const name = String(input.name || input.title || input.Name || input.Title || input.label || input["Název"] || input["Nazev"] || "Untitled place").trim();
  const tag = normalizeCategory(input.tag || input.category || input.Category || input.folder);
  const icon = normalizeIcon(input.icon || input.Icon || input.symbol || findCategoryIcon(tag));
  const note = normalizeNote(input);
  return {
    id: input.id || createId(),
    name: name || "Untitled place",
    lat: coordinates.lat,
    lng: coordinates.lng,
    tag,
    icon,
    note
  };
}

function normalizeCategory(category) {
  if (Array.isArray(category)) {
    return category.filter(Boolean).join("; ");
  }
  return String(category || "").trim();
}

function getCategoryNameFromFilename(filename) {
  const baseName = String(filename || "").replace(/\.[^.]+$/, "");
  const withoutPrefix = baseName.replace(/^places[-_\s]*/i, "");
  const withoutDate = withoutPrefix.replace(/[-_\s]*\d{4}[-_]\d{2}[-_]\d{2}$/i, "");
  return withoutDate.replace(/[_-]+/g, " ").trim();
}

function normalizeNote(input) {
  const lines = [
    input.note || input.description || input.Description || input.fullAddress || input.address || input.notes || input["Poznámka"] || input["Poznamka"] || input["Komentář"] || input["Komentar"],
    input.website,
    input.googleMapsUrl || input.mapsUrl || input["Adresa URL"]
  ];
  return lines.filter(Boolean).map((item) => String(item).trim()).filter(Boolean).join("\n");
}

function normalizeIcon(icon) {
  const value = String(icon || "").trim();
  const exact = categoryIcons.find((item) => item.key === value);
  if (exact) {
    return exact.key;
  }
  const legacy = categoryIcons.find((item) => item.glyph === value);
  return legacy?.key || categoryIcons[0].key;
}

function findCategoryIcon(tag) {
  const match = places.find((place) => (place.tag || "") === (tag || ""));
  return normalizeIcon(match?.icon || guessCategoryIcon(tag));
}

function guessCategoryIcon(tag) {
  const value = String(tag || "").toLowerCase();
  if (value.includes("home") || value.includes("dum") || value.includes("dům") || value.includes("byt")) {
    return "home";
  }
  if (value.includes("cafe") || value.includes("kav") || value.includes("coffee") || value.includes("brunch") || value.includes("breakfast")) {
    return "cafe";
  }
  if (value.includes("hospital") || value.includes("nemoc") || value.includes("doctor") || value.includes("lek")) {
    return "hospital";
  }
  if (value.includes("food") || value.includes("rest") || value.includes("jid") || value.includes("jíd")) {
    return "food";
  }
  if (value.includes("shop") || value.includes("obchod")) {
    return "shop";
  }
  if (value.includes("work") || value.includes("prace") || value.includes("práce")) {
    return "work";
  }
  if (value.includes("park")) {
    return "park";
  }
  if (value.includes("car") || value.includes("auto")) {
    return "car";
  }
  return "pin";
}

function getIconOption(icon) {
  return categoryIcons.find((item) => item.key === normalizeIcon(icon)) || categoryIcons[0];
}

function renderIcon(icon) {
  return getIconOption(icon).svg;
}

function renderIconLabel(icon) {
  return getIconOption(icon).glyph;
}

function getVisiblePlaces() {
  return activeCategory ? places.filter((place) => (place.tag || "Uncategorized") === activeCategory) : places;
}

function readCoordinates(input) {
  const lat = Number(input.lat ?? input.latitude ?? input.Latitude ?? input.LAT);
  const lng = Number(input.lng ?? input.lon ?? input.long ?? input.longitude ?? input.Longitude ?? input.LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  const urlCoordinates = readCoordinatesFromUrl(input.googleMapsUrl || input.mapsUrl || input.url || input["Adresa URL"]);
  if (urlCoordinates) {
    return urlCoordinates;
  }
  if (Array.isArray(input.coordinates) && input.coordinates.length >= 2) {
    const first = Number(input.coordinates[0]);
    const second = Number(input.coordinates[1]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return { lat: second, lng: first };
    }
  }
  if (input.geometry?.location) {
    return readCoordinates(input.geometry.location);
  }
  if (input.geometry?.coordinates) {
    return readCoordinates({ coordinates: input.geometry.coordinates });
  }
  return null;
}

function readCoordinatesFromUrl(url) {
  const text = String(url || "");
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:query|q)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function initMap() {
  if (!window.L || !mapView) {
    useFallbackMap();
    return;
  }
  map = L.map(mapView, {
    center: defaultCenter,
    zoom: defaultZoom,
    zoomControl: true,
    attributionControl: true
  });
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  });
  tiles.on("load", () => {
    mapPanel.classList.remove("isFallback");
    mapPanel.classList.add("hasTiles");
  });
  tiles.on("tileerror", () => showToast("Some map tiles failed"));
  tiles.addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  locationMarker = L.layerGroup().addTo(map);
  map.on("click", (event) => {
    openEditor({
      name: "",
      lat: Number(event.latlng.lat.toFixed(6)),
      lng: Number(event.latlng.lng.toFixed(6)),
      tag: "",
      note: ""
    });
  });
  map.on("move zoom resize", renderLocationOverlay);
  window.addEventListener("resize", invalidateMapSize);
  invalidateMapSize();
}

function invalidateMapSize() {
  if (!map) {
    return;
  }
  requestAnimationFrame(() => {
    map.invalidateSize();
  });
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 300);
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 1000);
}

function useFallbackMap() {
  if (map) {
    map.remove();
    map = null;
    markerLayer = null;
    locationMarker = null;
  }
  mapPanel.classList.add("isFallback");
  renderFallbackMap();
}

function render() {
  countLabel.textContent = String(places.length);
  renderMap();
  renderList();
  renderCategories();
}

function renderMap() {
  renderLocationOverlay();
  if (map && markerLayer) {
    renderLeafletMap();
  } else {
    renderFallbackMap();
  }
}

function renderLeafletMap() {
  const visiblePlaces = getVisiblePlaces();
  markerLayer.clearLayers();
  locationMarker.clearLayers();
  if (currentLocation) {
    L.circleMarker([currentLocation.lat, currentLocation.lng], {
      radius: 5,
      color: "#050505",
      weight: 2,
      fillColor: "#ffffff",
      fillOpacity: 1
    }).addTo(locationMarker);
  }
  if (visiblePlaces.length === 0) {
    if (!currentLocation) {
      map.setView(defaultCenter, defaultZoom);
    } else {
      map.setView([currentLocation.lat, currentLocation.lng], 18);
    }
    renderLocationOverlay();
    return;
  }
  const bounds = [];
  visiblePlaces.forEach((place) => {
    const selected = place.id === selectedId;
    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({
        className: "",
        html: `<span class="placeMarker${selected ? " isSelected" : ""}">${renderIcon(place.icon)}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
    });
    marker.on("click", () => {
      selectedId = place.id;
      centerOnLocation = false;
      openEditor(place);
      render();
    });
    marker.addTo(markerLayer);
    bounds.push([place.lat, place.lng]);
  });
  if (centerOnLocation && currentLocation) {
    map.setView([currentLocation.lat, currentLocation.lng], 18);
    centerOnLocation = false;
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 17);
  } else {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
  }
  renderLocationOverlay();
}

function renderLocationOverlay() {
  if (!locationOverlay) {
    return;
  }
  locationOverlay.style.display = "none";
}

function renderFallbackMap() {
  const visiblePlaces = getVisiblePlaces();
  const width = mapCanvas.width;
  const height = mapCanvas.height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  drawMapBase(width, height);
  if (visiblePlaces.length === 0) {
    if (currentLocation) {
      drawFallbackLocation(currentLocation, getBounds([currentLocation]), width, height);
      return;
    }
    context.fillStyle = "#050505";
    context.font = "30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("No places yet", width / 2, height / 2);
    context.font = "18px Arial";
    context.fillText("Add or import", width / 2, height / 2 + 42);
    return;
  }
  const bounds = getBounds(currentLocation ? [...visiblePlaces, currentLocation] : visiblePlaces);
  visiblePlaces.forEach((place) => {
    const point = project(place, bounds, width, height);
    const selected = place.id === selectedId;
    context.beginPath();
    context.fillStyle = selected ? "#050505" : "#ffffff";
    context.strokeStyle = "#050505";
    context.lineWidth = selected ? 5 : 3;
    context.arc(point.x, point.y, selected ? 13 : 10, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = selected ? "#ffffff" : "#050505";
    context.font = "15px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(renderIconLabel(place.icon), point.x, point.y);
  });
  if (currentLocation) {
    drawFallbackLocation(currentLocation, bounds, width, height);
  }
}

function drawFallbackLocation(location, bounds, width, height) {
  const point = project(location, bounds, width, height);
  context.beginPath();
  context.fillStyle = "#050505";
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  context.arc(point.x, point.y, 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.strokeStyle = "#050505";
  context.lineWidth = 1;
  context.stroke();
}

function drawMapBase(width, height) {
  context.strokeStyle = "#d8d8d8";
  context.lineCap = "round";
  context.lineJoin = "round";
  drawLine([[44, 118], [184, 150], [314, 118], [482, 142], [676, 102]], 28);
  drawLine([[62, 530], [190, 466], [330, 482], [464, 424], [640, 448]], 24);
  drawLine([[120, 44], [158, 188], [142, 332], [198, 496], [248, 676]], 18);
  drawLine([[414, 36], [388, 178], [414, 318], [382, 500], [434, 676]], 18);
  drawLine([[36, 318], [174, 300], [324, 326], [504, 286], [684, 320]], 16);
  drawLine([[68, 650], [212, 592], [368, 608], [530, 560], [690, 588]], 14);
  context.strokeStyle = "#050505";
  drawLine([[44, 212], [178, 246], [300, 222], [438, 250], [644, 214]], 7);
  drawLine([[86, 44], [236, 184], [342, 344], [514, 492], [654, 676]], 6);
  drawLine([[510, 54], [466, 212], [522, 350], [494, 504], [560, 656]], 6);
  drawLine([[40, 398], [196, 376], [326, 414], [502, 382], [682, 404]], 6);
  drawLine([[242, 42], [286, 174], [260, 300], [322, 452], [292, 672]], 5);
  context.strokeStyle = "#050505";
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);
  context.fillStyle = "#050505";
  context.font = "18px Arial";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("N", 22, 18);
}

function drawLine(points, size) {
  context.lineWidth = size;
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function getBounds(items) {
  if (items.length === 0) {
    return emptyBounds;
  }
  const lats = items.map((place) => place.lat);
  const lngs = items.map((place) => place.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  if (minLat === maxLat) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  if (minLng === maxLng) {
    minLng -= 0.01;
    maxLng += 0.01;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function project(place, bounds, width, height) {
  const padding = 42;
  const x = padding + ((place.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - padding * 2);
  const y = height - padding - ((place.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (height - padding * 2);
  return { x, y };
}

function renderList() {
  placesList.replaceChildren();
  placesList.parentElement.hidden = true;
  getVisiblePlaces().slice(0, 2).forEach((place) => {
    const node = placeTemplate.content.firstElementChild.cloneNode(true);
    const button = node.querySelector(".placeButton");
    node.querySelector(".placeName").textContent = `${renderIconLabel(place.icon)} ${place.name}`;
    node.querySelector(".placeMeta").textContent = [place.tag, formatCoordinate(place.lat, place.lng)].filter(Boolean).join(" - ");
    button.addEventListener("click", () => {
      selectedId = place.id;
      centerOnLocation = false;
      openEditor(place);
      render();
    });
    node.querySelector(".deleteButton").addEventListener("click", () => {
      places = places.filter((item) => item.id !== place.id);
      if (selectedId === place.id) {
        selectedId = places[0]?.id ?? null;
      }
      savePlaces();
      closeEditor();
      render();
    });
    placesList.append(node);
  });
}

function renderCategories() {
  const groups = new Map();
  places.forEach((place) => {
    const name = place.tag || "Uncategorized";
    const group = groups.get(name) || { places: [], icon: normalizeIcon(place.icon) };
    group.places.push(place);
    groups.set(name, group);
  });
  categoryList.replaceChildren();
  if (groups.size === 0) {
    const item = document.createElement("li");
    const button = createCategoryButton("No categories", 0, "pin");
    item.append(button);
    categoryList.append(item);
    return;
  }
  [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, group]) => {
    const item = document.createElement("li");
    const button = createCategoryButton(name, group.places.length, group.icon);
    button.classList.toggle("isActive", expandedCategory === name);
    button.addEventListener("click", () => {
      expandedCategory = expandedCategory === name ? null : name;
      render();
    });
    item.append(button);
    if (expandedCategory === name) {
      const tools = document.createElement("section");
      tools.className = "categoryTools";
      if (renamingCategory === name) {
        const input = document.createElement("input");
        const saveButton = document.createElement("button");
        const cancelButton = document.createElement("button");
        input.className = "categoryRenameInput";
        input.value = name === "Uncategorized" ? "" : name;
        input.placeholder = "Category name";
        saveButton.type = "button";
        cancelButton.type = "button";
        saveButton.textContent = "Save";
        cancelButton.textContent = "Cancel";
        saveButton.addEventListener("click", () => renameCategory(name, input.value));
        cancelButton.addEventListener("click", () => {
          renamingCategory = null;
          render();
        });
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            renameCategory(name, input.value);
          }
        });
        tools.append(input, saveButton, cancelButton);
        setTimeout(() => input.focus(), 0);
      } else {
        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.textContent = "Rename";
        renameButton.addEventListener("click", () => {
          renamingCategory = name;
          render();
        });
        tools.append(renameButton);
      }
      item.append(tools);
      const list = document.createElement("section");
      list.className = "categoryPlaces";
      group.places.forEach((place) => {
        const placeButton = document.createElement("button");
        const iconNode = document.createElement("span");
        const nameNode = document.createElement("span");
        placeButton.className = "categoryPlaceButton";
        placeButton.type = "button";
        iconNode.className = "categoryIcon";
        iconNode.innerHTML = renderIcon(place.icon);
        nameNode.textContent = place.name;
        placeButton.append(iconNode, nameNode);
        placeButton.addEventListener("click", () => {
          activeCategory = name;
          selectedId = place.id;
          centerOnLocation = false;
          switchPage("places");
          render();
        });
        list.append(placeButton);
      });
      item.append(list);
    }
    categoryList.append(item);
  });
}

function renameCategory(oldName, newName) {
  const cleanName = String(newName || "").trim();
  places = places.map((place) => {
    const currentName = place.tag || "Uncategorized";
    if (currentName !== oldName) {
      return place;
    }
    return { ...place, tag: cleanName };
  });
  if (activeCategory === oldName) {
    activeCategory = cleanName || null;
  }
  if (expandedCategory === oldName) {
    expandedCategory = cleanName || "Uncategorized";
  }
  renamingCategory = null;
  savePlaces();
  render();
}

function createCategoryButton(name, count, icon) {
  const button = document.createElement("button");
  const iconNode = document.createElement("span");
  const nameNode = document.createElement("span");
  const countNode = document.createElement("span");
  button.className = "categoryButton";
  button.type = "button";
  iconNode.className = "categoryIcon";
  nameNode.className = "categoryName";
  countNode.className = "categoryCount";
  iconNode.innerHTML = renderIcon(icon);
  nameNode.textContent = name;
  countNode.textContent = String(count);
  button.append(iconNode, nameNode, countNode);
  return button;
}

function formatCoordinate(lat, lng) {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function showToast(message, duration = 2200) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

function renderIconPicker(selectedIcon) {
  iconPicker.replaceChildren();
  categoryIcons.forEach((icon) => {
    const button = document.createElement("button");
    button.className = `iconButton${icon.key === selectedIcon ? " isSelected" : ""}`;
    button.type = "button";
    button.setAttribute("aria-label", icon.label);
    button.innerHTML = icon.svg;
    button.addEventListener("click", () => {
      iconInput.value = icon.key;
      renderIconPicker(icon.key);
      document.activeElement?.blur();
    });
    iconPicker.append(button);
  });
}

function hideKeyboard() {
  document.activeElement?.blur();
}

function locateDevice() {
  if (locating) {
    return;
  }
  locating = true;
  if (window.ReactNativeWebView) {
    showToast("Locating...");
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "locate" }));
  }
  if (!navigator.geolocation) {
    if (!window.ReactNativeWebView) {
      locating = false;
      showToast("Location unavailable");
    }
    return;
  }
  showToast("Locating...");
  if (browserWatchId !== null) {
    navigator.geolocation.clearWatch(browserWatchId);
  }
  browserWatchId = navigator.geolocation.watchPosition(handleLocationSuccess, handleLocationError, {
    enableHighAccuracy: false,
    maximumAge: 86400000
  });
}

function handleLocationSuccess(position) {
  locating = false;
  if (browserWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(browserWatchId);
    browserWatchId = null;
  }
  const lat = Number(position.coords.latitude.toFixed(6));
  const lng = Number(position.coords.longitude.toFixed(6));
  currentLocation = { lat, lng };
  centerOnLocation = true;
  showToast("Location found");
  render();
  setTimeout(renderLocationOverlay, 300);
}

function handleLocationError(error) {
  if (window.ReactNativeWebView) {
    showToast("Waiting GPS", 3200);
    return;
  }
  locating = false;
  if (browserWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(browserWatchId);
    browserWatchId = null;
  }
  const messages = {
    1: "Location denied",
    2: "Location unavailable",
    3: "Location timeout"
  };
  showToast(messages[error.code] || "Location failed");
}

function handleNativeMessage(event) {
  try {
    const message = JSON.parse(event.data);
    if (message.type === "location") {
      handleLocationSuccess({
        coords: {
          latitude: message.lat,
          longitude: message.lng,
          accuracy: message.accuracy
        }
      });
    }
    if (message.type === "locationError") {
      locating = false;
      showToast(message.message || "Location failed");
    }
    if (message.type === "locationStatus") {
      if (message.message === "Getting location") {
        showToast("Getting GPS", 1400);
      } else if (message.message === "Waiting GPS") {
        showToast("Waiting GPS", 3200);
      }
    }
  } catch {
    locating = false;
    showToast("Location failed");
  }
}

function openEditor(place) {
  editingId = place?.id ?? null;
  deleteArmed = false;
  nameInput.value = place?.name ?? "";
  latInput.value = place?.lat ?? currentLocation?.lat ?? "";
  lngInput.value = place?.lng ?? currentLocation?.lng ?? "";
  tagInput.value = place?.tag ?? (activeCategory && activeCategory !== "Uncategorized" ? activeCategory : "");
  iconInput.value = normalizeIcon(place?.icon || findCategoryIcon(tagInput.value));
  noteInput.value = place?.note ?? "";
  hideKeyboard();
  renderIconPicker(iconInput.value);
  deletePanel.hidden = !editingId;
  deletePlaceButton.textContent = "Delete place";
  deletePlaceButton.classList.remove("isArmed");
  editor.hidden = false;
  nameInput.focus();
}

function closeEditor() {
  editingId = null;
  deleteArmed = false;
  placeForm.reset();
  deletePanel.hidden = true;
  deletePlaceButton.textContent = "Delete place";
  deletePlaceButton.classList.remove("isArmed");
  editor.hidden = true;
}

function deleteEditingPlace() {
  if (!editingId) {
    return;
  }
  if (!deleteArmed) {
    deleteArmed = true;
    deletePlaceButton.textContent = "Confirm delete";
    deletePlaceButton.classList.add("isArmed");
    return;
  }
  places = places.filter((item) => item.id !== editingId);
  selectedId = places[0]?.id ?? null;
  savePlaces();
  closeEditor();
  render();
}

function upsertPlace(place) {
  if (editingId) {
    places = places.map((item) => item.id === editingId ? { ...place, id: editingId } : item);
    selectedId = editingId;
  } else {
    places = [{ ...place, id: createId() }, ...places];
    selectedId = places[0].id;
  }
  savePlaces();
  closeEditor();
  activeCategory = place.tag || "Uncategorized";
  render();
}

function importPlaces(items, categoryName = "") {
  const incoming = items.map((item) => normalizePlace(categoryName ? { ...item, tag: categoryName, category: categoryName, Category: categoryName } : item)).filter(Boolean);
  if (incoming.length === 0 && items.length > 0) {
    showToast("No coordinates in file");
    return;
  }
  const existingKeys = new Set(places.map((place) => `${place.name}|${place.lat}|${place.lng}`));
  const fresh = incoming.filter((place) => {
    const key = `${place.name}|${place.lat}|${place.lng}`;
    if (existingKeys.has(key)) {
      return false;
    }
    existingKeys.add(key);
    return true;
  });
  places = [...fresh, ...places];
  selectedId = places[0]?.id ?? null;
  if (categoryName && fresh.length > 0) {
    activeCategory = categoryName;
    expandedCategory = categoryName;
  }
  savePlaces();
  showToast(`${fresh.length} imported`);
  render();
}

function parseJson(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.features)) {
    return data.features.map((feature) => ({
      ...feature.properties,
      geometry: feature.geometry,
      name: feature.properties?.name || feature.properties?.title
    }));
  }
  if (Array.isArray(data.locations)) {
    return data.locations;
  }
  if (Array.isArray(data.places)) {
    return data.places;
  }
  return [data];
}

function parseKml(text) {
  const document = new DOMParser().parseFromString(text, "application/xml");
  return [...document.querySelectorAll("Placemark")].map((placemark) => {
    const coordinatesText = placemark.querySelector("Point coordinates, coordinates")?.textContent || placemark.querySelector("coordinates")?.textContent || "";
    const parts = coordinatesText.trim().split(",");
    const data = Object.fromEntries([...placemark.querySelectorAll("Data")].map((node) => [node.getAttribute("name"), node.querySelector("value")?.textContent || ""]));
    return {
      name: placemark.querySelector("name")?.textContent || "Untitled place",
      note: placemark.querySelector("description")?.textContent || "",
      tag: data.category || data.tag || "",
      icon: data.icon || "",
      lng: Number(parts[0]),
      lat: Number(parts[1])
    };
  });
}

function parseCsv(text) {
  const rows = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).map(parseCsvRow);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return headers.includes("name") || headers.includes("nazev") || headers.includes("lat") || headers.includes("latitude");
  });
  if (headerIndex < 0) {
    return [];
  }
  const headers = rows[headerIndex].map((header) => header.replace(/^\uFEFF/, "").trim());
  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => String(value || "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function normalizeHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseCsvRow(row) {
  const result = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === "\"" && row[index + 1] === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  result.push(value);
  return result;
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeXml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;");
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function buildJsonExport() {
  return JSON.stringify({
    updatedAt: new Date().toISOString(),
    places
  }, null, 2);
}

function buildCsvExport() {
  const headers = ["Name", "Description", "Latitude", "Longitude", "Category", "Icon"];
  const rows = places.map((place) => [
    place.name,
    place.note,
    place.lat,
    place.lng,
    place.tag,
    normalizeIcon(place.icon)
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function buildKmlExport() {
  const placemarks = places.map((place) => `    <Placemark>
      <name>${escapeXml(place.name)}</name>
      <description>${escapeXml(place.note)}</description>
      <ExtendedData>
        <Data name="category"><value>${escapeXml(place.tag)}</value></Data>
        <Data name="icon"><value>${escapeXml(normalizeIcon(place.icon))}</value></Data>
      </ExtendedData>
      <Point><coordinates>${place.lng},${place.lat},0</coordinates></Point>
    </Placemark>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Places</name>
${placemarks}
  </Document>
</kml>`;
}

function importFromFile() {
  closeEditor();
  hideKeyboard();
  fileInput.click();
}

function exportToFile() {
  closeEditor();
  hideKeyboard();
  download("places.kml", buildKmlExport());
}

function switchPage(page) {
  closeEditor();
  hideKeyboard();
  activePage = page;
  const showPlaces = page === "places";
  mapPage.classList.toggle("isActive", showPlaces);
  categoryPage.classList.toggle("isActive", !showPlaces);
  placesButton.classList.toggle("isActive", showPlaces);
  categoriesButton.classList.toggle("isActive", !showPlaces);
  if (showPlaces) {
    invalidateMapSize();
  }
}

addButton.addEventListener("click", () => openEditor());
locateButton.addEventListener("click", locateDevice);
cancelButton.addEventListener("click", closeEditor);
dismissKeyboardButton.addEventListener("click", hideKeyboard);
deletePlaceButton.addEventListener("click", deleteEditingPlace);
importButton.addEventListener("click", importFromFile);
exportButton.addEventListener("click", exportToFile);
placesButton.addEventListener("click", () => {
  activeCategory = null;
  switchPage("places");
  render();
});
categoriesButton.addEventListener("click", () => switchPage("categories"));

tagInput.addEventListener("input", () => {
  if (!editingId) {
    iconInput.value = findCategoryIcon(tagInput.value);
    renderIconPicker(iconInput.value);
  }
});

placeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const place = normalizePlace({
    name: nameInput.value,
    lat: latInput.value,
    lng: lngInput.value,
    tag: tagInput.value,
    icon: iconInput.value,
    note: noteInput.value
  });
  if (place) {
    upsertPlace(place);
  }
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const lowerName = file.name.toLowerCase();
    const categoryName = getCategoryNameFromFilename(file.name);
    if (lowerName.endsWith(".kml")) {
      importPlaces(parseKml(text), categoryName);
    } else if (lowerName.endsWith(".csv")) {
      importPlaces(parseCsv(text), categoryName);
    } else {
      importPlaces(parseJson(text), categoryName);
    }
  } catch {
    showToast("Import failed");
  }
  fileInput.value = "";
});

window.addEventListener("message", handleNativeMessage);
document.addEventListener("message", handleNativeMessage);
initMap();
switchPage(activePage);
render();
