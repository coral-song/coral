/* ============================================================
   script.js — 사이트 전체 동작 (한 파일)
   ------------------------------------------------------------
   1) 헤더   : 스크롤 시 유리 배경 / 마우스 빛 / 현재 섹션 표시
   2) 소개   : 스크롤하면 서서히 등장
   3) 슬라이더 : 좌우 버튼 이동
   4) 푸터   : 연도 자동 표시
   5) 그리드 : 간격 조절 패널 (값은 브라우저에 저장)
   ------------------------------------------------------------
   index.html 에서는 이 파일 하나만 불러오면 됩니다.

     <script src="script.js"></script>

   전체가 하나의 함수로 감싸져 있어 다른 코드와 이름이
   겹치지 않습니다.
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     1. 헤더
     ========================================================== */
  const header = document.querySelector(".header");

  /* 1-1. 마우스를 따라오는 은은한 빛 ------------------------
     마우스 가로 위치를 CSS 변수 --x 에 넣습니다.
     빛의 색·크기는 style.css 의 .header::before 에서 수정.
     끄고 싶으면 이 블록과 CSS의 .header::before 를 지우세요. */
  if (header) {
    header.addEventListener("mousemove", (e) => {
      const rect = header.getBoundingClientRect();
      header.style.setProperty("--x", e.clientX - rect.left + "px");
    });
  }

  /* 1-2. 스크롤하면 유리 배경 -------------------------------
     40px 넘게 내려가면 on 클래스를 붙입니다.
     나타나는 시점을 바꾸려면 아래 40 을 조절하세요. */
  function handleHeaderScroll() {
    if (!header) return;
    header.classList.toggle("on", window.scrollY > 40);
  }

  /* 1-3. 현재 섹션 메뉴 강조 --------------------------------
     화면 위 120px 지점보다 위에 있는 마지막 섹션을 "현재"로 봅니다.
     헤더 높이를 바꾸면 120 도 같이 조절하세요. */
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

  /* ==========================================================
     2. 소개 섹션 등장
     ==========================================================
     style.css 에서 #about 은 opacity:0 으로 시작합니다.
     화면에 15% 이상 들어오면 show 클래스를 붙입니다. */
  const about = document.getElementById("about");

  if (about) {
    if (!("IntersectionObserver" in window)) {
      about.classList.add("show");          // 구형 브라우저 : 효과 없이 표시
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("show");
            io.unobserve(entry.target);     // 한 번만 실행
          });
        },
        { threshold: 0.15 }
      );

      io.observe(about);
    }
  }

  /* ==========================================================
     3. 슬라이더 좌우 버튼
     ==========================================================
     한 칸 = 카드 폭(210px) + 간격(24px) = 234px
     style.css 에서 카드 폭을 바꾸면 이 숫자도 같이 바꾸세요. */
  const STEP = 234;

  document.querySelectorAll(".slider-container").forEach((container) => {
    const track = container.querySelector(".slider-track");
    if (!track) return;

    const prev = container.querySelector(".prev-btn");
    const next = container.querySelector(".next-btn");

    if (prev) {
      prev.addEventListener("click", () => {
        track.scrollBy({ left: -STEP, behavior: "smooth" });
      });
    }

    if (next) {
      next.addEventListener("click", () => {
        track.scrollBy({ left: STEP, behavior: "smooth" });
      });
    }
  });

  /* ==========================================================
     4. 푸터 연도
     ========================================================== */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ==========================================================
     5. 소개 그리드 간격 조절 패널
     ==========================================================
     CSS 변수 3개를 바꿉니다.
       --about-gap-x : 좌우 간격
       --about-gap-y : 위아래 간격
       --about-width : 그리드 전체 폭
     값은 localStorage 에 저장되어 다음 접속에도 유지됩니다. */
  const root = document.documentElement;
  const STORE_KEY = "aboutGrid";

  /* 조절 항목 : 라벨이나 범위를 바꾸려면 이 배열만 수정 */
  const CONTROLS = [
    { key: "x", label: "좌우 간격", min: 0, max: 300, step: 4, def: 200 },
    { key: "y", label: "위아래 간격", min: 0, max: 140, step: 4, def: 40 },
    { key: "w", label: "그리드 폭", min: 1000, max: 2200, step: 20, def: 1400 }
  ];

  /* 기본값 */
  const DEFAULTS = {};
  CONTROLS.forEach((c) => (DEFAULTS[c.key] = c.def));

  /* 저장된 값 불러오기 (없거나 깨졌으면 기본값) */
  let values = { ...DEFAULTS };
  try {
    values = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch (e) {
    values = { ...DEFAULTS };
  }

  /* 값 → 화면 */
  function applyGrid() {
    root.style.setProperty("--about-gap-x", values.x + "px");
    root.style.setProperty("--about-gap-y", values.y + "px");
    root.style.setProperty("--about-width", values.w + "px");
  }

  /* 값 → 저장 */
  function saveGrid() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(values));
    } catch (e) {
      /* 저장이 막힌 브라우저(시크릿 모드)에서는 그냥 넘어감 */
    }
  }

  /* 패널 마크업 */
  const gridPanel = document.createElement("div");
  gridPanel.className = "grid-editor";

  const rows = CONTROLS.map(
    (c) => `
      <label class="ge-row">
        <span>${c.label}</span>
        <input class="ge-range" type="range" data-key="${c.key}"
               min="${c.min}" max="${c.max}" step="${c.step}">
        <b class="ge-val" data-val="${c.key}"></b>
      </label>`
  ).join("");

  gridPanel.innerHTML = `
    <button class="ge-toggle" type="button">간격 조절</button>
    <div class="ge-panel" hidden>
      <p class="ge-title">소개 그리드</p>
      ${rows}
      <div class="ge-btns">
        <button class="ge-btn ge-copy" type="button">CSS 복사</button>
        <button class="ge-btn ge-reset" type="button">초기화</button>
      </div>
      <p class="ge-note">값은 이 브라우저에 저장됩니다</p>
    </div>`;

  document.body.appendChild(gridPanel);

  const gridToggle = gridPanel.querySelector(".ge-toggle");
  const gridBody = gridPanel.querySelector(".ge-panel");
  const gridRanges = gridPanel.querySelectorAll(".ge-range");
  const gridLabels = gridPanel.querySelectorAll(".ge-val");

  /* 슬라이더·숫자를 현재 값에 맞춤 */
  function syncGrid() {
    gridRanges.forEach((r) => (r.value = values[r.dataset.key]));
    gridLabels.forEach((v) => (v.textContent = values[v.dataset.val] + "px"));
  }

  /* 슬라이더 이동 */
  gridRanges.forEach((range) => {
    range.addEventListener("input", () => {
      values[range.dataset.key] = Number(range.value);
      applyGrid();
      saveGrid();
      syncGrid();
    });
  });

  /* 초기화 */
  gridPanel.querySelector(".ge-reset").addEventListener("click", () => {
    values = { ...DEFAULTS };
    applyGrid();
    saveGrid();
    syncGrid();
  });

  /* CSS 복사 : 나온 코드를 style.css 에 붙이면 값이 고정됩니다 */
  gridPanel.querySelector(".ge-copy").addEventListener("click", async () => {
    const css =
      ".about-grid {\n" +
      "  column-gap: " + values.x + "px;\n" +
      "  row-gap: " + values.y + "px;\n" +
      "  max-width: " + values.w + "px;\n" +
      "}";

    try {
      await navigator.clipboard.writeText(css);
      gridToggle.textContent = "복사됨";
    } catch (e) {
      window.prompt("아래 코드를 복사하세요", css);
    }

    setTimeout(() => (gridToggle.textContent = "간격 조절"), 1200);
  });

  /* 패널 열고 닫기 */
  gridToggle.addEventListener("click", () => {
    gridBody.hidden = !gridBody.hidden;
  });

  applyGrid();
  syncGrid();

  /* ==========================================================
     스크롤 이벤트는 마지막에 한 번만 등록
     ========================================================== */
  window.addEventListener(
    "scroll",
    () => {
      handleHeaderScroll();
      markActiveMenu();
    },
    { passive: true }
  );

  handleHeaderScroll();   // 새로고침 시 상태 맞추기
  markActiveMenu();
})();

document.querySelectorAll(".sub").forEach((el, i) => {
  el.style.setProperty("--i", i);
});
