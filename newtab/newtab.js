// ── State ──
let bookmarks = [];
let editingIndex = -1;
let editMode = false;

const FALLBACK_COLOR = "#4A90D9";

// Drag state
let isDragging = false;
let draggedIndex = -1;
let dragClone = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerStartIndex = -1;

// ── DOM References ──
const grid = document.getElementById("bookmarks-grid");
const overlay = document.getElementById("dialog-overlay");
const form = document.getElementById("bookmark-form");
const dialogTitle = document.getElementById("dialog-title");
const inputName = document.getElementById("input-name");
const inputUrl = document.getElementById("input-url");
const btnCancel = document.getElementById("btn-cancel");
const btnDelete = document.getElementById("btn-delete");
const modifyBtn = document.getElementById("modify-btn");

// ── Clock ──
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("clock").textContent = `${hours}:${minutes}`;

  const options = { weekday: "long", month: "long", day: "numeric" };
  document.getElementById("date").textContent = now.toLocaleDateString(
    undefined,
    options
  );
}

updateClock();
setInterval(updateClock, 1000);

// ── Unique IDs ──
let suppressOnChanged = false;

function ensureIds() {
  let changed = false;
  bookmarks.forEach((bm) => {
    if (!bm.id) {
      bm.id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      changed = true;
    }
  });
  if (changed) {
    suppressOnChanged = true;
    saveBookmarks().finally(() => { suppressOnChanged = false; });
  }
}

// ── Storage ──
function loadBookmarks() {
  return store
    .get("bookmarks")
    .then((data) => {
      bookmarks = data.bookmarks || [];
      ensureIds();
      render();
    })
    .catch((err) => {
      console.error("Failed to load bookmarks:", err);
    });
}

function saveBookmarks() {
  return store.set({ bookmarks }).then(() => updateStorageUsage());
}

browser.storage.onChanged.addListener((changes, area) => {
  if (changes.bookmarks && !isDragging && !suppressOnChanged && area === store.area()) {
    bookmarks = changes.bookmarks.newValue || [];
    ensureIds();
    render();
  }
});

// ── Edit Mode ──
function toggleEditMode() {
  editMode = !editMode;
  modifyBtn.textContent = editMode ? "Done" : "Modify";
  modifyBtn.classList.toggle("active", editMode);
  grid.classList.toggle("edit-mode", editMode);
  render();
}

modifyBtn.addEventListener("click", toggleEditMode);

// ── Export ──
document.getElementById("export-btn").addEventListener("click", () => {
  const data = bookmarks.map(({ name, url }) => ({ name, url }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tablaunch-bookmarks.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── Import ──
document.getElementById("import-btn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Invalid format");
        const imported = data
          .filter((item) => item.name && item.url)
          .map((item) => ({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            name: item.name,
            url: item.url,
          }));
        bookmarks.push(...imported);
        saveBookmarks().then(() => render());
      } catch (e) {
        alert("Invalid bookmark file.");
      }
    };
    reader.readAsText(file);
  });
  input.click();
});

// ── Rendering ──
function getInitials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getFaviconUrl(url) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return null;
  }
}

