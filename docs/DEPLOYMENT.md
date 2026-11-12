# 제출판 배포와 검증

## 제출 정보

- 대회: 2026 P.U.B.G.
- 팀: DokiDokiRuntime
- 팀원: 엄태은(팀장)
- 공개 저장소: https://github.com/EomTeaEun/craft-on-dokidoki-runtime
- 배포 및 릴리스: 최종 검증 후 이 문서에 기록

## 원본과 제출판

원본 게임을 복사한 별도 제출판입니다. 원본의 시나리오·대사·그림을 보존했습니다. 제출판에는 배포를 위한 서버 연결과 문서를 추가했습니다. 제출 후 수정·재배포는 이 저장소의 소스를 기준으로 진행합니다.

## 배포 구조

- HTML/CSS/JavaScript, 그림, OP 음원: Vercel 정적 파일 배포
- `/api/*`: Node.js Vercel Function
- 운영 대화 기록·동의 상태·관리자 세션: 전용 Neon Postgres 무료 플랜
- 로컬 다운로드판: SQLite. `DATABASE_URL`이 없으면 `private-data`에 저장
- 플레이어 게임 세이브: 같은 브라우저·주소의 로컬 저장소

SQLite 파일은 Vercel 서버 사이에서 공유되지 않으므로 운영판은 원격 DB를 사용합니다. 기존 로컬 대화 기록을 복사하지 않았습니다. 운영 기록은 유저별 익명 ID와 플레이 회차 ID로 나누며, 닉네임이 같아도 다른 브라우저의 기록과 섞이지 않습니다. 동의한 뒤 전송한 대화만 기록하며 초안은 전송하지 않습니다.

같은 메시지 ID의 동시 요청은 DB의 고유 제약과 조건부 갱신으로 한 번만 처리합니다. 완료된 메시지 재시도는 저장된 응답을 반환하며, 처리 중인 요청에 대한 중복 호출을 차단합니다. 기록은 30일 뒤 조회에서 제외하고 서버 이용 시 정리합니다. 관리자 세션과 동의 쿠키는 HttpOnly이며, 운영 HTTPS에서 Secure 속성을 사용합니다.

## 서버 전용 환경변수

| 이름 | 용도 |
| --- | --- |
| `OPENAI_API_KEY` | 운영 AI 대화 키. 서버 Secret으로만 저장 |
| `OPENAI_MODEL` | AI 모델 이름 |
| `DATABASE_URL` | Neon 연결. 서버에서만 사용 |
| `ADMIN_PASSWORD` | 운영 관리자 로그인. 서버 Secret으로만 저장 |
| `PUBLIC_ORIGIN` | 허용한 운영 주소 |

실제 값은 저장소·릴리스 ZIP에 포함하지 않습니다. 관리자 접속 정보는 제작자의 로컬 비공개 파일에 따로 보관합니다. 기존 SQLite 관리자 비밀번호와 운영 관리자 비밀번호는 별개입니다. 로컬 전용 `scripts/admin-password.mjs`는 SQLite용이며, 운영 비밀번호 변경은 Vercel의 `ADMIN_PASSWORD` 변경 후 재배포합니다.

## 확인한 내용

- 전체 자동 검사: 154개 중 153개 통과, 원격 DB 명시 실행용 1개는 기본 실행에서 건너뜀
- 원격 DB 검사를 별도 실행해 통과: 서로 다른 서버 인스턴스 사이 기록·동의·관리자 세션 유지, 유저 격리, 동시 중복 요청 차단, 실패 재시도, 입력 변경 거절
- 로컬 API: 동의·CSRF·관리자 인증·입력 제한·대화 저장·서버 재시작·기록 삭제·음원 범위 응답
- 기존 대사의 문구 변경으로 실패하던 테스트는 현재 대사와 실제 아침 독백 길이에 맞춤
- 식당·갈등에서 수정된 대사에 맞춰 표정 큐를 연결. 대사 문장은 바꾸지 않음
- Git에 올릴 전체 파일에서 실제 비밀 값과 비공개 경로 포함 여부 검사
- 업로드 전 원본 로컬의 기존 대화 기록 87건 삭제. 운영 DB로 이전하지 않음

## 다시 배포하기

```bash
npm ci
npm run check
npm test
vercel link --project dokidoki-runtime --scope eomteaeuns-projects
vercel deploy --prod --skip-domain --scope eomteaeuns-projects
```

위 배포의 페이지·API를 확인한 뒤 해당 배포를 `vercel promote`로 운영 도메인에 연결합니다. 로컬 환경변수는 `.env.local`에 보관하고 커밋하지 마세요.

## OpenAI 외 비용 설정

- Vercel: 계정 API에서 `hobby`, `active`, `trial: false` 확인. Pro·체험판이 아닙니다.
- Neon: 리소스 생성 시 `--plan free_v3`를 명시했고, 실제 리소스 API에서도 `Free`, `cost: Free`, `paymentMethodRequired: false`를 확인했습니다. 유료 Launch·Scale 플랜을 선택하지 않았습니다.
- GitHub: 개인 계정의 공개 저장소 및 Releases. 별도 유료 기능을 추가하지 않았습니다.
- 도메인 구매·유료 모니터링·유료 스토리지·자동 충전을 설정하지 않았습니다.
- 무료 한도에 도달하면 서비스가 제한될 수 있으며, 이를 피하려고 자동으로 유료 플랜으로 올리지 않습니다. OpenAI API는 제작자가 설정한 별도 한도를 따릅니다.

정책 참고: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Neon Free 한도](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md).
