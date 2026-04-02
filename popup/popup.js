const form = document.getElementById("bookmark-form");
const inputName = document.getElementById("input-name");
const inputUrl = document.getElementById("input-url");
const inputColorValue = document.getElementById("input-color-value");
const colorPicker = document.getElementById("color-picker");
const status = document.getElementById("status");

// Auto-fill URL with current tab
browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  if (tabs[0]) {
    inputUrl.value = tabs[0].url || "";
    inputName.value = tabs[0].title || "";
  }
}).catch((err) => console.error("tabs.query failed:", err));

// Color picker
function selectColor(color) {
  inputColorValue.value = color;
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle("selected", swatch.dataset.color === color);
  });
}

selectColor("#4A90D9");

colorPicker.addEventListener("click", (e) => {
  const swatch = e.target.closest(".color-swatch");
  if (swatch) selectColor(swatch.dataset.color);
});

// Save bookmark
form.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("Form submitted");

  let url = inputUrl.value.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: inputName.value.trim(),
    url: url,
    color: inputColorValue.value,
  };

  console.log("Saving entry:", entry);

  store.get("bookmarks").then((data) => {
    const bookmarks = data.bookmarks || [];
    bookmarks.push(entry);
    return store.set({ bookmarks });
  }).then(() => {
    console.log("Bookmark saved successfully");
    status.textContent = "Bookmark saved!";
    inputName.value = "";
    inputUrl.value = "";
    setTimeout(() => window.close(), 800);
  }).catch((err) => {
    console.error("Save failed:", err);
    status.textContent = "Error: " + err.message;
    status.style.color = "#E74C3C";
  });
});
