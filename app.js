const STORAGE_KEY = "tahoeTripPlayers";
const CAPTAIN_LIMIT = 3;

const form = document.getElementById("player-form");
const playersEl = document.getElementById("players");
const draftOrderEl = document.getElementById("draft-order");
const captainListEl = document.getElementById("captain-list");
const nationalitySelect = document.getElementById("nationality");
const submitButton = document.getElementById("submit-player");
const cancelEditButton = document.getElementById("cancel-edit");
const photoHint = document.getElementById("photo-hint");
const leaderboardIndividualEl = document.getElementById(
  "leaderboard-individual"
);
const leaderboardTeamsEl = document.getElementById("leaderboard-teams");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const state = {
  players: [],
};
const editState = {
  id: null,
};

const FLAGS = [
  { id: "usa", label: "United States", file: "usa flag.png" },
  { id: "canada", label: "Canada", file: "canada flag.png" },
  { id: "uk", label: "United Kingdom", file: "uk flag.png" },
  { id: "china", label: "China", file: "china flag.png" },
  { id: "colombia", label: "Colombia", file: "colombia flag.png" },
  { id: "dominican", label: "Dominican Republic", file: "dr flag.png" },
  { id: "india", label: "India", file: "india flag.png" },
  { id: "italy", label: "Italy", file: "italy flag.png" },
  { id: "japan", label: "Japan", file: "japan flag.png" },
  { id: "switzerland", label: "Switzerland", file: "switzerland flag.png" },
  { id: "vietnam", label: "Vietnam", file: "vietnam flag.png" },
];

const toNumber = (value) => Number.parseInt(value, 10);

const getFlagData = (id) => FLAGS.find((flag) => flag.id === id);

const getFlagSrc = (id) => {
  const data = getFlagData(id);
  if (!data) return "";
  return encodeURI(`flag/${data.file}`);
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const averageRating = (player) => {
  const total = player.ski + player.drnk + player.chaos + player.coord;
  return Math.round(total / 4);
};

const totalScore = (player) =>
  player.ski + player.drnk + player.chaos + player.coord;

const savePlayers = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.players));
  } catch (error) {
    console.warn("Failed to save players", error);
  }
};

const loadPlayers = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
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

