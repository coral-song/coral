/* ============================================================
   script.js — 사이트 전체 동작 + 글자 간격 조절 + 통합 편집기
   ============================================================ */

(function () {
  "use strict";

  /* 1. 헤더 동작 */
  const header = document.querySelector(".header");
  if (header) {
    header.addEventListener("mousemove", (e) => {
      const rect = header.getBoundingClientRect();
      header.style.setProperty("--x", e.clientX - rect.left + "px");
    });
  }

  function handleHeaderScroll() {
    if (!header) return;
    header.classList.toggle("on", window.scrollY > 40);
  }

  const navLinks = document.querySelectorAll(".nav a");
  const sections = document.querySelectorAll("section[id]");

  function markActiveMenu() {
    if (!navLinks.length || !sections.length) return;
    const line = window.scrollY + 120;
    let current = "";
    sections.forEach((section) => {
      if (section.offsetTop <= line) current = section.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });
  }

  /* 2. 소개 섹션 등장 */
  const about = document.getElementById("about");
  if (about) {
    if (!("IntersectionObserver" in window)) {
      about.classList.add("show");
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("show");
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.15 }
      );
      io.observe(about);
    }
  }

  /* 3. 슬라이더 좌우 버튼 */
  const STEP = 234;
  document.querySelectorAll(".slider-container").forEach((container) => {
    const track = container.querySelector(".slider-track");
    if (!track) return;
    const prev = container.querySelector(".prev-btn");
    const next = container.querySelector(".next-btn");
    if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -STEP, behavior: "smooth" }));
    if (next) next.addEventListener("click", () => track.scrollBy({ left: STEP, behavior: "smooth" }));
  });

  /* 4. 푸터 연도 및 별 애니메이션 딜레이 */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  function refreshStarIndex() {
    document.querySelectorAll(".sub").forEach((el, i) => {
      el.style.setProperty("--i", i);
    });
  }
  refreshStarIndex();

  /* ==========================================================
     5. 그리드 & 글자 간격 통합 조절 패널
     ========================================================== */
  const root = document.documentElement;
  const STORE_KEY = "aboutGridAndTextSpacing";

  const CONTROLS = [
    { group: "소개 그리드 간격", key: "x", cssVar: "--about-gap-x", label: "좌우 간격", min: 0, max: 300, step: 4, def: 200 },
    { group: "소개 그리드 간격", key: "y", cssVar: "--about-gap-y", label: "위아래 간격", min: 0, max: 140, step: 4, def: 40 },
    { group: "소개 그리드 간격", key: "w", cssVar: "--about-width", label: "그리드 폭", min: 1000, max: 2200, step: 20, def: 1400 },
    { group: "글자 및 항목 사이 간격", key: "tt", cssVar: "--thumb-title-top", label: "썸네일↔제목", min: 0, max: 50, step: 2, def: 12 },
    { group: "글자 및 항목 사이 간격", key: "tg", cssVar: "--thumb-text-gap", label: "제목↔분류글자", min: 0, max: 40, step: 2, def: 8 },
    { group: "글자 및 항목 사이 간격", key: "tr", cssVar: "--tl-row-gap", label: "이력 줄 간격", min: 0, max: 30, step: 2, def: 6 },
    { group: "글자 및 항목 사이 간격", key: "ts", cssVar: "--tl-sub-gap", label: "이력↔보조글자", min: 0, max: 30, step: 1, def: 4 },
    { group: "글자 및 항목 사이 간격", key: "ag", cssVar: "--article-gap", label: "소제목구역간격", min: 10, max: 100, step: 2, def: 24 }
  ];

  const DEFAULTS = {};
  CONTROLS.forEach((c) => (DEFAULTS[c.key] = c.def));

  let values = { ...DEFAULTS };
  try {
    values = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch (e) {
    values = { ...DEFAULTS };
  }

  function applyGrid() {
    CONTROLS.forEach((c) => {
      root.style.setProperty(c.cssVar, values[c.key] + "px");
    });
  }

  function saveGrid() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(values));
    } catch (e) {}
  }

  if (document.querySelector(".about-grid")) {
    const gridPanel = document.createElement("div");
    gridPanel.className = "grid-editor";
    gridPanel.setAttribute("data-editor-ui", "true");

    let currentGroup = "";
    const rows = CONTROLS.map((c) => {
      let groupTitle = "";
      if (c.group !== currentGroup) {
        currentGroup = c.group;
        groupTitle = `<p class="ge-title">${c.group}</p>`;
      }
      return `
        ${groupTitle}
        <label class="ge-row">
          <span>${c.label}</span>
          <input class="ge-range" type="range" data-key="${c.key}"
                 min="${c.min}" max="${c.max}" step="${c.step}">
          <b class="ge-val" data-val="${c.key}"></b>
        </label>`;
    }).join("");

    gridPanel.innerHTML = `
      <button class="ge-toggle" type="button">📐 간격 조절</button>
      <div class="ge-panel" hidden>
        ${rows}
        <div class="ge-btns">
          <button class="ge-btn ge-copy" type="button">CSS 복사</button>
          <button class="ge-btn ge-reset" type="button">초기화</button>
        </div>
        <p class="ge-note">값은 브라우저와 HTML에 저장됩니다</p>
      </div>`;

    document.body.appendChild(gridPanel);

    const gridToggle = gridPanel.querySelector(".ge-toggle");
    const gridBody = gridPanel.querySelector(".ge-panel");
    const gridRanges = gridPanel.querySelectorAll(".ge-range");
    const gridLabels = gridPanel.querySelectorAll(".ge-val");

    function syncGrid() {
      gridRanges.forEach((r) => (r.value = values[r.dataset.key]));
      gridLabels.forEach((v) => (v.textContent = values[v.dataset.val] + "px"));
    }

    gridRanges.forEach((range) => {
      range.addEventListener("input", () => {
        values[range.dataset.key] = Number(range.value);
        applyGrid();
        saveGrid();
        syncGrid();
      });
    });

    gridPanel.querySelector(".ge-reset").addEventListener("click", () => {
      values = { ...DEFAULTS };
      applyGrid();
      saveGrid();
      syncGrid();
    });

    gridPanel.querySelector(".ge-copy").addEventListener("click", async () => {
      const cssLines = CONTROLS.map((c) => `  ${c.cssVar}: ${values[c.key]}px;`).join("\n");
      const css = `:root {\n${cssLines}\n}`;
      try {
        await navigator.clipboard.writeText(css);
        gridToggle.textContent = "✅ 복사됨";
      } catch (e) {
        window.prompt("아래 코드를 복사하세요", css);
      }
      setTimeout(() => (gridToggle.textContent = "📐 간격 조절"), 1200);
    });

    gridToggle.addEventListener("click", () => {
      gridBody.hidden = !gridBody.hidden;
    });

    applyGrid();
    syncGrid();
  }

  window.addEventListener(
    "scroll",
    () => {
      handleHeaderScroll();
      markActiveMenu();
    },
    { passive: true }
  );
  handleHeaderScroll();
  markActiveMenu();

  /* ==========================================================
     6. 통합 편집 시스템 (개별 글자 간격 + 기술/AI 구역 분리·추가)
     ========================================================== */
  const GITHUB_OWNER = "coral-song";
  const GITHUB_REPO = "coral";
  const GITHUB_BRANCH = "main";

  let isEditMode = false;
  let activeTextEl = null;

  // 6-1. 하단 편집 툴바
  const editBar = document.createElement("div");
  editBar.id = "admin-edit-bar";
  editBar.setAttribute("data-editor-ui", "true");
  editBar.innerHTML = `
    <button id="toggleEditBtn" type="button" class="ed-btn ed-primary">✏️ 편집 모드 켜기</button>
    <button id="addDetailItemBtn" type="button" class="ed-btn" style="display:none;">➕ 새 작업물(ID) 생성</button>
    <button id="downloadHtmlBtn" type="button" class="ed-btn" style="display:none;">📥 HTML 다운로드</button>
    <button id="saveGithubBtn" type="button" class="ed-btn ed-save" style="display:none;">💾 깃허브 즉시 반영</button>
    <button id="setTokenBtn" type="button" class="ed-btn" style="display:none;" title="깃허브 토큰 설정">🔑 토큰 설정</button>
  `;
  document.body.appendChild(editBar);

  // 6-2. 상단 선택 글자 개별 간격 조절바
  const textSpaceBar = document.createElement("div");
  textSpaceBar.id = "text-space-bar";
  textSpaceBar.setAttribute("data-editor-ui", "true");
  textSpaceBar.innerHTML = `
    <strong id="tsTargetName" style="color:#fcfdb3;">선택한 글자 간격</strong>
    <label>위 여백(px) <input type="number" id="tsMarginTop" step="1"></label>
    <label>아래 여백(px) <input type="number" id="tsMarginBottom" step="1"></label>
    <label>줄간격(배) <input type="number" id="tsLineHeight" step="0.1" min="0.8" max="3"></label>
    <label>자간(px) <input type="number" id="tsLetterSpacing" step="0.5"></label>
    <button type="button" id="tsResetBtn" class="ge-btn" style="flex:none;">초기화</button>
  `;
  document.body.appendChild(textSpaceBar);

  const toggleEditBtn = document.getElementById("toggleEditBtn");
  const addDetailItemBtn = document.getElementById("addDetailItemBtn");
  const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");
  const saveGithubBtn = document.getElementById("saveGithubBtn");
  const setTokenBtn = document.getElementById("setTokenBtn");

  const tsMarginTop = document.getElementById("tsMarginTop");
  const tsMarginBottom = document.getElementById("tsMarginBottom");
  const tsLineHeight = document.getElementById("tsLineHeight");
  const tsLetterSpacing = document.getElementById("tsLetterSpacing");
  const tsResetBtn = document.getElementById("tsResetBtn");

  const isDetailPage = window.location.pathname.includes("detail.html") || document.body.classList.contains("detail-page");

  // 선택한 글자 요소의 간격 값 불러오기
  document.addEventListener("click", (e) => {
    if (!isEditMode) return;
    if (e.target.closest("[data-editor-ui]")) return;

    const editable = e.target.closest("[contenteditable='true']");
    if (editable) {
      activeTextEl = editable;
      const cs = window.getComputedStyle(editable);
      tsMarginTop.value = parseInt(cs.marginTop, 10) || 0;
      tsMarginBottom.value = parseInt(cs.marginBottom, 10) || 0;
      const lh = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
      tsLineHeight.value = isNaN(lh) ? 1.4 : lh.toFixed(1);
      tsLetterSpacing.value = parseFloat(cs.letterSpacing) || 0;
      textSpaceBar.style.display = "flex";
    }
  });

  // 상단 미니 조절바 입력 시 선택한 글자 간격 즉시 반영
  tsMarginTop.addEventListener("input", () => {
    if (!activeTextEl) return;
    if (window.getComputedStyle(activeTextEl).display === "inline") activeTextEl.style.display = "inline-block";
    activeTextEl.style.marginTop = tsMarginTop.value + "px";
  });
  tsMarginBottom.addEventListener("input", () => {
    if (!activeTextEl) return;
    if (window.getComputedStyle(activeTextEl).display === "inline") activeTextEl.style.display = "inline-block";
    activeTextEl.style.marginBottom = tsMarginBottom.value + "px";
  });
  tsLineHeight.addEventListener("input", () => {
    if (activeTextEl) activeTextEl.style.lineHeight = tsLineHeight.value;
  });
  tsLetterSpacing.addEventListener("input", () => {
    if (activeTextEl) activeTextEl.style.letterSpacing = tsLetterSpacing.value + "px";
  });
  tsResetBtn.addEventListener("click", () => {
    if (!activeTextEl) return;
    activeTextEl.style.marginTop = "";
    activeTextEl.style.marginBottom = "";
    activeTextEl.style.lineHeight = "";
    activeTextEl.style.letterSpacing = "";
  });

  // 편집 모드일 때 링크 이동 차단
  document.addEventListener(
    "click",
    (e) => {
      if (!isEditMode) return;
      const link = e.target.closest("a");
      if (link && !link.closest("[data-editor-ui]")) {
        if (link.classList.contains("yt-btn")) {
          e.preventDefault();
          const newUrl = prompt("연결할 유튜브 영상 주소를 입력하세요:", link.getAttribute("href"));
          if (newUrl !== null && newUrl.trim() !== "") link.setAttribute("href", newUrl.trim());
          return;
        }
        e.preventDefault();
      }
    },
    true
  );

  // 편집 모드일 때 이미지 클릭 시 경로 변경
  document.addEventListener("click", (e) => {
    if (!isEditMode) return;
    const img = e.target.closest("img");
    if (!img || img.closest("[data-editor-ui]")) return;
    const currentSrc = img.getAttribute("src");
    const newSrc = prompt("변경할 이미지 파일 경로(또는 URL)를 입력하세요:", currentSrc);
    if (newSrc !== null && newSrc.trim() !== "") img.setAttribute("src", newSrc.trim());
  });

  // 항목 추가/삭제 컨트롤 생성
  function renderEditControls() {
    document.querySelectorAll(".ed-temp-ctrl").forEach((el) => el.remove());
    if (!isEditMode) return;

    // A. 타임라인 (.timeline) 이력 추가·삭제
    document.querySelectorAll(".timeline").forEach((ul) => {
      ul.querySelectorAll("li").forEach((li) => attachDeleteBtn(li));
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "ed-temp-ctrl ed-add-inline";
      addBtn.setAttribute("data-editor-ui", "true");
      addBtn.textContent = "+ 이력 항목 추가";
      addBtn.addEventListener("click", () => {
        const li = document.createElement("li");
        li.innerHTML = `<span>기간/구분</span><strong>내용 제목 <em>보조 설명</em></strong>`;
        enableElementEditing(li);
        attachDeleteBtn(li);
        ul.appendChild(li);
      });
      ul.after(addBtn);
    });

    // B. 기술 및 AI 아이콘 (.skills) 추가·삭제
    document.querySelectorAll(".skills").forEach((ul) => {
      ul.querySelectorAll("li").forEach((li) => attachDeleteBtn(li));
      const addSkillBtn = document.createElement("button");
      addSkillBtn.type = "button";
      addSkillBtn.className = "ed-temp-ctrl ed-add-inline";
      addSkillBtn.setAttribute("data-editor-ui", "true");
      addSkillBtn.textContent = "+ 아이콘 추가";
      addSkillBtn.addEventListener("click", () => {
        const imgPath = prompt("아이콘 이미지 경로를 입력하세요:", "./heromain/skill icons/GM.gif") || "./heromain/skill icons/GM.gif";
        const name = prompt("프로그램 또는 AI 이름을 입력하세요:", "새 툴") || "새 툴";
        const li = document.createElement("li");
        li.innerHTML = `<img src="${imgPath.trim()}" alt="${name}"><span>${name}</span>`;
        enableElementEditing(li);
        attachDeleteBtn(li);
        ul.appendChild(li);
      });
      ul.after(addSkillBtn);
    });

    // C. 소개 그리드 각 컬럼에 [새 소제목 구역(기술/AI/이력) 추가] 및 구역 삭제 버튼
    document.querySelectorAll(".about-grid > div").forEach((col) => {
      col.querySelectorAll("article").forEach((art) => {
        art.style.position = "relative";
        attachDeleteBtn(art);
      });

      const addArtBtn = document.createElement("button");
      addArtBtn.type = "button";
      addArtBtn.className = "ed-temp-ctrl ed-add-inline";
      addArtBtn.setAttribute("data-editor-ui", "true");
      addArtBtn.style.marginTop = "20px";
      addArtBtn.textContent = "➕ 새 소제목 구역(AI·기술·이력) 추가";
      addArtBtn.addEventListener("click", () => {
        const title = prompt("새 소제목 이름을 입력하세요 (예: AI, 기술, 수상 등):", "AI");
        if (!title) return;
        const type = confirm("아이콘 격자 형태(기술/AI)로 만들까요?\n[확인] = 아이콘 격자 / [취소] = 텍스트 타임라인");
        const art = document.createElement("article");
        art.style.position = "relative";
        if (type) {
          art.innerHTML = `
            <h3 class="sub">${title.trim()}</h3>
            <ul class="skills">
              <li><img src="./heromain/skill icons/HF.gif" alt="힉스필드"><span>힉스필드</span></li>
              <li><img src="./heromain/skill icons/GM.gif" alt="제미나이"><span>제미나이</span></li>
            </ul>`;
        } else {
          art.innerHTML = `
            <h3 class="sub">${title.trim()}</h3>
            <ul class="timeline">
              <li><span>2026</span><strong>항목 제목 <em>보조 설명</em></strong></li>
            </ul>`;
        }
        col.insertBefore(art, addArtBtn);
        refreshStarIndex();
        enableElementEditing(art);
        renderEditControls();
      });
      col.appendChild(addArtBtn);
    });

    // D. 슬라이더 (.slider-track) 썸네일 카드 추가·삭제
    document.querySelectorAll(".slider-track").forEach((track) => {
      track.querySelectorAll(".slider-item").forEach((item) => {
        item.style.position = "relative";
        attachDeleteBtn(item);
      });

      const addCardBtn = document.createElement("button");
      addCardBtn.type = "button";
      addCardBtn.className = "ed-temp-ctrl ed-add-inline";
      addCardBtn.setAttribute("data-editor-ui", "true");
      addCardBtn.textContent = "+ 새 썸네일 카드 추가";
      addCardBtn.addEventListener("click", () => {
        const idNum = prompt("연결할 상세페이지 ID 번호를 입력하세요 (예: 4):", "4");
        if (!idNum) return;
        const imgPath = prompt("썸네일 이미지 경로를 입력하세요:", "./heromain/banner.jpg") || "./heromain/banner.jpg";
        const title = prompt("작품 제목을 입력하세요:", "새 프로젝트") || "새 프로젝트";
        const tag = prompt("분류(연도/분야)를 입력하세요:", "2026") || "2026";

        const li = document.createElement("li");
        li.className = "slider-item";
        li.style.position = "relative";
        li.innerHTML = `
          <a target="_blank" rel="noopener" href="detail.html?id=${idNum.trim()}">
            <img class="thumb" src="${imgPath.trim()}" alt="${title}">
            <strong>${title}</strong>
            <span>${tag}</span>
          </a>`;
        enableElementEditing(li);
        attachDeleteBtn(li);
        track.appendChild(li);
      });
      track.parentElement.after(addCardBtn);
    });

    // E. 상세페이지 블록 추가
    if (isDetailPage) {
      document.querySelectorAll(".detail-item").forEach((itemBox) => {
        const addSecBtn = document.createElement("button");
        addSecBtn.type = "button";
        addSecBtn.className = "ed-temp-ctrl ed-add-inline";
        addSecBtn.setAttribute("data-editor-ui", "true");
        addSecBtn.textContent = "+ 이미지·설명 블록 추가";
        addSecBtn.addEventListener("click", () => {
          const imgPath = prompt("추가할 이미지 경로를 입력하세요 (글만 추가하려면 빈칸):", "./상세페이지/공모전_1.png");
          const wrap = document.createDocumentFragment();
          if (imgPath && imgPath.trim() !== "") {
            const panel = document.createElement("div");
            panel.className = "d-panel";
            panel.innerHTML = `<div class="d-media is-tinted"><img src="${imgPath.trim()}" alt="상세 이미지"></div>`;
            wrap.appendChild(panel);
          }
          const h2 = document.createElement("h2");
          h2.textContent = "소제목을 입력하세요";
          const p = document.createElement("p");
          p.textContent = "여기에 상세 설명을 입력하세요.";
          wrap.appendChild(h2);
          wrap.appendChild(p);
          itemBox.insertBefore(wrap, addSecBtn);
          enableElementEditing(itemBox);
        });
        itemBox.appendChild(addSecBtn);
      });
    }
  }

  function attachDeleteBtn(targetEl) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ed-temp-ctrl ed-del-btn";
    delBtn.setAttribute("data-editor-ui", "true");
    delBtn.textContent = "×";
    delBtn.title = "삭제";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirm("이 항목을 삭제하시겠습니까?")) {
        targetEl.remove();
        refreshStarIndex();
      }
    });
    targetEl.appendChild(delBtn);
  }

  function enableElementEditing(rootEl) {
    const editableSelectors = "h1, h2, h3, h4, p, strong, span, em, .d-tags li";
    rootEl.querySelectorAll(editableSelectors).forEach((el) => {
      if (el.closest("[data-editor-ui]")) return;
      el.contentEditable = isEditMode ? "true" : "false";
      el.classList.toggle("ed-editable-highlight", isEditMode);
    });
    rootEl.querySelectorAll("img").forEach((img) => {
      if (img.closest("[data-editor-ui]")) return;
      img.classList.toggle("ed-img-highlight", isEditMode);
    });
  }

  // 편집 모드 토글
  toggleEditBtn.addEventListener("click", () => {
    isEditMode = !isEditMode;
    enableElementEditing(document);
    renderEditControls();

    if (!isEditMode) {
      textSpaceBar.style.display = "none";
      activeTextEl = null;
    }

    toggleEditBtn.textContent = isEditMode ? "🔒 편집 종료" : "✏️ 편집 모드 켜기";
    downloadHtmlBtn.style.display = isEditMode ? "inline-block" : "none";
    saveGithubBtn.style.display = isEditMode ? "inline-block" : "none";
    setTokenBtn.style.display = isEditMode ? "inline-block" : "none";
    if (isDetailPage) addDetailItemBtn.style.display = isEditMode ? "inline-block" : "none";
  });

  // 상세페이지 새 작업물 생성
  addDetailItemBtn.addEventListener("click", () => {
    const newId = prompt("새로 만들 상세페이지 번호(id)를 입력하세요 (예: 4):", "4");
    if (!newId) return;
    const itemId = "item" + newId.trim();
    if (document.getElementById(itemId)) {
      window.location.search = `?id=${newId.trim()}`;
      return;
    }
    document.querySelectorAll(".detail-item").forEach((el) => (el.style.display = "none"));
    const mainEl = document.querySelector("main");
    const newDiv = document.createElement("div");
    newDiv.id = itemId;
    newDiv.className = "detail-item";
    newDiv.style.display = "block";
    newDiv.innerHTML = `
      <h1>새 작업물 제목을 입력하세요</h1>
      <section class="d-fig">
        <p class="d-case">CASE 0${newId.trim()}</p>
        <div class="d-panel">
          <div class="d-media is-tinted">
            <img src="./heromain/banner.jpg" alt="작업 대표 이미지">
          </div>
        </div>
      </section>
      <h2>기획의도</h2>
      <p>여기에 상세 설명을 클릭하여 작성하세요.</p>`;
    mainEl.appendChild(newDiv);
    enableElementEditing(newDiv);
    renderEditControls();
    history.replaceState(null, "", `detail.html?id=${newId.trim()}`);
  });

  // 깨끗한 HTML 추출
  function getCleanHtml() {
    const cloneDoc = document.documentElement.cloneNode(true);
    cloneDoc.querySelectorAll("[data-editor-ui], .grid-editor, #admin-edit-bar, #text-space-bar, .ed-temp-ctrl").forEach((el) => el.remove());
    cloneDoc.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
    cloneDoc.querySelectorAll(".ed-editable-highlight, .ed-img-highlight").forEach((el) => {
      el.classList.remove("ed-editable-highlight", "ed-img-highlight");
      if (el.classList.length === 0) el.removeAttribute("class");
    });
    if (isDetailPage) {
      cloneDoc.querySelectorAll(".detail-item").forEach((el) => {
        el.style.display = "";
        if (!el.getAttribute("style")) el.removeAttribute("style");
      });
    }
    return "<!DOCTYPE html>\n" + cloneDoc.outerHTML;
  }

  // HTML 파일 다운로드
  downloadHtmlBtn.addEventListener("click", () => {
    const currentFile = isDetailPage ? "detail.html" : "index.html";
    const blob = new Blob([getCleanHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 토큰 설정
  setTokenBtn.addEventListener("click", () => {
    const currentToken = localStorage.getItem("gh_portfolio_token") || "";
    const input = prompt("깃허브 Personal Access Token(github_pat_...)을 붙여넣으세요:", currentToken);
    if (input !== null) {
      if (input.trim() === "") {
        localStorage.removeItem("gh_portfolio_token");
        alert("저장된 토큰이 삭제되었습니다.");
      } else {
        localStorage.setItem("gh_portfolio_token", input.trim());
        alert("토큰이 저장되었습니다.");
      }
    }
  });

  // 깃허브 저장
  saveGithubBtn.addEventListener("click", async () => {
    let token = localStorage.getItem("gh_portfolio_token");
    if (!token) {
      token = prompt("깃허브 Personal Access Token(github_pat_...)을 입력해 주세요:");
      if (!token || !token.trim()) return;
      token = token.trim();
      localStorage.setItem("gh_portfolio_token", token);
    }

    const currentFile = isDetailPage ? "detail.html" : "index.html";
    const updatedHtml = getCleanHtml();
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${currentFile}`;

    try {
      saveGithubBtn.textContent = "⏳ 저장 중...";
      const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!getRes.ok) {
        if (getRes.status === 401 || getRes.status === 403) {
          localStorage.removeItem("gh_portfolio_token");
          alert("토큰 권한이 없거나 만료되었습니다. 새 토큰을 입력해 주세요.");
          return;
        }
        throw new Error(`파일 조회 실패 (${getRes.status})`);
      }
      const fileData = await getRes.json();
      const encodedContent = btoa(unescape(encodeURIComponent(updatedHtml)));
      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `웹 편집기를 통한 ${currentFile} 업데이트`,
          content: encodedContent,
          sha: fileData.sha,
          branch: GITHUB_BRANCH
        })
      });
      if (!putRes.ok) throw new Error(`업로드 실패 (${putRes.status})`);
      alert(`✅ ${currentFile} 파일이 깃허브에 성공적으로 반영되었습니다!`);
    } catch (err) {
      alert("깃허브 저장 오류: " + err.message);
    } finally {
      saveGithubBtn.textContent = "💾 깃허브 즉시 반영";
    }
  });
})();
