/* ============================================================
   site-editor.js v5
   ------------------------------------------------------------
   · 플로팅 버튼 / Ctrl+Shift+E 로 편집 시작
   · 글자 · 이미지(교체/추가/삭제) · 스타일(크기·색·간격·위치)
   · 되돌리기/다시실행 (Ctrl+Z / Ctrl+Shift+Z)
   · 반응형 미리보기 (390 / 834 / 1280) + 공유 링크 생성
   · 편집 내용과 기록을 localStorage 에 자동 저장 (저장 시 초기화)
   ============================================================ */
(() => {
  /* 공유 링크로 열린 경우 : 편집기 없이 미리보기만 */
  if (location.hash.indexOf("#p=") === 0) {
    enterSharedMode(location.hash);
    return;
  }

  const OWNER = "coral-song";
  const REPO = "coral";
  const BRANCH = "main";
  const IMG_DIR = "images";

  const PAGE = location.pathname.endsWith("detail.html") ? "detail.html" : "index.html";
  const TOKEN_KEY = "coralEditToken";
  const DRAFT_KEY = "coralDraft:" + PAGE;
  const MAX_SNAPS = 15;

  const TEXT_SEL = PAGE === "detail.html"
    ? ["h1", "h2", "p", ".d-case", ".d-tags li", ".back", ".yt-btn"]
    : [".intro-head", ".intro-name", ".sub", ".timeline span", ".timeline strong",
       ".timeline em", ".skills span", ".slider-item strong", ".slider-item span",
       ".footer > p:first-of-type"];

  let mode = "view";
  let selected = null;
  let snaps = [];
  let cursor = -1;

  const mainEl = () => document.querySelector("main") || document.body;
  const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

  /* ---------------- 직렬화 ---------------- */
  function snapshotHtml() {
    const c = mainEl().cloneNode(true);
    c.querySelectorAll("[data-coral-ui]").forEach((n) => n.remove());
    c.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    c.querySelectorAll("[spellcheck]").forEach((n) => n.removeAttribute("spellcheck"));
    c.querySelectorAll(".coral-sel").forEach((n) => n.classList.remove("coral-sel"));
    c.querySelectorAll(".coral-img").forEach((n) => n.classList.remove("coral-img"));
    c.querySelectorAll(".coral-added").forEach((n) => n.classList.remove("coral-added"));
    c.querySelectorAll('[class=""]').forEach((n) => n.removeAttribute("class"));
    return c.innerHTML;
  }

  function serialize(opts) {
    const o = opts || {};
    const head = [];
    document.childNodes.forEach((n) => {
      if (n.nodeType === 10) head.push("<!DOCTYPE html>");
      else if (n.nodeType === 8) head.push("<!--" + n.data + "-->");
    });
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("[data-coral-ui]").forEach((n) => n.remove());
    clone.querySelectorAll(".grid-editor").forEach((n) => n.remove());
    clone.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    clone.querySelectorAll("[spellcheck]").forEach((n) => n.removeAttribute("spellcheck"));
    clone.querySelectorAll(".coral-sel").forEach((n) => n.classList.remove("coral-sel"));
    clone.querySelectorAll(".coral-img").forEach((n) => n.classList.remove("coral-img"));
    clone.querySelectorAll(".coral-added").forEach((n) => n.classList.remove("coral-added"));
    clone.querySelectorAll('[class=""]').forEach((n) => n.removeAttribute("class"));

    if (o.preview) {
      clone.querySelectorAll('script[src*="site-editor"], link[href*="site-editor"]').forEach((n) => n.remove());
      clone.querySelectorAll("script:not([src])").forEach((n) => n.remove());
      const ab = clone.querySelector("#about");
      if (ab) ab.classList.add("show");
    } else {
      const ab = clone.querySelector("#about");
      if (ab) ab.classList.remove("show");
      clone.removeAttribute("style");
      clone.querySelectorAll(".detail-item").forEach((n) => {
        if (n.style && n.style.display === "block") n.removeAttribute("style");
      });
    }
    return head.join("\n") + "\n" + clone.outerHTML + "\n";
  }

  /* ---------------- 기록 ---------------- */
  function syncHistory() {
    if (!bar) return;
    const u = bar.querySelector("[data-act=undo]");
    const r = bar.querySelector("[data-act=redo]");
    if (u) u.disabled = cursor <= 0;
    if (r) r.disabled = cursor >= snaps.length - 1;
    if (draftBadge) {
      draftBadge.hidden = snaps.length <= 1;
      draftBadge.textContent = "자동 저장됨 · " + new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    }
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        snaps: snaps.slice(-MAX_SNAPS),
        cursor: Math.min(cursor, MAX_SNAPS - 1),
        ts: Date.now(),
      }));
    } catch (e) {
      /* 용량 초과 시 조용히 넘어감 */
    }
  }

  function commit() {
    const html = snapshotHtml();
    if (snaps[cursor] === html) return;
    snaps = snaps.slice(0, cursor + 1);
    snaps.push(html);
    if (snaps.length > MAX_SNAPS) snaps.shift();
    cursor = snaps.length - 1;
    saveDraft();
    syncHistory();
  }

  function restoreAt(i) {
    if (i < 0 || i >= snaps.length) return;
    cursor = i;
    mainEl().innerHTML = snaps[cursor];
    selected = null;
    if (stylePanel) stylePanel.hidden = true;
    rebind();
    saveGridOffset();
    saveDraft();
    syncHistory();
  }

  const undo = () => restoreAt(cursor - 1);
  const redo = () => restoreAt(cursor + 1);

  function rebind() {
    setTextEditable(false);
    setTextEditable(mode === "edit");
    markEditableImages(mode === "edit");
  }

  function saveGridOffset() {
    const ge = document.querySelector(".grid-editor");
    document.documentElement.style.setProperty("--coral-fab-offset", ge ? "92px" : "24px");
  }

  /* ---------------- 저장 ---------------- */
  const ghHeaders = () => ({
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + getToken(),
    "Content-Type": "application/json",
  });

  const strToB64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  };

  async function ghPut(path, contentB64, message, sha) {
    const body = { message: message, content: contentB64, branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path, {
      method: "PUT",
      headers: ghHeaders(),
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j.message || "HTTP " + r.status);
    }
    return r.json();
  }

  async function ghSha(path) {
    const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + BRANCH, { headers: ghHeaders() });
    if (r.status === 401) throw new Error("토큰이 올바르지 않습니다");
    if (r.status === 404) return null;
    const j = await r.json();
    return j && j.sha ? j.sha : null;
  }

  async function uploadBlob(blob, ext) {
    const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const type = (blob.type || "image/jpeg").split("/")[1].replace("jpeg", "jpg").split("+")[0];
    const path = IMG_DIR + "/" + stamp + "-" + Math.random().toString(36).slice(2, 7) + "." + (ext || type);
    const buff = await blob.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buff);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    await ghPut(path, btoa(bin), "upload: " + path);
    return path;
  }

  async function save() {
    if (!getToken()) return openTokenModal();
    setStatus("저장 중…");
    try {
      const imgs = Array.from(document.querySelectorAll("main img[data-coral-pending]"));
      let i = 0;
      for (const img of imgs) {
        i++;
        setStatus("이미지 업로드 중… (" + i + "/" + imgs.length + ")");
        const blob = await (await fetch(img.src)).blob();
        const path = await uploadBlob(blob);
        img.src = "./" + encodeURI(path);
        delete img.dataset.coralPending;
        img.removeAttribute("srcset");
      }

      setStatus("HTML 저장 중…");
      const sha = await ghSha(PAGE);
      const content = strToB64(serialize());
      try {
        await ghPut(PAGE, content, "edit: " + PAGE + " 웹 편집", sha);
      } catch (err) {
        if (String(err.message || "").match(/409|sha/i)) {
          await ghPut(PAGE, content, "edit: " + PAGE + " 웹 편집", await ghSha(PAGE));
        } else throw err;
      }

      localStorage.removeItem(DRAFT_KEY);
      setStatus("저장 완료 · 1분 안에 반영됩니다");
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      setStatus("실패 : " + e.message, true);
    }
  }

  /* ---------------- 텍스트 ---------------- */
  let bar = null;
  let draftBadge = null;

  function onTextFocus(ev) { ev.currentTarget.__before = ev.currentTarget.innerHTML; }
  function onTextBlur(ev) {
    const el = ev.currentTarget;
    if (el.__before !== undefined && el.__before !== el.innerHTML) commit();
    el.__before = el.innerHTML;
  }

  function setTextEditable(on) {
    TEXT_SEL.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (on) {
          el.setAttribute("contenteditable", "true");
          el.setAttribute("spellcheck", "false");
          if (!el.__bound) {
            el.addEventListener("focus", onTextFocus);
            el.addEventListener("blur", onTextBlur);
            el.__bound = true;
          }
        } else {
          el.removeAttribute("contenteditable");
          el.removeAttribute("spellcheck");
        }
      });
    });
  }

  function markEditableImages(on) {
    document.querySelectorAll("main img").forEach((img) => img.classList.toggle("coral-img", on));
  }

  /* ---------------- 모드 ---------------- */
  function setMode(next) {
    if (next !== "view" && !getToken()) return openTokenModal();
    mode = next;
    setTextEditable(next === "edit");
    markEditableImages(next === "edit");
    hideImgMenu();
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
    if (next === "edit") setStatus("글자 수정 · 이미지 클릭 시 교체/삭제");
    else if (next === "style") setStatus("스타일 · 요소를 클릭하세요");
    else setStatus("");
    syncHistory();
  }

  /* ---------------- 이미지 ---------------- */
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.setAttribute("data-coral-ui", "file");
  document.body.appendChild(fileInput);

  let imgTarget = null;
  let imgAction = "replace";

  const readDataURL = (file) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

  fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const dataUrl = await readDataURL(f);
    if (imgAction === "replace" && imgTarget) {
      imgTarget.src = dataUrl;
      imgTarget.dataset.coralPending = "1";
      setStatus("이미지 교체됨 · 저장을 눌러야 반영됩니다");
    } else {
      insertImage(dataUrl, imgTarget);
    }
    commit();
    fileInput.value = "";
  });

  function insertImage(dataUrl, afterEl) {
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "";
    img.dataset.coralPending = "1";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.marginTop = "18px";

    if (afterEl && afterEl.tagName === "IMG" && afterEl.parentNode) {
      afterEl.parentNode.insertBefore(img, afterEl.nextSibling);
    } else {
      (afterEl && afterEl.tagName === "MAIN" ? afterEl : mainEl()).appendChild(img);
    }
    img.classList.add("coral-img");
    setStatus("이미지 추가됨 · 저장을 눌러야 반영됩니다");
  }

  const imgMenu = document.createElement("div");
  imgMenu.className = "coral-imgmenu";
  imgMenu.setAttribute("data-coral-ui", "imgmenu");
  imgMenu.hidden = true;
  imgMenu.innerHTML = '<button type="button" data-i="replace">교체</button>' +
    '<button type="button" data-i="insert">아래에 추가</button>' +
    '<button type="button" data-i="delete">삭제</button>';
  document.body.appendChild(imgMenu);

  let menuTarget = null;
  const hideImgMenu = () => { imgMenu.hidden = true; menuTarget = null; };

  imgMenu.addEventListener("click", (e) => {
    const act = e.target.dataset.i;
    if (!act || !menuTarget) return;
    const img = menuTarget;
    hideImgMenu();
    if (act === "replace") { imgTarget = img; imgAction = "replace"; fileInput.click(); }
    else if (act === "insert") { imgTarget = img; imgAction = "insert"; fileInput.click(); }
    else if (act === "delete") {
      img.remove();
      commit();
      setStatus("이미지 삭제됨 · 저장을 눌러야 반영됩니다");
    }
  });

  document.addEventListener("click", (e) => {
    if (mode === "view") return;
    if (e.target.closest("[data-coral-ui]")) return;

    const img = e.target.closest("img");
    if (img && mode === "edit") {
      e.preventDefault();
      e.stopPropagation();
      menuTarget = img;
      imgMenu.hidden = false;
      imgMenu.style.left = Math.min(e.clientX + 8, window.innerWidth - 240) + "px";
      imgMenu.style.top = Math.min(e.clientY + 8, window.innerHeight - 52) + "px";
      return;
    }
    if (!imgMenu.hidden) hideImgMenu();

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

  /* ---------------- 스타일 ---------------- */
  const PROP_MAP = {
    fontSize: "font-size", color: "color", backgroundColor: "background-color",
    fontFamily: "font-family", lineHeight: "line-height", letterSpacing: "letter-spacing",
    textAlign: "text-align", width: "width", marginTop: "margin-top",
    marginBottom: "margin-bottom", padding: "padding", left: "left", top: "top",
  };

  const stylePanel = document.createElement("div");
  stylePanel.className = "coral-style";
  stylePanel.setAttribute("data-coral-ui", "style");
  stylePanel.hidden = true;
  stylePanel.innerHTML = [
    '<p class="coral-style__title" data-sel>선택한 요소</p>',
    '<div class="coral-style__scroll">',
    '<p class="coral-style__group">글자</p>',
    '<label>크기 <span><input type="number" data-p="fontSize" step="1" min="8" max="200">px</span></label>',
    '<label>색 <input type="color" data-p="color"></label>',
    '<label>폰트 <select data-p="fontFamily"><option value="">그대로</option><option value="Eulyoo, serif">을유 (본문)</option><option value="system-ui, sans-serif">시스템 고딕</option></select></label>',
    '<label>줄 간격 <input type="number" data-p="lineHeight" step="0.05" min="0.8" max="3"></label>',
    '<label>자간 <span><input type="number" data-p="letterSpacing" step="0.5" min="-5" max="20">px</span></label>',
    '<label>정렬 <select data-p="textAlign"><option value="">그대로</option><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option></select></label>',
    '<p class="coral-style__group">상자</p>',
    '<label>배경 <span class="coral-inline"><input type="color" data-p="backgroundColor"><button type="button" data-act="nobg">없음</button></span></label>',
    '<label>너비 <span class="coral-inline"><input type="number" data-p="width" step="10"><select data-unit="width"><option value="px">px</option><option value="%">%</option></select></span></label>',
    '<label>위 여백 <span><input type="number" data-p="marginTop" step="2">px</span></label>',
    '<label>아래 여백 <span><input type="number" data-p="marginBottom" step="2">px</span></label>',
    '<label>안쪽 여백 <span><input type="number" data-p="padding" step="2">px</span></label>',
    '<p class="coral-style__group">위치</p>',
    '<label>좌우 이동 <span><input type="number" data-p="offsetX" step="4">px</span></label>',
    '<label>위아래 이동 <span><input type="number" data-p="offsetY" step="4">px</span></label>',
    '</div>',
    '<div class="coral-style__row"><button type="button" data-act="reset">초기화</button><button type="button" data-act="close">닫기</button></div>',
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
      ? "." + el.className.trim().split(/\s+/).join(".") : "";
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
    set("padding", Math.round(parseFloat(cs.paddingTop) || 0));
    set("width", Math.round(el.getBoundingClientRect().width) || 0);
    set("offsetX", parseInt(el.style.left, 10) || 0);
    set("offsetY", parseInt(el.style.top, 10) || 0);
    set("color", rgbToHex(cs.color));
    set("backgroundColor", rgbToHex(cs.backgroundColor));
  }

  stylePanel.addEventListener("input", (e) => {
    if (!selected) return;
    const p = e.target.dataset.p;
    if (!p) return;
    const v = e.target.value;
    switch (p) {
      case "fontFamily": v ? selected.style.fontFamily = v : selected.style.removeProperty("font-family"); break;
      case "textAlign": v ? selected.style.textAlign = v : selected.style.removeProperty("text-align"); break;
      case "width": {
        const unit = (stylePanel.querySelector("[data-unit=width]") || {}).value || "px";
        v === "" ? selected.style.removeProperty("width") : selected.style.width = v + unit;
        break;
      }
      case "padding": v === "" ? selected.style.removeProperty("padding") : selected.style.padding = v + "px"; break;
      case "offsetX": selected.style.position = "relative"; selected.style.left = (v || 0) + "px"; break;
      case "offsetY": selected.style.position = "relative"; selected.style.top = (v || 0) + "px"; break;
      case "fontSize": case "letterSpacing": case "marginTop": case "marginBottom":
        v === "" ? selected.style.removeProperty(PROP_MAP[p]) : selected.style[p] = v + "px";
        break;
      default: selected.style[p] = v;
    }
  });

  stylePanel.addEventListener("change", () => commit());

  stylePanel.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (act === "close") stylePanel.hidden = true;
    if (act === "nobg" && selected) {
      selected.style.removeProperty("background-color");
      commit();
    }
    if (act === "reset" && selected) {
      selected.removeAttribute("style");
      commit();
      openStylePanel(selected);
    }
  });

  /* ---------------- 압축 / 공유 ---------------- */
  const b64url = (bytes) => {
    let bin = "";
    const arr = new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const unb64url = (s) => {
    const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const arr = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
    return arr;
  };

  async function deflate(str) {
    const data = new TextEncoder().encode(str);
    if (!("CompressionStream" in window)) return { raw: true, bytes: data };
    const cs = new CompressionStream("deflate-raw");
    const stream = new Blob([data]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return { raw: false, bytes: new Uint8Array(buf) };
  }

  async function inflate(bytes, raw) {
    if (raw) return new TextDecoder().decode(bytes);
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
  }

  async function buildShareUrl() {
    const html = serialize({ preview: true });
    const packed = await deflate(html);
    const hash = (packed.raw ? "r." : "z.") + b64url(packed.bytes);
    return location.origin + location.pathname + "#p=" + hash;
  }

  /* ---------------- 미리보기 ---------------- */
  const preview = document.createElement("div");
  preview.className = "coral-preview";
  preview.setAttribute("data-coral-ui", "preview");
  preview.hidden = true;
  preview.innerHTML = [
    '<div class="coral-preview__bar">',
    '<button type="button" data-size="390">모바일</button>',
    '<button type="button" data-size="834">태블릿</button>',
    '<button type="button" data-size="1280">데스크톱</button>',
    '<span class="coral-preview__w" data-w>390px</span>',
    '<button type="button" data-share="1">공유 링크</button>',
    '<button type="button" data-p="close">닫기</button>',
    '</div>',
    '<div class="coral-preview__stage"><iframe title="미리보기"></iframe></div>',
    '<div class="coral-preview__share" data-sharebox hidden><input type="text" readonly><span>링크가 복사되었습니다</span></div>',
  ].join("");
  document.body.appendChild(preview);

  const frame = preview.querySelector("iframe");
  let previewW = 390;

  function setPreviewSize(w) {
    previewW = w;
    frame.style.width = Math.min(w, Math.max(320, window.innerWidth - 80)) + "px";
    preview.querySelector("[data-w]").textContent = w + "px";
  }

  function renderPreview() {
    const html = serialize({ preview: true });
    const base = '<base href="' + location.origin + location.pathname + '">';
    frame.srcdoc = html.replace(/<head([^>]*)>/i, "<head$1>" + base);
    setPreviewSize(previewW);
    preview.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.size) === previewW));
  }

  function openPreview(w) {
    preview.hidden = false;
    previewW = w || 390;
    renderPreview();
  }

  preview.addEventListener("click", async (e) => {
    if (e.target.dataset.p === "close") { preview.hidden = true; return; }
    const s = e.target.dataset.size;
    if (s) { setPreviewSize(Number(s)); return; }

    if (e.target.dataset.share) {
      const url = await buildShareUrl();
      const box = preview.querySelector("[data-sharebox]");
      box.hidden = false;
      box.querySelector("input").value = url;
      try {
        await navigator.clipboard.writeText(url);
        box.querySelector("span").textContent = "링크가 복사되었습니다 (" + url.length.toLocaleString() + "자)";
      } catch (err) {
        box.querySelector("span").textContent = "아래 링크를 복사하세요 (" + url.length.toLocaleString() + "자)";
      }
      box.querySelector("input").select();
    }
  });

  /* ---------------- 공유된 미리보기 모드 ---------------- */
  async function enterSharedMode(hash) {
    try {
      const packed = hash.slice(3);
      const raw = packed.charAt(0) === "r";
      const b = atob(packed.slice(2).replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);

      let html;
      if (raw) {
        html = new TextDecoder().decode(bytes);
      } else {
        const ds = new DecompressionStream("deflate-raw");
        html = new TextDecoder().decode(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
      }

      document.body.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "coral-shared";
      wrap.innerHTML = '<div class="coral-shared__bar"><strong>공유된 미리보기</strong>' +
        '<span>읽기 전용 · 편집 권한 없음</span></div>' +
        '<div class="coral-shared__stage"><iframe title="공유 미리보기"></iframe></div>';
      document.body.appendChild(wrap);
      wrap.querySelector("iframe").srcdoc = html;
      document.body.setAttribute("data-coral-shared", "1");
    } catch (e) {
      location.replace(location.pathname + location.search);
    }
  }

  /* ---------------- 플로팅 버튼 + 툴바 ---------------- */
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "coral-fab";
  fab.setAttribute("data-coral-ui", "fab");
  fab.setAttribute("aria-label", "편집 모드 시작");
  fab.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L18 10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span>편집</span>';
  document.body.appendChild(fab);

  bar = document.createElement("div");
  bar.className = "coral-bar";
  bar.setAttribute("data-coral-ui", "bar");
  bar.hidden = true;
  bar.innerHTML = [
    '<span class="coral-status" data-status></span>',
    '<span class="coral-draft" data-draft hidden></span>',
    '<button type="button" data-act="edit">글자</button>',
    '<button type="button" data-act="style">스타일</button>',
    '<button type="button" data-act="addimg">＋이미지</button>',
    '<button type="button" data-act="undo" title="되돌리기 (Ctrl+Z)">↶</button>',
    '<button type="button" data-act="redo" title="다시 실행 (Ctrl+Shift+Z)">↷</button>',
    '<button type="button" data-act="preview">미리보기</button>',
    '<button type="button" data-act="save">저장</button>',
    '<button type="button" data-act="cancel">취소</button>',
    '<button type="button" data-act="token" title="GitHub 토큰">⚙</button>',
  ].join("");
  document.body.appendChild(bar);
  draftBadge = bar.querySelector("[data-draft]");

  function setStatus(msg, isError) {
    const el = bar.querySelector("[data-status]");
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  }

  fab.addEventListener("click", () => setMode("edit"));

  bar.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    if (act === "edit") setMode("edit");
    else if (act === "style") setMode("style");
    else if (act === "save") save();
    else if (act === "cancel") {
      localStorage.removeItem(DRAFT_KEY);
      location.reload();
    }
    else if (act === "token") openTokenModal();
    else if (act === "undo") undo();
    else if (act === "redo") redo();
    else if (act === "preview") openPreview(previewW);
    else if (act === "addimg") {
      imgTarget = mainEl();
      imgAction = "insert";
      setMode("edit");
      fileInput.click();
    }
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
      '<div class="coral-modal__row"><button type="button" data-m="save">저장하고 시작</button><button type="button" data-m="close">닫기</button></div>',
      '<p class="coral-hint">GitHub → Settings → Developer settings → Personal access tokens → Fine-grained<br>권한: Repository permissions → Contents: Read and write</p>',
      '</div>',
    ].join("");
    document.body.appendChild(m);
    const input = m.querySelector("input");
    if (getToken()) input.value = getToken();
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

  /* ---------------- 자동 저장 복원 ---------------- */
  function offerDraftRestore() {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { draft = null; }
    if (!draft || !draft.snaps || !draft.snaps.length) return;

    const latest = draft.snaps[draft.cursor >= 0 ? draft.cursor : draft.snaps.length - 1];
    if (!latest || latest === snapshotHtml()) return;

    const box = document.createElement("div");
    box.className = "coral-draftbar";
    box.setAttribute("data-coral-ui", "draftbar");
    box.innerHTML = '<span>작성 중이던 편집 내용이 있습니다.</span>' +
      '<button type="button" data-d="restore">복원</button>' +
      '<button type="button" data-d="discard">버리기</button>';
    document.body.appendChild(box);

    box.addEventListener("click", (e) => {
      const d = e.target.dataset.d;
      if (!d) return;
      if (d === "restore") {
        snaps = draft.snaps;
        cursor = draft.cursor >= 0 ? draft.cursor : draft.snaps.length - 1;
        mainEl().innerHTML = snaps[cursor];
        rebind();
        syncHistory();
        setMode("edit");
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
      box.remove();
    });
  }

  /* ---------------- 키보드 ---------------- */
  document.addEventListener("keydown", (e) => {
    const inEditable = document.activeElement && document.activeElement.isContentEditable;

    if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
      e.preventDefault();
      setMode(mode === "view" ? "edit" : "view");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !inEditable && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !inEditable && (e.key === "y" || e.key === "Y")) {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === "Escape") {
      if (!preview.hidden) { preview.hidden = true; return; }
      if (!imgMenu.hidden) { hideImgMenu(); return; }
      if (mode !== "view") setMode("view");
    }
  });

  /* ---------------- 시작 ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    snaps = [snapshotHtml()];
    cursor = 0;
    saveGridOffset();
    syncHistory();
    offerDraftRestore();
  });
  window.addEventListener("load", saveGridOffset);

  if (new URLSearchParams(location.search).get("edit") === "1") {
    window.addEventListener("load", () => setMode("edit"));
  }
})();
