const STORAGE_KEY = "tahoeTripPlayers";
const CAPTAIN_LIMIT = 3;

const form = document.getElementById("player-form");
const playersEl = document.getElementById("players");
const exportBtn = document.getElementById("export-data");
const importInput = document.getElementById("import-data");
const draftOrderEl = document.getElementById("draft-order");
const captainListEl = document.getElementById("captain-list");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const state = {
  players: [],
};

const toNumber = (value) => Number.parseInt(value, 10);

const averageRating = (player) => {
  const total = player.ski + player.drnk + player.chaos + player.coord;
  return Math.round(total / 4);
};

const savePlayers = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.players));
};

const loadPlayers = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    state.players = JSON.parse(saved);
  } catch (error) {
    console.warn("Failed to load saved players", error);
  }
};

const updateDraftPreview = () => {
  const captains = state.players.filter((player) => player.isCaptain);
  captainListEl.innerHTML = "";
  draftOrderEl.innerHTML = "";

  if (captains.length === 0) {
    captainListEl.innerHTML = "<li>No captains selected yet.</li>";
    draftOrderEl.innerHTML =
      "<li>Select captains on the Home tab to see the order.</li>";
    return;
  }

  captains.forEach((captain) => {
    const item = document.createElement("li");
    item.textContent = `${captain.name} (${captain.team})`;
    captainListEl.appendChild(item);
  });

  const order = [];
  captains.forEach((captain) => order.push(captain.name));
  captains
    .slice()
    .reverse()
    .forEach((captain) => order.push(captain.name));

  order.forEach((name, index) => {
    const item = document.createElement("li");
    item.textContent = `Pick ${index + 1}: ${name}`;
    draftOrderEl.appendChild(item);
  });
};

const renderPlayers = () => {
  playersEl.innerHTML = "";

  if (state.players.length === 0) {
    playersEl.innerHTML =
      "<p class='hint'>No players yet. Add your first player!</p>";
    updateDraftPreview();
    return;
  }

  state.players.forEach((player) => {
    const card = document.createElement("div");
    card.className = `fifa-card${player.isCaptain ? " is-captain" : ""}`;
    card.innerHTML = `
      <div class="fifa-card__top">
        <span class="fifa-card__rating">${averageRating(player)}</span>
        <span class="fifa-card__flag">${player.flag}</span>
      </div>
      <img class="fifa-card__image" src="${player.photo}" alt="${
      player.name
    }" />
      <div class="fifa-card__name">${player.name}</div>
      <div class="fifa-card__team">${player.team}</div>
      <div class="fifa-card__stats">
        <div class="stat"><span>SKI</span><span>${player.ski}</span></div>
        <div class="stat"><span>DRNK</span><span>${player.drnk}</span></div>
        <div class="stat"><span>CHAOS</span><span>${player.chaos}</span></div>
        <div class="stat"><span>COORD</span><span>${player.coord}</span></div>
      </div>
      <label class="captain-toggle">
        <input type="checkbox" data-id="${player.id}" ${
      player.isCaptain ? "checked" : ""
    } />
        Captain
      </label>
    `;

    const toggle = card.querySelector("input[type='checkbox']");
    toggle.addEventListener("change", (event) => {
      const updated = state.players.map((item) => {
        if (item.id !== player.id) return item;
        return { ...item, isCaptain: event.target.checked };
      });

      const captainCount = updated.filter((item) => item.isCaptain).length;
      if (captainCount > CAPTAIN_LIMIT) {
        event.target.checked = false;
        return;
      }

      state.players = updated;
      savePlayers();
      renderPlayers();
    });

    playersEl.appendChild(card);
  });

  updateDraftPreview();
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const photoFile = data.get("photo");

  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return;
  }

  const photo = await readFileAsDataUrl(photoFile);

  const player = {
    id: crypto.randomUUID(),
    name: data.get("name").trim(),
    team: data.get("team").trim(),
    flag: data.get("flag").trim(),
    photo,
    ski: toNumber(data.get("ski")),
    drnk: toNumber(data.get("drnk")),
    chaos: toNumber(data.get("chaos")),
    coord: toNumber(data.get("coord")),
    isCaptain: false,
  };

  state.players = [player, ...state.players];
  savePlayers();
  form.reset();
  renderPlayers();
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.players, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tahoe-trip-players.json";
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const imported = JSON.parse(text);
    if (Array.isArray(imported)) {
      state.players = imported;
      savePlayers();
      renderPlayers();
    }
  } catch (error) {
    console.warn("Failed to import data", error);
  } finally {
    importInput.value = "";
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((button) => button.classList.remove("is-active"));
    panels.forEach((panel) => panel.classList.remove("is-active"));
    tab.classList.add("is-active");
    const target = document.getElementById(tab.dataset.tab);
    target.classList.add("is-active");
    updateDraftPreview();
  });
});

loadPlayers();
renderPlayers();

