// ============================================================
//  관리자 페이지 로직
// ============================================================
import { firebaseConfig, PERFORMANCE_DOC } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);

let blocks = [];
let blockSeq = 0;

// ---------- 인증 상태 ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) return showLogin();
  // 관리자 권한 확인: admins/{uid} 문서 존재 여부
  try {
    const adminSnap = await getDoc(doc(db, "admins", user.uid));
    if (!adminSnap.exists()) {
      await signOut(auth);
      showLogin("이 계정은 관리자 권한이 없습니다. 관리자에게 UID 등록을 요청하세요.\nUID: " + user.uid);
      return;
    }
  } catch (e) {
    await signOut(auth);
    showLogin("권한 확인 중 오류가 발생했습니다.");
    return;
  }
  showDashboard(user);
});

function showLogin(err) {
  $("loginView").style.display = "block";
  $("dashView").style.display = "none";
  if (err) notice("loginErr", "err", err);
}

function showDashboard(user) {
  $("loginView").style.display = "none";
  $("dashView").style.display = "block";
  $("whoami").textContent = user.email + " (UID: " + user.uid + ")";
  loadInfo();
  loadApps();
  loadAdmins();
}

function notice(id, type, msg) {
  const el = $(id);
  el.className = "notice " + type + " show";
  if (msg) el.textContent = msg;
  setTimeout(() => el.classList.remove("show"), 5000);
}

// ---------- 로그인 / 로그아웃 ----------
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("pw").value);
  } catch (err) {
    notice("loginErr", "err", "로그인 실패: 이메일 또는 비밀번호를 확인하세요.");
  }
});
$("logoutBtn").addEventListener("click", () => signOut(auth));

// ---------- 탭 전환 ----------
document.querySelectorAll(".admin-tabs button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs button").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    b.classList.add("active");
    $("panel-" + b.dataset.tab).classList.add("active");
  });
});

// ---------- 블로그 블록 편집기 ----------
function normalizeBlock(b) {
  return {
    _id: ++blockSeq,
    type: b.type || "text",
    text: b.text || "",
    url: b.url || "",
    path: b.path || "",
  };
}

const BLOCK_LABEL = { heading: "소제목", text: "본문", video: "유튜브", image: "이미지" };

function renderBlocks() {
  const wrap = $("blocks");
  if (!blocks.length) {
    wrap.innerHTML = '<p class="hint" style="padding:8px 0">아직 블록이 없습니다. 아래 버튼으로 추가하세요.</p>';
    return;
  }
  wrap.innerHTML = "";
  blocks.forEach((b, i) => {
    const card = document.createElement("div");
    card.className = "block-card";

    let body = "";
    if (b.type === "heading") {
      body = `<input type="text" data-f="text" placeholder="소제목" value="${attr(b.text)}" />`;
    } else if (b.type === "text") {
      body = `
        <div class="richtext-toolbar">
          <button type="button" data-cmd="bold" title="굵게"><b>B</b></button>
          <button type="button" data-cmd="italic" title="기울임"><i>I</i></button>
          <button type="button" data-cmd="underline" title="밑줄"><u>U</u></button>
          <button type="button" data-cmd="strikeThrough" title="취소선"><s>S</s></button>
          <span class="sep"></span>
          <label>크기
            <select data-size title="글자 크기">
              <option value="1">소</option>
              <option value="3" selected>중</option>
              <option value="5">대</option>
              <option value="7">특대</option>
            </select>
          </label>
          <label title="글자 색상">색상 <input type="color" data-color value="#1a1a1a" /></label>
          <span class="sep"></span>
          <button type="button" data-link title="하이퍼링크 삽입">🔗 링크</button>
          <button type="button" data-unlink title="링크 제거">⛓ 해제</button>
          <span class="sep"></span>
          <button type="button" data-cmd="removeFormat" title="서식 모두 지우기">✕ 서식 초기화</button>
        </div>
        <div class="richtext-body" contenteditable="true">${b.text || ""}</div>`;
    } else if (b.type === "video") {
      body = `<input type="text" data-f="url" placeholder="https://youtu.be/..." value="${attr(b.url)}" />`;
    } else if (b.type === "image") {
      body = `${b.url ? `<img class="block-img" src="${attr(b.url)}" alt="" />` : ""}
        <input type="text" data-f="url" placeholder="이미지 주소(URL)" value="${attr(b.url)}" />`;
    }

    card.innerHTML = `
      <div class="block-top">
        <span class="block-tag">${BLOCK_LABEL[b.type] || b.type}</span>
        <div class="block-ctrl">
          <button type="button" data-mv="up" title="위로">↑</button>
          <button type="button" data-mv="down" title="아래로">↓</button>
          <button type="button" data-rm="1" title="삭제">×</button>
        </div>
      </div>
      <div class="block-body">${body}</div>`;

    // 입력 반영 (heading / image / video)
    card.querySelectorAll("[data-f]").forEach((el) => {
      const f = el.dataset.f;
      el.addEventListener("input", () => { b[f] = el.value; });
      if (b.type === "image" && f === "url") {
        el.addEventListener("change", () => renderBlocks());
      }
    });

    // 리치 텍스트 에디터 (text 블록 전용)
    if (b.type === "text") {
      const editor = card.querySelector(".richtext-body");

      // 내용 동기화
      editor.addEventListener("input", () => { b.text = editor.innerHTML; });

      // 서식 버튼 (bold / italic / underline / strikeThrough / removeFormat)
      card.querySelectorAll("[data-cmd]").forEach((btn) => {
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          document.execCommand(btn.dataset.cmd, false, null);
          editor.focus();
        });
      });

      // 글자 크기
      const sizeSelect = card.querySelector("[data-size]");
      sizeSelect?.addEventListener("change", () => {
        document.execCommand("fontSize", false, sizeSelect.value);
        editor.focus();
      });

      // 글자 색상
      const colorInput = card.querySelector("[data-color]");
      colorInput?.addEventListener("input", () => {
        document.execCommand("foreColor", false, colorInput.value);
        editor.focus();
      });

      // 하이퍼링크 삽입
      card.querySelector("[data-link]")?.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const url = prompt("링크 주소를 입력하세요:", "https://");
        if (url && url !== "https://") {
          document.execCommand("createLink", false, url);
          editor.querySelectorAll("a").forEach((a) => {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          });
          b.text = editor.innerHTML;
        }
        editor.focus();
      });

      // 링크 제거
      card.querySelector("[data-unlink]")?.addEventListener("mousedown", (e) => {
        e.preventDefault();
        document.execCommand("unlink", false, null);
        b.text = editor.innerHTML;
        editor.focus();
      });
    }

    // 컨트롤
    card.querySelector("[data-rm]").addEventListener("click", () => {
      blocks.splice(i, 1); renderBlocks();
    });
    card.querySelector('[data-mv="up"]').addEventListener("click", () => {
      if (i > 0) { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; renderBlocks(); }
    });
    card.querySelector('[data-mv="down"]').addEventListener("click", () => {
      if (i < blocks.length - 1) { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; renderBlocks(); }
    });

    wrap.appendChild(card);
  });
}

