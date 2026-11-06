/* ============================================================
   site-editor.js v2 - 사이트 안에서 편집하고 GitHub에 커밋
   ------------------------------------------------------------
   우측 하단 플로팅 버튼(또는 Ctrl+Shift+E)으로 편집 시작
   글자 수정 / 이미지 교체 / 스타일(크기·색·폰트·간격) 수정
   저장 시 이미지는 저장소 images/ 로 업로드되고 HTML이 커밋됩니다
   ============================================================ */
(() => {
  const OWNER = "coral-song";
  const REPO = "coral";
  const BRANCH = "main";
  const IMG_DIR = "images";

  const PAGE = location.pathname.endsWith("detail.html") ? "detail.html" : "index.html";
  const TOKEN_KEY = "coralEditToken";

  const TEXT_SEL = PAGE === "detail.html"
    ? ["h1", "h2", "p", ".d-case", ".d-tags li", ".back", ".yt-btn"]
    : [".intro-head", ".intro-name", ".sub", ".timeline span", ".timeline strong",
       ".timeline em", ".skills span", ".slider-item strong", ".slider-item span",
       ".footer > p:first-of-type"];

  let mode = "view";
  let selected = null;
  const pending = new Map();

  const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

  const headers = () => ({
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + getToken(),
    "Content-Type": "application/json",
  });

  const toB64 = (input) => {
    if (typeof input === "string") {
      const bytes = new TextEncoder().encode(input);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      return Promise.resolve(btoa(bin));
    }
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
      fr.onerror = reject;
      fr.readAsDataURL(input);
    });
  };

  async function ghSha(path) {
    const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + BRANCH, { headers: headers() });
    if (r.status === 401) throw new Error("토큰이 올바르지 않습니다");
    if (r.status === 404) return null;
    const j = await r.json();
    return j && j.sha ? j.sha : null;
  }

  async function ghPut(path, contentB64, message, sha) {
    const body = { message: message, content: contentB64, branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.message || "HTTP " + r.status);
    }
    return r.json();
  }

  async function uploadImage(file) {
    const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const safe = (file.name || "image").replace(/[^\w.\-]+/g, "-").toLowerCase();
    const path = IMG_DIR + "/" + stamp + "-" + safe;
    const b64 = await toB64(file);
    await ghPut(path, b64, "upload: " + path);
    return "./" + encodeURI(path);
  }

  const clean = (clone) => {
    clone.querySelectorAll("[data-coral-ui]").forEach((n) => n.remove());
    clone.querySelectorAll(".grid-editor").forEach((n) => n.remove());
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    clone.querySelectorAll("[spellcheck]").forEach((n) => n.removeAttribute("spellcheck"));
    clone.querySelectorAll(".coral-sel").forEach((n) => n.classList.remove("coral-sel"));
    clone.querySelectorAll(".coral-img").forEach((n) => n.classList.remove("coral-img"));
    const about = clone.querySelector("#about");
    if (about) about.classList.remove("show");
    clone.removeAttribute("style");
    clone.querySelectorAll(".detail-item").forEach((n) => {
      if (n.style && n.style.display === "block") n.removeAttribute("style");
    });
  };

  const serialize = () => {
    const head = [];
    document.childNodes.forEach((n) => {
      if (n.nodeType === 10) head.push("<!DOCTYPE html>");
      else if (n.nodeType === 8) head.push("<!--" + n.data + "-->");
    });
    const clone = document.documentElement.cloneNode(true);
    clean(clone);
    return head.join("\n") + "\n" + clone.outerHTML + "\n";
  };

  async function save() {
    if (!getToken()) return openTokenModal();
    setStatus("저장 중…");

    try {
      if (pending.size) {
        let i = 0;
        for (const entry of pending) {
          i++;
          setStatus("이미지 업로드 중… (" + i + "/" + pending.size + ")");
          const rel = await uploadImage(entry[1]);
          entry[0].src = rel;
          entry[0].removeAttribute("srcset");
        }
        pending.clear();
      }

      setStatus("HTML 저장 중…");
      const sha = await ghSha(PAGE);
      const content = await toB64(serialize());
      try {
        await ghPut(PAGE, content, "edit: " + PAGE + " 웹 편집", sha);
      } catch (err) {
        if (String(err.message || "").match(/409|sha/i)) {
          const fresh = await ghSha(PAGE);
          await ghPut(PAGE, content, "edit: " + PAGE + " 웹 편집", fresh);
        } else {
          throw err;
        }
      }

      setStatus("저장 완료 · 1분 안에 반영됩니다");
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      setStatus("실패 : " + e.message, true);
    }
  }

  const setTextEditable = (on) => {
    TEXT_SEL.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (on) {
          el.setAttribute("contenteditable", "true");
          el.setAttribute("spellcheck", "false");
        } else {
          el.removeAttribute("contenteditable");
          el.removeAttribute("spellcheck");
        }
      });
    });
  };

  const markImages = (on) => {
    document.querySelectorAll(".d-media img, .d-panel img, .detail-page img, .intro-banner, .thumb").forEach((img) => {
      img.classList.toggle("coral-img", on);
    });
  };

  function setMode(next) {
    if (next !== "view" && !getToken()) return openTokenModal();
    mode = next;

    setTextEditable(next === "edit");
    markImages(next === "edit");
    if (next !== "style" && selected) {
      selected.classList.remove("coral-sel");
      selected = null;
      stylePanel.hidden = true;
    }

    fab.hidden = next !== "view";
    bar.hidden = next === "view";
    bar.querySelector("[data-act=edit]").classList.toggle("is-on", next === "edit");
    bar.querySelector("[data-act=style]").classList.toggle("is-on", next === "style");
    document.body.classList.toggle("coral-editing", next !== "view");

    if (next === "edit") setStatus("글자 수정 · 이미지를 클릭하면 교체");
    else if (next === "style") setStatus("스타일 · 요소를 클릭하세요");
    else setStatus("");
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.setAttribute("data-coral-ui", "file");
  document.body.appendChild(fileInput);

  let imgTarget = null;
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f || !imgTarget) return;
    pending.set(imgTarget, f);
    imgTarget.src = URL.createObjectURL(f);
    setStatus("이미지 교체됨 · 저장을 눌러야 반영됩니다");
    fileInput.value = "";
  });

  document.addEventListener("click", (e) => {
    if (mode === "view") return;
    if (e.target.closest("[data-coral-ui]")) return;

    const img = e.target.closest("img");
    if (img && mode === "edit") {
      e.preventDefault();
      e.stopPropagation();
      imgTarget = img;
      fileInput.click();
      return;
    }

    if (mode === "style") {
      const el = e.target.closest("main *");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      if (selected) selected.classList.remove("coral-sel");
      selected = el;
      selected.classList.add("coral-sel");
      openStylePanel(el);
    }
  }, true);

  const stylePanel = document.createElement("div");
  stylePanel.className = "coral-style";
  stylePanel.setAttribute("data-coral-ui", "style");
  stylePanel.hidden = true;
  stylePanel.innerHTML = [
    '<p class="coral-style__title" data-sel>선택한 요소</p>',
    '<label>크기 <input type="number" data-p="fontSize" step="1" min="8" max="140"> px</label>',
    '<label>색 <input type="color" data-p="color"></label>',
    '<label>폰트 <select data-p="fontFamily">',
    '<option value="">그대로</option>',
    '<option value="Eulyoo, serif">을유 (본문)</option>',
    '<option value="system-ui, sans-serif">시스템 고딕</option>',
    '</select></label>',
    '<label>줄 간격 <input type="number" data-p="lineHeight" step="0.05" min="0.8" max="3"></label>',
    '<label>자간 <input type="number" data-p="letterSpacing" step="0.5" min="-3" max="10"> px</label>',
    '<label>위 여백 <input type="number" data-p="marginTop" step="2"> px</label>',
    '<label>아래 여백 <input type="number" data-p="marginBottom" step="2"> px</label>',
    '<div class="coral-style__row">',
    '<button type="button" data-act="reset">초기화</button>',
    '<button type="button" data-act="close">닫기</button>',
    '</div>',
  ].join("");
  document.body.appendChild(stylePanel);

  const rgbToHex = (rgb) => {
    const m = String(rgb).match(/\d+/g);
    if (!m) return "#ffffff";
    return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  };

  function openStylePanel(el) {
    stylePanel.hidden = false;
    const cs = getComputedStyle(el);
    const cls = typeof el.className === "string" && el.className.trim()
      ? "." + el.className.trim().split(/\s+/).join(".")
      : "";
    stylePanel.querySelector("[data-sel]").textContent = el.tagName.toLowerCase() + cls;

    const set = (p, v) => {
      const f = stylePanel.querySelector("[data-p=" + p + "]");
      if (f) f.value = v;
    };
    const fs = parseFloat(cs.fontSize) || 16;
    set("fontSize", Math.round(fs));
    set("lineHeight", Math.round((parseFloat(cs.lineHeight) / fs) * 100) / 100);
    set("letterSpacing", Math.round((parseFloat(cs.letterSpacing) || 0) * 10) / 10);
    set("marginTop", Math.round(parseFloat(cs.marginTop) || 0));
    set("marginBottom", Math.round(parseFloat(cs.marginBottom) || 0));
    set("color", rgbToHex(cs.color));
  }

  stylePanel.addEventListener("input", (e) => {
    if (!selected) return;
    const p = e.target.dataset.p;
    if (!p) return;
    const v = e.target.value;
    if (p === "fontFamily") {
      if (v) selected.style.fontFamily = v;
      else selected.style.removeProperty("font-family");
      return;
    }
    const px = (p === "fontSize" || p === "letterSpacing" || p === "marginTop" || p === "marginBottom") ? "px" : "";
    selected.style[p] = v + px;
  });

  stylePanel.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (act === "close") stylePanel.hidden = true;
    if (act === "reset" && selected) {
      selected.removeAttribute("style");
      openStylePanel(selected);
    }
  });

  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "coral-fab";
  fab.setAttribute("data-coral-ui", "fab");
  fab.setAttribute("aria-label", "편집 모드 시작");
  fab.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
    '</svg><span>편집</span>';
  document.body.appendChild(fab);

  const bar = document.createElement("div");
  bar.className = "coral-bar";
  bar.setAttribute("data-coral-ui", "bar");
  bar.hidden = true;
  bar.innerHTML = [
    '<span class="coral-status" data-status></span>',
    '<button type="button" data-act="edit">글자</button>',
    '<button type="button" data-act="style">스타일</button>',
    '<button type="button" data-act="save">저장</button>',
    '<button type="button" data-act="cancel">취소</button>',
    '<button type="button" data-act="token" title="GitHub 토큰">⚙</button>',
  ].join("");
  document.body.appendChild(bar);

  const setStatus = (msg, isError) => {
    const el = bar.querySelector("[data-status]");
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  };

  fab.addEventListener("click", () => setMode("edit"));

  bar.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (act === "edit") setMode("edit");
    else if (act === "style") setMode("style");
    else if (act === "save") save();
    else if (act === "cancel") location.reload();
    else if (act === "token") openTokenModal();
  });

  function openTokenModal() {
    if (document.querySelector("[data-coral-ui=modal]")) return;
    const m = document.createElement("div");
    m.className = "coral-modal";
    m.setAttribute("data-coral-ui", "modal");
    m.innerHTML = [
      '<div class="coral-modal__box">',
      '<h3>GitHub 토큰</h3>',
      '<p>저장 권한이 있는 토큰을 넣어 주세요.<br>이 브라우저에만 저장되고 사이트 파일에는 남지 않습니다.</p>',
      '<input type="password" placeholder="github_pat_..." autocomplete="off">',
      '<div class="coral-modal__row">',
      '<button type="button" data-m="save">저장하고 시작</button>',
      '<button type="button" data-m="close">닫기</button>',
      '</div>',
      '<p class="coral-hint">GitHub → Settings → Developer settings → Personal access tokens → Fine-grained<br>권한: Repository permissions → Contents: Read and write</p>',
      '</div>',
    ].join("");
    document.body.appendChild(m);

    const input = m.querySelector("input");
    const t = getToken();
    if (t) input.value = t;

    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.dataset.m === "close") m.remove();
      if (e.target.dataset.m === "save") {
        const v = input.value.trim();
        if (!v) return;
        localStorage.setItem(TOKEN_KEY, v);
        m.remove();
        setMode("edit");
      }
    });
    input.focus();
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
      e.preventDefault();
      setMode(mode === "view" ? "edit" : "view");
    }
    if (e.key === "Escape" && mode !== "view") setMode("view");
  });

  window.addEventListener("load", () => {
    const ge = document.querySelector(".grid-editor");
    if (ge) document.documentElement.style.setProperty("--coral-fab-offset", "92px");
  });

  if (new URLSearchParams(location.search).get("edit") === "1") {
    window.addEventListener("load", () => setMode("edit"));
  }
})();