const updateLeaderboards = () => {
  if (!leaderboardIndividualEl || !leaderboardTeamsEl) return;
  leaderboardIndividualEl.innerHTML = "";
  leaderboardTeamsEl.innerHTML = "";

  if (state.players.length === 0) {
    leaderboardIndividualEl.innerHTML =
      "<tr><td colspan='4'>No players yet. Add players to see rankings.</td></tr>";
    leaderboardTeamsEl.innerHTML =
      "<tr><td colspan='3'>No teams yet. Add players to see rankings.</td></tr>";
    return;
  }

  const individual = state.players
    .map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team,
      score: totalScore(player),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  individual.forEach((player, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name}</td>
      <td>${player.team}</td>
      <td>${player.score}</td>
    `;
    leaderboardIndividualEl.appendChild(row);
  });

  const teamMap = new Map();
  state.players.forEach((player) => {
    const entry = teamMap.get(player.team) || { team: player.team, score: 0 };
    entry.score += totalScore(player);
    teamMap.set(player.team, entry);
  });

  const teams = Array.from(teamMap.values()).sort(
    (a, b) => b.score - a.score || a.team.localeCompare(b.team)
  );

  teams.forEach((team, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${team.team}</td>
      <td>${team.score}</td>
    `;
    leaderboardTeamsEl.appendChild(row);
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
    const flagId = player.flagId || player.nationality;
    const flagSrc = player.flagSrc || getFlagSrc(flagId) || player.flag;
    const flagLabel = getFlagData(flagId)?.label || "Flag";
    const card = document.createElement("div");
    card.className = `fifa-card${player.isCaptain ? " is-captain" : ""}`;
    card.innerHTML = `
      <div class="card-menu">
        <button class="menu-button" type="button" aria-label="Card menu">⋮</button>
        <div class="menu-dropdown">
          <button class="menu-item edit" data-id="${player.id}" type="button">Edit</button>
          <button class="menu-item delete" data-id="${player.id}" type="button">Delete</button>
        </div>
      </div>
      <div class="fifa-card__top">
        <span class="fifa-card__rating">${averageRating(player)}</span>
        ${
          flagSrc && flagSrc.includes(".png")
            ? `<img class="fifa-card__flag" src="${flagSrc}" alt="${flagLabel} flag" />`
            : `<span class="fifa-card__flag-text">${flagSrc || "🏔️"}</span>`
        }
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

    const menuButton = card.querySelector(".menu-button");
    const menuDropdown = card.querySelector(".menu-dropdown");
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      document.querySelectorAll(".menu-dropdown").forEach((menu) => {
        if (menu !== menuDropdown) menu.classList.remove("is-open");
      });
      menuDropdown.classList.toggle("is-open");
    });

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

    const deleteBtn = card.querySelector(".menu-item.delete");
    deleteBtn.addEventListener("click", () => {
      const shouldDelete = window.confirm(
        `Delete ${player.name}'s card?`
      );
      if (!shouldDelete) return;
      state.players = state.players.filter((item) => item.id !== player.id);
      savePlayers();
      renderPlayers();
    });

    const editBtn = card.querySelector(".menu-item.edit");
    editBtn.addEventListener("click", () => {
      startEdit(player);
    });

    playersEl.appendChild(card);
  });

  updateDraftPreview();
  updateLeaderboards();
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

  const flagId = data.get("flagId");
  const isEditing = Boolean(editState.id);
  const existing = state.players.find((item) => item.id === editState.id);

  if (!isEditing && (!(photoFile instanceof File) || photoFile.size === 0)) {
    photoHint.textContent = "Please add a photo to create a player.";
    return;
  }

  const photo =
    photoFile instanceof File && photoFile.size > 0
      ? await readFileAsDataUrl(photoFile)
      : existing?.photo;

  if (!photo) return;

  const player = {
    id: existing?.id ?? generateId(),
    name: data.get("name").trim(),
    team: data.get("team").trim(),
    flagId,
    flagSrc: getFlagSrc(flagId),
    photo,
    ski: toNumber(data.get("ski")),
    drnk: toNumber(data.get("drnk")),
    chaos: toNumber(data.get("chaos")),
    coord: toNumber(data.get("coord")),
    isCaptain: existing?.isCaptain ?? false,
  };

  if (isEditing) {
    state.players = state.players.map((item) =>
      item.id === editState.id ? player : item
    );
  } else {
    state.players = [player, ...state.players];
  }

  resetEditMode();
  savePlayers();
  form.reset();
  renderPlayers();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((button) => button.classList.remove("is-active"));
    panels.forEach((panel) => panel.classList.remove("is-active"));
    tab.classList.add("is-active");
    const target = document.getElementById(tab.dataset.tab);
    target.classList.add("is-active");
    updateDraftPreview();
    updateLeaderboards();
  });
});

const populateNationalities = () => {
  if (!nationalitySelect) return;
  if (nationalitySelect.options.length > 1) return;
  nationalitySelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select nationality";
  placeholder.disabled = true;
  placeholder.selected = true;
  nationalitySelect.appendChild(placeholder);

  FLAGS.forEach((nation) => {
    const option = document.createElement("option");
    option.value = nation.id;
    option.textContent = nation.label;
    nationalitySelect.appendChild(option);
  });
};

const startEdit = (player) => {
  editState.id = player.id;
  form.name.value = player.name;
  form.team.value = player.team;
  form.flagId.value = player.flagId || player.nationality || "";
  form.ski.value = player.ski;
  form.drnk.value = player.drnk;
  form.chaos.value = player.chaos;
  form.coord.value = player.coord;
  submitButton.textContent = "Update Player";
  cancelEditButton.style.display = "inline-flex";
  photoHint.textContent = "Leave blank to keep the current photo.";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
};

const resetEditMode = () => {
  editState.id = null;
  submitButton.textContent = "Add Player";
  cancelEditButton.style.display = "none";
  photoHint.textContent = "Required for new players.";
};

cancelEditButton.addEventListener("click", () => {
  form.reset();
  resetEditMode();
});

document.addEventListener("click", () => {
  document.querySelectorAll(".menu-dropdown").forEach((menu) => {
    menu.classList.remove("is-open");
  });
});

populateNationalities();
resetEditMode();
loadPlayers();
renderPlayers();