function attr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }

document.querySelectorAll("[data-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    blocks.push(normalizeBlock({ type: btn.dataset.add }));
    renderBlocks();
  });
});

// ---------- 로고 / 사이트 이름 ----------
function applyBrand(p) {
  const el = $("brand");
  if (!el) return;
  const name = p.siteName || "STAGE";
  if (p.logoUrl) {
    el.innerHTML = '<img class="brand-logo" src="' + attr(p.logoUrl) + '" alt="' + attr(name) + '" />';
  } else {
    el.innerHTML = esc(name) + '<span>.</span>';
  }
}

$("fLogoUrl").addEventListener("input", () => {
  const v = $("fLogoUrl").value.trim();
  if (v) {
    $("logoPreview").src = v;
    $("logoPreview").style.display = "block";
  } else {
    $("logoPreview").style.display = "none";
  }
});

// ---------- 공연 정보 ----------
async function loadInfo() {
  try {
    const snap = await getDoc(doc(db, PERFORMANCE_DOC));
    if (snap.exists()) {
      const p = snap.data();
      $("fTitle").value = p.title || "";
      $("fSiteName").value = p.siteName || "";
      $("fLogoUrl").value = p.logoUrl || "";
      applyBrand(p);
      if (p.logoUrl) {
        $("logoPreview").src = p.logoUrl;
        $("logoPreview").style.display = "block";
      }
      $("fDate").value = p.date || "";
      $("fLocation").value = p.location || "";
      $("fPrice").value = p.price || "";
      $("fDesc").value = p.description || "";
      $("fOpen").checked = p.applyOpen !== false;
      blocks = Array.isArray(p.content) ? p.content.map(normalizeBlock) : [];
      renderBlocks();
      $("fPosterUrl").value = p.posterUrl || "";
      if (p.posterUrl) {
        $("adminPoster").src = p.posterUrl;
        $("adminPoster").style.display = "block";
      }
    } else {
      $("fOpen").checked = true;
      blocks = [];
      renderBlocks();
    }
  } catch (e) { console.error(e); }
}

$("fPosterUrl").addEventListener("input", () => {
  const v = $("fPosterUrl").value.trim();
  if (v) {
    $("adminPoster").src = v;
    $("adminPoster").style.display = "block";
  } else {
    $("adminPoster").style.display = "none";
  }
});