function render() {
  grid.innerHTML = "";

  bookmarks.forEach((bm, index) => {
    const tile = document.createElement("a");
    tile.className = "bookmark-tile";
    tile.dataset.index = index;
    tile.dataset.id = bm.id;
    tile.title = bm.url;

    if (editMode) {
      tile.removeAttribute("href");
      tile.style.animationDelay = `${Math.random() * -1}s`;

      // Pointer-based drag
      tile.addEventListener("pointerdown", (e) => onTilePointerDown(e, index));

      // Mark dragged tile as placeholder
      if (isDragging && index === draggedIndex) {
        tile.classList.add("drag-placeholder");
      }
    } else {
      tile.href = /^https?:\/\//i.test(bm.url) ? bm.url : "#";
    }

    const icon = document.createElement("div");
    icon.className = "bookmark-icon";

    const faviconUrl = getFaviconUrl(bm.url);
    if (faviconUrl) {
      icon.classList.add("has-favicon");
      const img = document.createElement("img");
      img.src = faviconUrl;
      img.onerror = () => {
        img.remove();
        icon.classList.remove("has-favicon");
        icon.classList.add("has-initials");
        icon.style.background = FALLBACK_COLOR;
        icon.textContent = getInitials(bm.name);
      };
      icon.appendChild(img);
    } else {
      icon.classList.add("has-initials");
      icon.style.background = FALLBACK_COLOR;
      icon.textContent = getInitials(bm.name);
    }

    // Delete badge (edit mode only)
    if (editMode) {
      const badge = document.createElement("span");
      badge.className = "delete-badge";
      badge.textContent = "\u00D7";
      badge.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        bookmarks.splice(index, 1);
        saveBookmarks().then(() => render());
      });
      icon.appendChild(badge);
    }

    const name = document.createElement("span");
    name.className = "bookmark-name";
    name.textContent = bm.name;

    tile.appendChild(icon);
    tile.appendChild(name);
    grid.appendChild(tile);
  });

  // Add button
  const addTile = document.createElement("div");
  addTile.className = "add-tile";
  addTile.dataset.role = "add";
  addTile.addEventListener("click", openAddDialog);
  addTile.innerHTML = `
    <div class="add-icon">+</div>
    <span class="add-label">Add</span>
  `;
  grid.appendChild(addTile);
}

// ── Pointer Drag ──
function onTilePointerDown(e, index) {
  if (!editMode) return;
  if (e.target.closest(".delete-badge")) return;

  e.preventDefault();
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  pointerStartIndex = index;

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  window.addEventListener("blur", onPointerUp, { once: true });
}

function onPointerMove(e) {
  const dx = e.clientX - pointerStartX;
  const dy = e.clientY - pointerStartY;

  if (!isDragging) {
    // Only start drag after 5px movement (so clicks still work)
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    isDragging = true;
    startDrag(e);
  }

  if (!dragClone) return;

  dragClone.style.left = e.clientX - dragOffsetX + "px";
  dragClone.style.top = e.clientY - dragOffsetY + "px";

  const targetIndex = getDropTargetIndex(e.clientX, e.clientY);

  if (targetIndex !== -1 && targetIndex !== draggedIndex) {
    reorderWithFlip(draggedIndex, targetIndex);
  }
}

function startDrag(e) {
  draggedIndex = pointerStartIndex;
  const tiles = grid.querySelectorAll(".bookmark-tile");
  const tile = tiles[draggedIndex];
  if (!tile) return;

  const rect = tile.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  // Create floating clone
  dragClone = tile.cloneNode(true);
  dragClone.className = "bookmark-tile drag-clone";
  dragClone.style.width = rect.width + "px";
  dragClone.style.left = e.clientX - dragOffsetX + "px";
  dragClone.style.top = e.clientY - dragOffsetY + "px";
  document.body.appendChild(dragClone);

  tile.classList.add("drag-placeholder");
}

function getDropTargetIndex(x, y) {
  const tiles = grid.querySelectorAll(".bookmark-tile");

  for (let i = 0; i < tiles.length; i++) {
    if (i === draggedIndex) continue;
    const rect = tiles[i].getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return i;
    }
  }

  // Over the Add tile → move to end
  const addTile = grid.querySelector(".add-tile");
  if (addTile) {
    const rect = addTile.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return bookmarks.length - 1;
    }
  }

  return -1;
}

