/* ============================================================
   script.js — 사이트 전체 동작 + 사이트 내 직접 편집 시스템 (VS Code 실행 차단)
   ============================================================ */

(function () {
  "use strict";

  const isDetailPage =
    window.location.pathname.includes("detail.html") ||
    document.body.classList.contains("detail-page");

  /* ==========================================================
     0. 브라우저에 임시 저장된 수정본이 있으면 페이지 로드시 자동 복원
     ========================================================== */
  const DRAFT_KEY = isDetailPage ? "draft_detail_main" : "draft_index_main";
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  const mainContainer = document.querySelector("main");

  if (savedDraft && mainContainer) {
    mainContainer.innerHTML = savedDraft;
    if (isDetailPage) {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id") || "1";
      document.querySelectorAll(".detail-item").forEach((el) => (el.style.display = "none"));
      const target = document.getElementById("item" + id);
      if (target) target.style.display = "block";
    }
  }

  /* ==========================================================
     1. 헤더 & 소개 등장 & 슬라이더 좌우 이동
     ========================================================== */
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

  const STEP = 234;
  document.querySelectorAll(".slider-container").forEach((container) => {
    const track = container.querySelector(".slider-track");
    if (!track) return;
    const prev = container.querySelector(".prev-btn");
    const next = container.querySelector(".next-btn");
    if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -STEP, behavior: "smooth" }));
    if (next) next.addEventListener("click", () => track.scrollBy({ left: STEP, behavior: "smooth" }));
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  function refreshStarIndex() {
    document.querySelectorAll(".sub").forEach((el, i) => {
      el.style.setProperty("--i", i);
    });
  }
  refreshStarIndex();

  /* ==========================================================
     2. 그리드 & 글자 간격 조절 패널 (메인 페이지용)
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
    CONTROLS.forEach((c) => root.style.setProperty(c.cssVar, values[c.key] + "px"));
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
     3. 사이트 내 직접 편집 시스템 (메인 & 상세페이지 통합)
     ========================================================== */
  const GITHUB_OWNER = "coral-song";
  const GITHUB_REPO = "coral";
  const GITHUB_BRANCH = "main";

  let isEditMode = false;
  let activeTextEl = null;

  // 3-1. 우측 하단 편집 컨트롤 바 생성
  const editBar = document.createElement("div");
  editBar.id = "admin-edit-bar";
  editBar.setAttribute("data-editor-ui", "true");
  editBar.innerHTML = `
    <button id="toggleEditBtn" type="button" class="ed-btn ed-primary">✏️ 편집 모드 켜기</button>
    <button id="saveLocalBtn" type="button" class="ed-btn" style="display:none;">💾 브라우저 임시저장</button>
    <button id="resetLocalBtn" type="button" class="ed-btn" style="display:none;">↩️ 임시저장 초기화</button>
    <button id="downloadHtmlBtn" type="button" class="ed-btn" style="display:none;">📥 HTML 다운로드</button>
    <button id="saveGithubBtn" type="button" class="ed-btn ed-save" style="display:none;">🚀 깃허브에 즉시 반영</button>
    <button id="setTokenBtn" type="button" class="ed-btn" style="display:none;" title="깃허브 토큰 설정">🔑 토큰</button>
  `;
  document.body.appendChild(editBar);

  // 3-2. 상단 미니 조절바 (글자 간격 조절 + 상세페이지 항목 스위처)
  const textSpaceBar = document.createElement("div");
  textSpaceBar.id = "text-space-bar";
  textSpaceBar.setAttribute("data-editor-ui", "true");
  textSpaceBar.innerHTML = `
    <div id="detailSwitcherWrap" style="display:none; align-items:center; gap:6px; padding-right:10px; border-right:1px solid rgba(255,255,255,0.2);"></div>
    <strong style="color:#fcfdb3;">선택 글자 간격</strong>
    <label>위(px) <input type="number" id="tsMarginTop" step="1"></label>
    <label>아래(px) <input type="number" id="tsMarginBottom" step="1"></label>
    <label>행간 <input type="number" id="tsLineHeight" step="0.1" min="0.8" max="3"></label>
    <label>자간(px) <input type="number" id="tsLetterSpacing" step="0.5"></label>
    <button type="button" id="tsResetBtn" class="ge-btn" style="flex:none;">초기화</button>
  `;
  document.body.appendChild(textSpaceBar);

  const toggleEditBtn = document.getElementById("toggleEditBtn");
  const saveLocalBtn = document.getElementById("saveLocalBtn");
  const resetLocalBtn = document.getElementById("resetLocalBtn");
  const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");
  const saveGithubBtn = document.getElementById("saveGithubBtn");
  const setTokenBtn = document.getElementById("setTokenBtn");
  const detailSwitcherWrap = document.getElementById("detailSwitcherWrap");

  const tsMarginTop = document.getElementById("tsMarginTop");
  const tsMarginBottom = document.getElementById("tsMarginBottom");
  const tsLineHeight = document.getElementById("tsLineHeight");
  const tsLetterSpacing = document.getElementById("tsLetterSpacing");
  const tsResetBtn = document.getElementById("tsResetBtn");

  // 3-3. 푸터의 편집 버튼이나 기존 vscode:// 링크 클릭 시 VS Code 실행을 막고 사이트 내 편집기 켜기
  document.addEventListener(
    "click",
    (e) => {
      const trigger = e.target.closest(
        'a[href^="vscode:"], .footer-edit-trigger, [data-action="edit"]'
      );
      const footerEl = e.target.closest("footer a, footer button");
      if (
        trigger ||
        (footerEl && footerEl.textContent.includes("편집"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        toggleEditBtn.click();
      }
    },
    true
  );

  // 3-4. 상세페이지 상단 항목 전환 탭 (1번, 2번, 3번, + 새 상세페이지) 렌더링
  function renderDetailSwitcher() {
    if (!isDetailPage) return;
    detailSwitcherWrap.style.display = isEditMode ? "flex" : "none";
    detailSwitcherWrap.innerHTML = `<span style="color:#bfd8ff; font-weight:600;">상세페이지 전환:</span>`;

    document.querySelectorAll(".detail-item").forEach((item) => {
      const idNum = item.id.replace("item", "");
      const h1Text = item.querySelector("h1")?.textContent.trim().slice(0, 8) || `항목 ${idNum}`;
      const isVisible = item.style.display !== "none";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ge-btn";
      btn.style.cssText = `padding:4px 10px; font-weight:600; background:${isVisible ? "#1d7ac2" : "#14202e"};`;
      btn.textContent = `${idNum}번 (${h1Text})`;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".detail-item").forEach((el) => (el.style.display = "none"));
        item.style.display = "block";
        history.replaceState(null, "", `detail.html?id=${idNum}`);
        renderDetailSwitcher();
      });
      detailSwitcherWrap.appendChild(btn);
    });

    const addNewPageBtn = document.createElement("button");
    addNewPageBtn.type = "button";
    addNewPageBtn.className = "ge-btn";
    addNewPageBtn.style.cssText = "padding:4px 10px; background:#2b8a3e; color:#fff; font-weight:600;";
    addNewPageBtn.textContent = "+ 새 ID 페이지";
    addNewPageBtn.addEventListener("click", () => {
      const nextNum = document.querySelectorAll(".detail-item").length + 1;
      const newId = prompt("새로 만들 상세페이지 번호(id)를 입력하세요:", String(nextNum));
      if (!newId) return;
      const itemId = "item" + newId.trim();
      document.querySelectorAll(".detail-item").forEach((el) => (el.style.display = "none"));

      let targetDiv = document.getElementById(itemId);
      if (!targetDiv) {
        targetDiv = document.createElement("div");
        targetDiv.id = itemId;
        targetDiv.className = "detail-item";
        targetDiv.innerHTML = `
          <h1>새 작업물 제목을 입력하세요</h1>
          <section class="d-fig">
            <p class="d-case">CASE 0${newId.trim()}</p>
            <p class="d-word" aria-hidden="true">PROJECT</p>
            <div class="d-panel">
              <div class="d-media is-tinted">
                <img src="./heromain/banner.jpg" alt="작업 대표 이미지">
              </div>
            </div>
            <ul class="d-tags">
              <li>2026</li>
              <li>카테고리</li>
            </ul>
          </section>
          <h2>기획의도 및 작업 내용</h2>
          <p>여기에 상세 설명을 클릭하여 자유롭게 작성하세요.</p>
        `;
        document.querySelector("main").appendChild(targetDiv);
      }
      targetDiv.style.display = "block";
      history.replaceState(null, "", `detail.html?id=${newId.trim()}`);
      enableElementEditing(document);
      renderEditControls();
      renderDetailSwitcher();
    });
    detailSwitcherWrap.appendChild(addNewPageBtn);
  }

  // 3-5. 선택한 글자 간격 실시간 조절
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

  // 3-6. 편집 모드일 때 링크 이동 차단 및 유튜브 링크 수정
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

  // 3-7. 편집 모드일 때 이미지 클릭 시 경로 변경 또는 로컬 파일 불러오기
  document.addEventListener("click", (e) => {
    if (!isEditMode) return;
    const img = e.target.closest("img");
    if (!img || img.closest("[data-editor-ui]")) return;

    const currentSrc = img.getAttribute("src");
    const newSrc = prompt(
      "변경할 이미지 경로를 입력하세요.\n(내 컴퓨터의 이미지 파일을 직접 고르려면 '파일' 이라고 입력하세요):",
      currentSrc
    );
    if (!newSrc) return;

    if (newSrc.trim() === "파일") {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.setAttribute("src", ev.target.result);
        };
        reader.readAsDataURL(file);
      });
      fileInput.click();
    } else if (newSrc.trim() !== "") {
      img.setAttribute("src", newSrc.trim());
    }
  });

  // 3-8. 항목 추가 / 순서 이동 / 삭제 버튼 생성
  function renderEditControls() {
    document.querySelectorAll(".ed-temp-ctrl").forEach((el) => el.remove());
    if (!isEditMode) return;

    // A. 메인페이지 타임라인 (.timeline)
    document.querySelectorAll(".timeline").forEach((ul) => {
      ul.querySelectorAll("li").forEach((li) => attachDeleteBtn(li));
      const addBtn = createInlineBtn("+ 이력 항목 추가", () => {
        const li = document.createElement("li");
        li.innerHTML = `<span>기간/구분</span><strong>내용 제목 <em>보조 설명</em></strong>`;
        ul.appendChild(li);
        enableElementEditing(li);
        attachDeleteBtn(li);
      });
      ul.after(addBtn);
    });

    // B. 메인페이지 스킬/AI 아이콘 (.skills)
    document.querySelectorAll(".skills").forEach((ul) => {
      ul.querySelectorAll("li").forEach((li) => attachDeleteBtn(li));
      const addSkillBtn = createInlineBtn("+ 아이콘 추가", () => {
        const imgPath = prompt("아이콘 이미지 경로:", "./heromain/skill icons/GM.gif") || "./heromain/skill icons/GM.gif";
        const name = prompt("이름:", "새 툴") || "새 툴";
        const li = document.createElement("li");
        li.innerHTML = `<img src="${imgPath.trim()}" alt="${name}"><span>${name}</span>`;
        ul.appendChild(li);
        enableElementEditing(li);
        attachDeleteBtn(li);
      });
      ul.after(addSkillBtn);
    });

    // C. 메인페이지 소개 소제목 구역 (.about-grid > div)
    document.querySelectorAll(".about-grid > div").forEach((col) => {
      col.querySelectorAll("article").forEach((art) => {
        art.style.position = "relative";
        attachDeleteBtn(art);
      });
      const addArtBtn = createInlineBtn("➕ 새 소제목 구역(AI·기술·이력) 추가", () => {
        const title = prompt("새 소제목 이름 (예: AI, 기술, 수상):", "AI");
        if (!title) return;
        const isIconGrid = confirm("아이콘 격자 형태로 만들까요?\n[확인] = 아이콘 격자 / [취소] = 텍스트 타임라인");
        const art = document.createElement("article");
        art.style.position = "relative";
        art.innerHTML = isIconGrid
          ? `<h3 class="sub">${title.trim()}</h3><ul class="skills"><li><img src="./heromain/skill icons/GM.gif" alt="아이콘"><span>새 아이콘</span></li></ul>`
          : `<h3 class="sub">${title.trim()}</h3><ul class="timeline"><li><span>2026</span><strong>항목 제목 <em>보조 설명</em></strong></li></ul>`;
        col.insertBefore(art, addArtBtn);
        refreshStarIndex();
        enableElementEditing(art);
        renderEditControls();
      });
      col.appendChild(addArtBtn);
    });

    // D. 메인페이지 슬라이더 (.slider-track)
    document.querySelectorAll(".slider-track").forEach((track) => {
      track.querySelectorAll(".slider-item").forEach((item) => {
        item.style.position = "relative";
        attachDeleteBtn(item);
      });
      const addCardBtn = createInlineBtn("+ 새 썸네일 카드 추가", () => {
        const idNum = prompt("연결할 상세페이지 ID 번호 (예: 4):", "4");
        if (!idNum) return;
        const imgPath = prompt("썸네일 이미지 경로:", "./heromain/banner.jpg") || "./heromain/banner.jpg";
        const title = prompt("작품 제목:", "새 프로젝트") || "새 프로젝트";
        const tag = prompt("분류(연도/분야):", "2026") || "2026";
        const li = document.createElement("li");
        li.className = "slider-item";
        li.style.position = "relative";
        li.innerHTML = `
          <a target="_blank" rel="noopener" href="detail.html?id=${idNum.trim()}">
            <img class="thumb" src="${imgPath.trim()}" alt="${title}">
            <strong>${title}</strong>
            <span>${tag}</span>
          </a>`;
        track.appendChild(li);
        enableElementEditing(li);
        attachDeleteBtn(li);
      });
      track.parentElement.after(addCardBtn);
    });

    // E. 상세페이지 (.detail-item) 전용 사이트 내 편집 도구
    if (isDetailPage) {
      // 키워드 태그 (.d-tags) 추가/삭제
      document.querySelectorAll(".d-tags").forEach((ul) => {
        ul.querySelectorAll("li").forEach((li) => {
          li.style.position = "relative";
          attachDeleteBtn(li);
        });
        const addTagBtn = createInlineBtn("+ 태그 추가", () => {
          const li = document.createElement("li");
          li.style.position = "relative";
          li.textContent = "새 키워드";
          ul.appendChild(li);
          enableElementEditing(ul);
          attachDeleteBtn(li);
        });
        ul.after(addTagBtn);
      });

      // 상세페이지 내부 요소 (이미지 패널, 소제목, 본문, 구분선) 개별 삭제 버튼
      document.querySelectorAll(".detail-item").forEach((itemBox) => {
        Array.from(itemBox.children).forEach((child) => {
          if (child.tagName === "H1" || child.classList.contains("ed-temp-ctrl")) return;
          child.style.position = "relative";
          attachDeleteBtn(child);
        });

        // 상세페이지 하단 블록 추가 도구모음
        const toolWrap = document.createElement("div");
        toolWrap.className = "ed-temp-ctrl";
        toolWrap.setAttribute("data-editor-ui", "true");
        toolWrap.style.cssText = "margin-top:32px; padding:16px; border:1px dashed #1d7ac2; border-radius:12px; display:flex; flex-wrap:wrap; gap:8px;";

        toolWrap.appendChild(
          createInlineBtn("➕ 소제목 + 본문 추가", () => {
            const h2 = document.createElement("h2");
            h2.textContent = "새 소제목을 입력하세요";
            const p = document.createElement("p");
            p.textContent = "여기에 상세 설명을 클릭하여 입력하세요.";
            itemBox.insertBefore(h2, toolWrap);
            itemBox.insertBefore(p, toolWrap);
            enableElementEditing(itemBox);
            renderEditControls();
          })
        );

        toolWrap.appendChild(
          createInlineBtn("🖼️ 이미지 패널 추가", () => {
            const imgPath = prompt("추가할 이미지 경로:", "./상세페이지/공모전_1.png") || "./상세페이지/공모전_1.png";
            const panel = document.createElement("div");
            panel.className = "d-panel";
            panel.style.marginTop = "24px";
            panel.innerHTML = `<div class="d-media is-tinted"><img src="${imgPath.trim()}" alt="상세 이미지"></div>`;
            itemBox.insertBefore(panel, toolWrap);
            enableElementEditing(itemBox);
            renderEditControls();
          })
        );

        toolWrap.appendChild(
          createInlineBtn("🎴 CASE 배너 박스(.d-fig) 추가", () => {
            const fig = document.createElement("section");
            fig.className = "d-fig";
            fig.innerHTML = `
              <p class="d-case">CASE 01</p>
              <p class="d-word" aria-hidden="true">WORK</p>
              <div class="d-panel">
                <div class="d-media is-tinted">
                  <img src="./heromain/banner.jpg" alt="작업 이미지">
                </div>
              </div>
              <ul class="d-tags">
                <li>2026</li>
                <li>키워드</li>
              </ul>`;
            itemBox.insertBefore(fig, toolWrap);
            enableElementEditing(itemBox);
            renderEditControls();
          })
        );

        toolWrap.appendChild(
          createInlineBtn("➖ 구분선 추가", () => {
            const hr = document.createElement("hr");
            hr.className = "d-divider";
            itemBox.insertBefore(hr, toolWrap);
            renderEditControls();
          })
        );

        itemBox.appendChild(toolWrap);
      });
    }
  }

  function createInlineBtn(label, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ed-temp-ctrl ed-add-inline";
    btn.setAttribute("data-editor-ui", "true");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function attachDeleteBtn(targetEl) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "ed-temp-ctrl ed-del-btn";
    delBtn.setAttribute("data-editor-ui", "true");
    delBtn.textContent = "×";
    delBtn.title = "이 항목 삭제";
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
    const editableSelectors =
      "h1, h2, h3, h4, p, strong, span, em, .d-tags li, .d-case, .d-word, .yt-btn";
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

  // 3-9. 편집 모드 켜기 / 끄기
  toggleEditBtn.addEventListener("click", () => {
    isEditMode = !isEditMode;
    enableElementEditing(document);
    renderEditControls();
    renderDetailSwitcher();

    if (isEditMode) {
      textSpaceBar.style.display = "flex";
    } else {
      textSpaceBar.style.display = "none";
      activeTextEl = null;
    }

    toggleEditBtn.textContent = isEditMode ? "🔒 편집 종료" : "✏️ 편집 모드 켜기";
    saveLocalBtn.style.display = isEditMode ? "inline-block" : "none";
    resetLocalBtn.style.display = isEditMode ? "inline-block" : "none";
    downloadHtmlBtn.style.display = isEditMode ? "inline-block" : "none";
    saveGithubBtn.style.display = isEditMode ? "inline-block" : "none";
    setTokenBtn.style.display = isEditMode ? "inline-block" : "none";
  });

  // 3-10. 저장용 깨끗한 HTML 추출
  function getCleanMainHtml() {
    const cloneMain = document.querySelector("main").cloneNode(true);
    cloneMain.querySelectorAll("[data-editor-ui], .ed-temp-ctrl").forEach((el) => el.remove());
    cloneMain.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
    cloneMain.querySelectorAll(".ed-editable-highlight, .ed-img-highlight").forEach((el) => {
      el.classList.remove("ed-editable-highlight", "ed-img-highlight");
      if (el.classList.length === 0) el.removeAttribute("class");
    });
    return cloneMain.innerHTML;
  }

  function getCleanFullHtml() {
    const cloneDoc = document.documentElement.cloneNode(true);
    cloneDoc
      .querySelectorAll("[data-editor-ui], .grid-editor, #admin-edit-bar, #text-space-bar, .ed-temp-ctrl")
      .forEach((el) => el.remove());
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

  // 3-11. 브라우저 내 즉시 임시저장 (새로고침해도 유지)
  saveLocalBtn.addEventListener("click", () => {
    try {
      localStorage.setItem(DRAFT_KEY, getCleanMainHtml());
      alert("✅ 사이트 내에 즉시 저장되었습니다! (새로고침해도 유지됩니다)");
    } catch (e) {
      alert("저장 용량을 초과했거나 브라우저 저장이 제한되어 있습니다.");
    }
  });

  resetLocalBtn.addEventListener("click", () => {
    if (confirm("브라우저에 임시 저장된 수정본을 지우고 원본 파일 상태로 되돌릴까요?")) {
      localStorage.removeItem(DRAFT_KEY);
      location.reload();
    }
  });

  // 3-12. HTML 파일 다운로드
  downloadHtmlBtn.addEventListener("click", () => {
    const currentFile = isDetailPage ? "detail.html" : "index.html";
    const blob = new Blob([getCleanFullHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 3-13. 깃허브 토큰 설정 및 원클릭 반영
  setTokenBtn.addEventListener("click", () => {
    const currentToken = localStorage.getItem("gh_portfolio_token") || "";
    const input = prompt("깃허브 Personal Access Token(github_pat_...)을 입력하세요:", currentToken);
    if (input !== null) {
      if (input.trim() === "") localStorage.removeItem("gh_portfolio_token");
      else localStorage.setItem("gh_portfolio_token", input.trim());
    }
  });

  saveGithubBtn.addEventListener("click", async () => {
    let token = localStorage.getItem("gh_portfolio_token");
    if (!token) {
      token = prompt("깃허브 Personal Access Token(github_pat_...)을 입력해 주세요:");
      if (!token || !token.trim()) return;
      token = token.trim();
      localStorage.setItem("gh_portfolio_token", token);
    }

    const currentFile = isDetailPage ? "detail.html" : "index.html";
    const updatedHtml = getCleanFullHtml();
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${currentFile}`;

    try {
      saveGithubBtn.textContent = "⏳ 반영 중...";
      const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!getRes.ok) throw new Error(`파일 조회 실패 (${getRes.status})`);

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

      localStorage.setItem(DRAFT_KEY, getCleanMainHtml());
      alert(`✅ ${currentFile} 파일이 깃허브 저장소에 직접 반영되었습니다!`);
    } catch (err) {
      alert("깃허브 반영 실패: " + err.message + "\n[💾 브라우저 임시저장] 또는 [📥 HTML 다운로드]를 이용해 주세요.");
    } finally {
      saveGithubBtn.textContent = "🚀 깃허브에 즉시 반영";
    }
  });
})();