$("saveInfo").addEventListener("click", async () => {
  const btn = $("saveInfo");
  btn.disabled = true; btn.textContent = "저장 중…";
  try {
    // 저장용 블록 배열 정리 (빈 블록 제외)
    const content = blocks
      .map((b) => {
        if (b.type === "image") return { type: "image", url: (b.url || "").trim() };
        if (b.type === "video") return { type: "video", url: (b.url || "").trim() };
        return { type: b.type, text: b.text || "" };
      })
      .filter((b) => {
        if (b.type === "image" || b.type === "video") return b.url;
        // text 블록은 HTML 태그를 제거한 실제 텍스트가 있어야 저장
        const plain = String(b.text || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
        return plain.length > 0;
      });

    const data = {
      title: $("fTitle").value.trim(),
      siteName: $("fSiteName").value.trim(),
      logoUrl: $("fLogoUrl").value.trim(),
      posterUrl: $("fPosterUrl").value.trim(),
      date: $("fDate").value.trim(),
      location: $("fLocation").value.trim(),
      price: $("fPrice").value.trim(),
      description: $("fDesc").value.trim(),
      applyOpen: $("fOpen").checked,
      content,
    };

    await setDoc(doc(db, PERFORMANCE_DOC), data, { merge: true });
    applyBrand(data);
    blocks = content.map(normalizeBlock);
    renderBlocks();
    notice("infoOk", "ok", "저장되었습니다.");
  } catch (e) {
    console.error(e);
    notice("infoErr", "err", "저장 실패: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "전체 저장";
  }
});

// ---------- 신청자 명부 ----------
let appsCache = [];
async function loadApps() {
  const body = $("appsBody");
  try {
    const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    appsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderApps();
  } catch (e) {
    console.error(e);
    body.innerHTML = '<tr><td colspan="8" class="empty-state">불러오기 실패: ' + e.message + "</td></tr>";
  }
}

function fmtDate(ts) {
  if (!ts || !ts.toDate) return "—";
  const d = ts.toDate();
  return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

function renderApps() {
  const body = $("appsBody");
  if (!appsCache.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty-state">아직 신청자가 없습니다.</td></tr>';
    $("statApps").textContent = "0";
    $("statPeople").textContent = "0";
    return;
  }
  let totalPeople = 0;
  body.innerHTML = appsCache.map((a, i) => {
    totalPeople += a.partySize || (a.attendees ? a.attendees.length : 1);
    const names = (a.attendees || [a.name]).join(", ");
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(a.name)}</td>
      <td>${esc(a.contact)}</td>
      <td>${esc(names)}</td>
      <td>${a.partySize || (a.attendees ? a.attendees.length : 1)}</td>
      <td>${esc(a.note || "")}</td>
      <td>${fmtDate(a.createdAt)}</td>
      <td><button class="btn danger" data-del="${a.id}">삭제</button></td>
    </tr>`;
  }).join("");
  $("statApps").textContent = appsCache.length;
  $("statPeople").textContent = totalPeople;

  body.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 신청을 삭제할까요?")) return;
      try {
        await deleteDoc(doc(db, "applications", btn.dataset.del));
        loadApps();
      } catch (e) { alert("삭제 실패: " + e.message); }
    });
  });
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

$("refreshApps").addEventListener("click", loadApps);

$("exportCsv").addEventListener("click", () => {
  if (!appsCache.length) return alert("내보낼 데이터가 없습니다.");
  const rows = [["번호", "대표신청자", "연락처", "전체명단", "인원", "메모", "신청일시"]];
  appsCache.forEach((a, i) => {
    rows.push([
      i + 1, a.name, a.contact,
      (a.attendees || [a.name]).join(" / "),
      a.partySize || (a.attendees ? a.attendees.length : 1),
      a.note || "", fmtDate(a.createdAt),
    ]);
  });
  const csv = "\uFEFF" + rows.map((r) =>
    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "신청자명부_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ---------- 관리자 관리 ----------
async function loadAdmins() {
  const body = $("adminsBody");
  try {
    const snap = await getDocs(collection(db, "admins"));
    if (snap.empty) {
      body.innerHTML = '<tr><td colspan="3" class="empty-state">등록된 관리자가 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = snap.docs.map((d) => {
      const a = d.data();
      return `<tr>
        <td style="font-family:monospace;font-size:0.82rem">${esc(d.id)}</td>
        <td>${esc(a.email || "—")}</td>
        <td><button class="btn danger" data-rmadmin="${d.id}">권한 해제</button></td>
      </tr>`;
    }).join("");
    body.querySelectorAll("[data-rmadmin]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.dataset.rmadmin === auth.currentUser.uid) {
          return alert("본인 권한은 해제할 수 없습니다.");
        }
        if (!confirm("이 관리자의 권한을 해제할까요?")) return;
        try {
          await deleteDoc(doc(db, "admins", btn.dataset.rmadmin));
          loadAdmins();
        } catch (e) { alert("실패: " + e.message); }
      });
    });
  } catch (e) {
    body.innerHTML = '<tr><td colspan="3" class="empty-state">불러오기 실패: ' + e.message + "</td></tr>";
  }
}

$("addAdminBtn").addEventListener("click", async () => {
  const uid = $("newAdminUid").value.trim();
  const email = $("newAdminEmail").value.trim();
  if (!uid) return notice("admErr", "err", "UID를 입력하세요.");
  try {
    await setDoc(doc(db, "admins", uid), { email });
    $("newAdminUid").value = ""; $("newAdminEmail").value = "";
    notice("admOk", "ok", "관리자가 추가되었습니다.");
    loadAdmins();
  } catch (e) {
    notice("admErr", "err", "추가 실패: " + e.message);
  }
});