function reorderWithFlip(fromIndex, toIndex) {
  // FLIP step 1: record old positions
  const oldRects = {};
  grid.querySelectorAll(".bookmark-tile").forEach((tile) => {
    oldRects[tile.dataset.id] = tile.getBoundingClientRect();
  });

  // Reorder the array
  const moved = bookmarks.splice(fromIndex, 1)[0];
  bookmarks.splice(toIndex, 0, moved);
  draggedIndex = toIndex;

  // Re-render grid
  render();

  // FLIP step 2: animate non-dragged tiles from old → new position
  grid.querySelectorAll(".bookmark-tile").forEach((tile) => {
    const id = tile.dataset.id;
    const idx = parseInt(tile.dataset.index);

    // Skip the placeholder (dragged item)
    if (idx === draggedIndex) return;

    const oldRect = oldRects[id];
    if (!oldRect) return;

    const newRect = tile.getBoundingClientRect();
    const deltaX = oldRect.left - newRect.left;
    const deltaY = oldRect.top - newRect.top;

    if (deltaX === 0 && deltaY === 0) return;

    // Invert: place at old position, pause wiggle
    tile.style.animation = "none";
    tile.style.transition = "none";
    tile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Play: animate to new position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tile.style.transition = "transform 0.15s ease";
        tile.style.transform = "";
        tile.addEventListener(
          "transitionend",
          () => {
            tile.style.transition = "";
            tile.style.animation = "";
          },
          { once: true }
        );
      });
    });
  });
}

function onPointerUp() {
  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("blur", onPointerUp);

  if (isDragging && dragClone) {
    dragClone.remove();
    dragClone = null;
    isDragging = false;
    draggedIndex = -1;
    saveBookmarks().then(() => render());
  } else {
    // Was a click, not a drag → open edit dialog
    isDragging = false;
    openEditDialog(pointerStartIndex);
  }
}

// ── Dialog ──
function openAddDialog() {
  editingIndex = -1;
  dialogTitle.textContent = "Add Bookmark";
  inputName.value = "";
  inputUrl.value = "";
  btnDelete.style.display = "none";
  overlay.classList.add("active");
  inputName.focus();
}

function openEditDialog(index) {
  const bm = bookmarks[index];
  if (!bm) return;
  editingIndex = index;
  dialogTitle.textContent = "Edit Bookmark";
  inputName.value = bm.name;
  inputUrl.value = bm.url;
  btnDelete.style.display = "inline-block";
  overlay.classList.add("active");
  inputName.focus();
}

function closeDialog() {
  overlay.classList.remove("active");
}

// ── Event Listeners ──
form.addEventListener("submit", (e) => {
  e.preventDefault();
  let url = inputUrl.value.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  const entry = {
    id: editingIndex === -1
      ? Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
      : bookmarks[editingIndex].id,
    name: inputName.value.trim(),
    url: url,
  };

  if (editingIndex === -1) {
    bookmarks.push(entry);
  } else {
    bookmarks[editingIndex] = entry;
  }

  saveBookmarks().then(() => {
    render();
    closeDialog();
  });
});

btnCancel.addEventListener("click", closeDialog);

btnDelete.addEventListener("click", () => {
  if (editingIndex >= 0) {
    bookmarks.splice(editingIndex, 1);
    saveBookmarks().then(() => {
      render();
      closeDialog();
    });
  }
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeDialog();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (overlay.classList.contains("active")) {
      closeDialog();
    } else if (editMode) {
      toggleEditMode();
    }
  }
});

// ── Storage Usage ──
function updateStorageUsage() {
  const area = store.area() === "sync" ? browser.storage.sync : browser.storage.local;
  const quota = store.area() === "sync" ? 102400 : 5242880; // 100 KB sync, 5 MB local

  area.getBytesInUse(null).then((bytes) => {
    const pct = Math.min((bytes / quota) * 100, 100);
    const fill = document.getElementById("storage-bar-fill");
    const text = document.getElementById("storage-text");

    fill.style.width = pct.toFixed(1) + "%";
    fill.classList.toggle("warn", pct >= 60 && pct < 85);
    fill.classList.toggle("critical", pct >= 85);

    const usedKB = (bytes / 1024).toFixed(1);
    const totalKB = (quota / 1024).toFixed(0);
    text.textContent = `${usedKB} / ${totalKB} KB (${pct.toFixed(1)}%)`;
  }).catch(() => {
    document.getElementById("storage-text").textContent = "Storage info unavailable";
  });
}

// ── Init ──
loadBookmarks().then(() => updateStorageUsage());
