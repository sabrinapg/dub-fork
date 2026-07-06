// ============================================================
// dub — Community gallery
// ============================================================

const communityState = {
  category: "all",
  page: 1,
  pageSize: 20,
};

async function renderCommunityGrid() {
  const grid = document.getElementById("community-grid");
  const pagination = document.getElementById("community-pagination");
  grid.innerHTML = `<p class="empty-state">loading doodles…</p>`;

  try {
    const { doodles, total } = await fetchDoodles({
      category: communityState.category,
      page: communityState.page,
      pageSize: communityState.pageSize,
    });

    if (doodles.length === 0) {
      grid.innerHTML = `<p class="empty-state">no doodles here yet — be the first to add one.</p>`;
      pagination.innerHTML = "";
      return;
    }

    grid.innerHTML = doodles
      .map(
        (d) => `
      <figure class="doodle-card">
        <img src="${d.image_url}" alt="doodle by ${d.creator_name}" loading="lazy" />
        <figcaption>by ${d.creator_name}</figcaption>
      </figure>`
      )
      .join("");

    renderPagination(total);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="empty-state">couldn't load doodles. check your Supabase config in js/config.js.</p>`;
  }
}

function renderPagination(total) {
  const pagination = document.getElementById("community-pagination");
  const totalPages = Math.max(1, Math.ceil(total / communityState.pageSize));

  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === communityState.page ? "active" : ""}" data-page="${i}">${i}</button>`;
  }
  pagination.innerHTML = html;

  pagination.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      communityState.page = parseInt(btn.dataset.page, 10);
      renderCommunityGrid();
    });
  });
}

function initCommunityFilters() {
  document.querySelectorAll("#community-filters .filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#community-filters .filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      communityState.category = tab.dataset.category;
      communityState.page = 1;
      renderCommunityGrid();
    });
  });
}

function initUploadFlow() {
  const uploadBtn = document.getElementById("upload-doodle-btn");
  const fileInput = document.getElementById("doodle-file-input");

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const creatorName = prompt("your name (shown on your doodle):", "anonymous");
    const category = prompt(
      "category — patterns / lines / shapes / organic / abstract / symbols:",
      "organic"
    );

    uploadBtn.disabled = true;
    uploadBtn.textContent = "uploading…";

    try {
      await saveDoodle(file, {
        creatorName,
        category: category || "organic",
        source: "community",
      });
      communityState.page = 1;
      await renderCommunityGrid();
    } catch (err) {
      console.error(err);
      alert("upload failed — check your Supabase config and storage bucket policies.");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "upload doodle";
      fileInput.value = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initCommunityFilters();
  initUploadFlow();
  renderCommunityGrid();
});
