# PLUGROUND — 공연 예매 사이트

포스터·공연 정보·블로그식 상세 내용을 보여주고 참석 신청을 받는 단일 공연용 사이트입니다.
순수 HTML/CSS/JS로 만들어졌고, 데이터·로그인·이미지 저장은 Firebase가 담당합니다.
**배포 순서는 ① GitHub 업로드 → ② Firebase 연결** 입니다. 아래 순서대로만 따라 하면 됩니다.

---

## 기능 요약

| 기능 | 누구나 | 관리자만 |
|------|:------:|:--------:|
| 공연 정보·포스터·영상·상세글 보기 | ✅ | ✅ |
| 참석 신청 (대표자 + 동반자 명단) | ✅ | ✅ |
| 신청자 명부 열람·삭제·CSV 내보내기 | ❌ | ✅ |
| 공연 정보·관람료·소개 수정 | ❌ | ✅ |
| 로고/사이트 이름 변경 | ❌ | ✅ |
| 상세 내용 블로그 편집 (소제목·본문·유튜브·이미지) | ❌ | ✅ |
| 포스터 업로드 | ❌ | ✅ |
| 관리자 추가/해제 | ❌ | ✅ |

> 권한은 화면을 숨기는 방식이 아니라 **Firestore/Storage 보안 규칙**으로 서버에서 막습니다. 규칙을 꼭 게시해야 안전합니다.

## 파일 구성

```
concert-site/
├─ index.html          # 공개 페이지 (이 주소를 공유)
├─ admin.html          # 관리자 페이지
├─ css/style.css
├─ js/
│  ├─ firebase-config.js  # ← 본인 Firebase 설정값으로 교체 (핵심)
│  ├─ main.js
│  └─ admin.js
├─ firestore.rules     # Firestore 보안 규칙 (콘솔에 붙여넣기)
├─ storage.rules       # Storage 보안 규칙 (콘솔에 붙여넣기)
├─ poster.jpg          # 웹용으로 최적화한 포스터 (관리자 화면에서 업로드용)
└─ preview.html        # 디자인 미리보기 (배포와 무관, 그냥 더블클릭해 확인용)
```

---

# ① GitHub 등록 & 배포

1. github.com 로그인 → 오른쪽 위 **+ → New repository**.
2. 이름(예: `plug-ground`)을 정하고 **Public** 으로 생성.
3. 생성된 저장소에서 **Add file → Upload files** 클릭 →
   `concert-site` 폴더 **안의 파일들**을 통째로 드래그해 올리고 **Commit changes**.
   (폴더가 아니라 그 안의 index.html, admin.html, css, js … 가 최상위에 오도록)
4. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   Branch를 `main` / 폴더 `/ (root)` 로 선택 후 **Save**.
5. 1~2분 뒤 페이지 상단에 주소가 나옵니다:
   `https://<아이디>.github.io/<저장소이름>/`

이 시점에선 화면은 뜨지만 데이터가 안 나옵니다 (아직 Firebase 미연결). 정상입니다.
**이 주소를 메모해 두세요.** ②에서 사용합니다.

---

# ② Firebase 연결

### 2-1. 프로젝트 만들기
console.firebase.google.com → **프로젝트 추가**.

### 2-2. 웹 앱 등록 & 설정값 복사
**⚙️ 프로젝트 설정 → 내 앱 → 웹(`</>`)** 추가 →
나오는 `firebaseConfig` 값을 `js/firebase-config.js`의 각 항목에 붙여넣습니다.
(이 파일은 ③에서 다시 올립니다.)

### 2-3. 서비스 켜기
- **Authentication → 시작하기 → 이메일/비밀번호** 사용 설정
- **Firestore Database → 데이터베이스 만들기** (프로덕션 모드, 위치 선택)
- **Storage → 시작하기**
  ※ 최근 만든 프로젝트는 Storage 사용 시 **Blaze(종량제) 업그레이드**를 요구할 수 있습니다. 소규모는 무료 한도 안이라 비용이 거의 없습니다. 부담되면 포스터·이미지 업로드 대신 이미지 주소(URL) 방식으로 바꿔드릴 수 있어요.

### 2-4. 보안 규칙 게시 (꼭!)
- **Firestore Database → 규칙** 탭 → `firestore.rules` 내용 붙여넣기 → **게시**
- **Storage → 규칙** 탭 → `storage.rules` 내용 붙여넣기 → **게시**

### 2-5. 로그인 도메인 등록
**Authentication → 설정(Settings) → 승인된 도메인**에
①에서 받은 `<아이디>.github.io` 를 추가합니다. (이게 없으면 GitHub Pages에서 로그인 안 됨)

### 2-6. 최초 관리자 만들기 (한 번만)
규칙상 관리자만 관리자를 추가할 수 있어, 첫 관리자는 콘솔에서 직접 등록합니다.
1. **Authentication → Users → 사용자 추가**로 이메일/비밀번호 계정 생성
2. 그 사용자의 **UID** 복사
3. **Firestore Database → 컬렉션 시작** →
   컬렉션 ID `admins`, 문서 ID = 방금 복사한 **UID**, 필드 `email`(문자열)=본인 이메일 → 저장

---

# ③ 마무리

1. 값을 채운 `js/firebase-config.js` 를 GitHub 저장소의 같은 위치에 **다시 업로드**(덮어쓰기).
2. 1분 뒤 `https://<아이디>.github.io/<저장소이름>/` 접속 → 공개 페이지가 동작합니다.
3. `.../admin.html` 로 들어가 2-6에서 만든 계정으로 로그인 → 공연 정보·로고·상세 내용·신청자 명부 관리.

공유 링크 = `index.html`(루트 주소) / 관리자 = `admin.html`.

---

## 관리자 사용법 요약
- **공연 정보 탭**: 사이트 이름·로고 이미지, 공연 제목·일시·장소·관람료·요약 소개, 포스터를 입력/업로드.
- **상세 내용 (블로그)**: `+ 소제목 / + 본문 / + 유튜브 / + 이미지` 로 블록을 추가하고 ↑↓ 로 순서 변경, × 로 삭제. 유튜브는 링크만 붙여넣으면 임베드됩니다.
- 모두 입력 후 맨 아래 **전체 저장** 을 눌러야 반영됩니다.
- **신청자 명부 탭**: 신청 건수·총 인원 확인, 개별 삭제, CSV 내보내기.
- **관리자 탭**: 다른 관리자의 UID를 추가/해제.

## 자주 막히는 곳
- **로그인이 안 돼요** → 2-4 규칙 게시 + 2-5 도메인 등록 + 2-6 최초 관리자 등록을 확인.
- **데이터가 안 보여요** → `firebase-config.js` 값이 실제 값인지, ③에서 다시 업로드했는지 확인.
- **포스터/이미지 업로드 실패** → Storage 생성·규칙 게시·(필요 시) Blaze 업그레이드 확인.
- **명부가 비어 보여요** → `admins`에 등록된 계정으로 로그인했는지 확인.

## 데이터 구조 (참고)
- `config/performance` — 사이트/공연 정보 한 건 (siteName, logoUrl, title, date, location, price, description, posterUrl, applyOpen, content[])
- `applications/{자동ID}` — 신청 (name, contact, companions[], attendees[], partySize, note, createdAt)
- `admins/{uid}` — 관리자 (email)
