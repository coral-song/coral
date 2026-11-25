/* ============================================================
   script.js — 사이트 동작 (헤더 스크롤, 메뉴 하이라이트, 슬라이더, 간격 값 적용)
   편집 UI/깃허브 토큰 기능은 제거된 공개용 버전입니다.
   ============================================================ */

(function () {
  "use strict";

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

  const root = document.documentElement;
  const STORE_KEY = "aboutGridAndTextSpacing";

  const CONTROLS = [
    { key: "x", cssVar: "--about-gap-x", def: 200 },
    { key: "y", cssVar: "--about-gap-y", def: 40 },
    { key: "w", cssVar: "--about-width", def: 1400 },
    { key: "tt", cssVar: "--thumb-title-top", def: 12 },
    { key: "tg", cssVar: "--thumb-text-gap", def: 8 },
    { key: "tr", cssVar: "--tl-row-gap", def: 6 },
    { key: "ts", cssVar: "--tl-sub-gap", def: 4 },
    { key: "ag", cssVar: "--article-gap", def: 24 }
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

  applyGrid();

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
})();