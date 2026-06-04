// ============================================================
//  Firebase 설정
//  Firebase 콘솔 → 프로젝트 설정 → "내 앱"에서 복사한 값으로
//  아래 항목을 전부 교체하세요. (README의 1~4단계 참고)
// ============================================================

export const firebaseConfig = {
  apiKey: "여기에_API_KEY",
  authDomain: "여기에_PROJECT_ID.firebaseapp.com",
  projectId: "여기에_PROJECT_ID",
  storageBucket: "여기에_PROJECT_ID.appspot.com",
  messagingSenderId: "여기에_SENDER_ID",
  appId: "여기에_APP_ID",
};

// 단일 공연이므로 정보를 한 문서에 저장합니다. (바꿀 필요 없음)
export const PERFORMANCE_DOC = "config/performance";
