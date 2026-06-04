// ============================================================
//  공개 페이지 로직
// ============================================================
import { firebaseConfig, PERFORMANCE_DOC } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, addDoc, collection, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

// 다양한 유튜브 URL을 임베드 주소로 변환 (youtu.be / watch?v= / shorts / embed)
function toYouTubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? "https://www.youtube.com/embed/" + m[1] : null;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// 로고 / 사이트 이름 반영
function setBrand(p) {
  const name = p.siteName || "STAGE";
  const el = $("brand");
  if (el) {
    el.innerHTML = p.logoUrl
      ? '<img class="brand-logo" src="' + esc(p.logoUrl) + '" alt="' + esc(name) + '" />'
      : esc(name) + '<span>.</span>';
  }
  const foot = $("brandFoot");
  if (foot) foot.textContent = name;
}

// 상세 내용(블로그 블록) → HTML
function renderContent(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return;
  const html = blocks.map((b) => {
    if (b.type === "heading" && b.text) return '<h2 class="content-h">' + esc(b.text) + "</h2>";
    if (b.type === "text" && b.text) return '<p class="content-p">' + esc(b.text) + "</p>";
    if (b.type === "image" && b.url) return '<img class="content-img" src="' + esc(b.url) + '" alt="" />';
    if (b.type === "video") {
      const e = toYouTubeEmbed(b.url);
      return e ? '<div class="video-wrap"><iframe src="' + e + '" title="공연 영상" allowfullscreen ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>' : "";
    }
    return "";
  }).join("");
  $("contentBlocks").innerHTML = html;
  $("contentSection").style.display = "block";
}

// ---------- 공연 정보 불러오기 ----------
async function loadPerformance() {
  try {
    const snap = await getDoc(doc(db, PERFORMANCE_DOC));
    if (!snap.exists()) {
      $("title").textContent = "등록된 공연이 없습니다";
      return;
    }
    const p = snap.data();
    document.title = (p.title || "공연") + " · 예매";
    setBrand(p);
    $("title").textContent = p.title || "제목 없음";
    $("date").textContent = p.date || "—";
    $("location").textContent = p.location || "—";
    $("desc").textContent = p.description || "";

    if (p.price) {
      $("price").textContent = p.price;
      $("priceRow").style.display = "flex";
    }

    // 상세 내용(블로그 블록) 렌더링
    renderContent(p.content);

    if (p.posterUrl) {
      const img = $("poster");
      img.src = p.posterUrl;
      img.style.display = "block";
      $("posterEmpty").style.display = "none";
    }

    // 신청 마감 처리
    if (p.applyOpen === false) {
      $("applyForm").style.display = "none";
      $("closedBox").style.display = "block";
    }
  } catch (e) {
    console.error(e);
    $("title").textContent = "정보를 불러오지 못했습니다";
  }
}

// ---------- 동반자 입력 행 ----------
function addCompanionRow(value = "") {
  const row = document.createElement("div");
  row.className = "companion-row";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "동반자 이름";
  input.value = value;
  const rm = document.createElement("button");
  rm.type = "button";
  rm.className = "rm";
  rm.textContent = "×";
  rm.onclick = () => row.remove();
  row.append(input, rm);
  $("companions").appendChild(row);
}
$("addCompanion").addEventListener("click", () => addCompanionRow());

// ---------- 알림 ----------
function showNotice(type, msg) {
  const ok = $("okMsg"), err = $("errMsg");
  ok.classList.remove("show");
  err.classList.remove("show");
  if (type === "ok") ok.classList.add("show");
  else { err.textContent = msg; err.classList.add("show"); }
  window.scrollTo({ top: $("apply").offsetTop - 40, behavior: "smooth" });
}

// ---------- 제출 ----------
$("applyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("name").value.trim();
  const contact = $("contact").value.trim();
  const note = $("note").value.trim();
  const companions = [...document.querySelectorAll("#companions input")]
    .map((i) => i.value.trim())
    .filter(Boolean);

  if (!name || !contact) {
    showNotice("err", "이름과 연락처를 입력해 주세요.");
    return;
  }

  const attendees = [name, ...companions]; // 명부용 전체 명단
  const btn = $("submitBtn");
  btn.disabled = true;
  btn.textContent = "제출 중…";

  try {
    await addDoc(collection(db, "applications"), {
      name,
      contact,
      companions,
      attendees,
      partySize: attendees.length,
      note,
      createdAt: serverTimestamp(),
    });
    $("applyForm").reset();
    $("companions").innerHTML = "";
    showNotice("ok");
  } catch (err) {
    console.error(err);
    showNotice("err", "신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    btn.disabled = false;
    btn.textContent = "신청 제출";
  }
});

loadPerformance();
