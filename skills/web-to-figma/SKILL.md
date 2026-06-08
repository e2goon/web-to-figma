---
name: web-to-figma
description: >
  웹페이지를 Figma로 가져옵니다. CSR/SPA(React, Vue, Next CSR)도 됩니다. 방식은 두 가지입니다.
  A 방식은 chrome-devtools MCP와 Figma capture.js로 편집 가능한 레이어와 이미지를 만들고, CORS 프록시로
  다른 도메인 이미지를 살리며, 아이콘 웹폰트는 이미지로 구워 넣습니다. B 방식은 풀페이지 스크린샷을
  이미지로 넣습니다. 사용자가 웹페이지나 URL을 Figma로 복제, 복사, 가져오기, 캡처, 스크린샷하려 할 때 씁니다.
  트리거 문구는 "이 사이트 피그마로", "캡처해줘", "URL 피그마로 복사", "website to figma" 입니다.
---

# web-to-figma

CSR 사이트도 이미지까지 Figma로 가져옵니다. 배경과 쓰는 상황은 저장소 README(https://github.com/e2goon/web-to-figma)를 참고하세요.

## 준비물

chrome-devtools MCP를 설치하고(claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest) 세션을 다시 켭니다. Figma MCP(plugin:figma:figma)를 연결합니다. 무료 Starter 팀은 호출 제한이 있으니 org나 유료 시트 파일에서 작업합니다.

도구가 deferred 상태면 다음으로 불러옵니다.
select:mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__evaluate_script,mcp__chrome-devtools__list_pages,mcp__chrome-devtools__take_screenshot,mcp__plugin_figma_figma__generate_figma_design,mcp__plugin_figma_figma__upload_assets,mcp__plugin_figma_figma__get_screenshot

## 방식 선택

A 방식은 편집 가능한 레이어와 이미지를 만듭니다. CSR에 잘 맞고 권장합니다. capture.js와 CORS 프록시를 쓰고, 아이콘 웹폰트는 이미지로 구워 넣습니다.
B 방식은 풀페이지 스크린샷입니다. 이미지는 전부 나오지만 편집이 안 되는 납작한 이미지 한 장입니다.

이미지가 하나도 빠지면 안 되면 A와 B를 같이 쓰세요. A로 편집 레이어를 만들고, 같은 파일에 B 스크린샷을 한 장 올려두면 빠진 자리를 보고 채울 수 있습니다.

## A 방식 절차

브라우저에서 돌리는 스크립트는 scripts/ 폴더에 있습니다. 각 스크립트는 evaluate_script의 function 인자에 파일 내용을 그대로 넣습니다.

1. generate_figma_design(fileKey)로 captureId를 받습니다. 한 번만 쓰므로 페이지마다 새로 받습니다.
2. chrome-devtools navigate_page(url)로 이동합니다. 사용자가 이미 이동했으면 list_pages로 현재 URL만 확인합니다.
3. (선택) scripts/diagnose.js를 실행해 무엇이 빠질지 미리 봅니다. iconFontPseudo가 0보다 크면 아이콘 웹폰트가 있는 것이고, bgImages가 있으면 배경 이미지가 있는 것입니다.
4. scripts/1-prep-images.js를 실행합니다. 끝까지 스크롤해 lazy 이미지를 모두 띄우고, 모든 img와 다른 도메인 배경 이미지를 wsrv.nl 프록시로 바꾸고, 실패분은 한 번 더 시도한 뒤 원본으로 되돌립니다.
5. scripts/2-bake-icon-fonts.js를 실행합니다. 아이콘 폰트 글리프를 PNG로 구워 <img>로 끼워 넣습니다. baked가 0이면 아이콘 폰트가 없는 것이니 그냥 넘어갑니다.
6. scripts/3-inject-capture.js를 실행해 capture.js를 주입합니다. 반환의 hasFn이 true여야 합니다.
7. scripts/4-run-capture.js를 실행합니다. 안의 CAPTURE_ID를 받은 값으로 바꿉니다. Runtime.callFunctionOn timed out이 떠도 전송은 성공한 경우가 많으니 다음 단계로 확인합니다.
8. generate_figma_design(fileKey, captureId)를 status가 completed가 될 때까지 반복합니다(최대 열 번). 끝나면 node-id가 옵니다.
9. get_screenshot(fileKey, nodeId)로 결과를 확인합니다.

확인용으로 캡처 직전에 chrome-devtools take_screenshot으로 페이지를 한 장 찍어, 아이콘과 이미지가 화면에 제대로 보이는지 눈으로 보고 넘어가면 안전합니다.

## B 방식 절차

1. navigate_page(url) 또는 현재 페이지를 씁니다.
2. scripts/B-scroll-only.js를 실행합니다. 스크린샷은 CORS와 무관하니 스크롤만 합니다.
3. take_screenshot({ fullPage: true, filePath: 'shot.png' })로 찍습니다.
4. upload_assets(fileKey, count:1)로 받은 submitUrl에 PNG를 올립니다. curl -s -X POST "(submitUrl)" -F "file=@shot.png;type=image/png"

## 운영

"캡처"는 현재 페이지를 A 방식으로 잡습니다. 이때 list_pages로 URL을 먼저 확인합니다. "스크린샷으로"는 B 방식, "URL 캡처"는 이동부터 합니다. URL을 여러 개 주면 각 URL마다 절차를 반복하고, captureId는 페이지마다 새로 받습니다.

## 알아둘 점

페이지를 이동하면(SPA 라우트 변경) DOM이 초기화됩니다. 그러면 1단계(이미지 준비)부터 다시 합니다. capture.js 기본 재캡처 버튼은 이 준비 과정을 안 거치니, 반드시 이 워크플로우로 돌려야 이미지와 아이콘이 삽니다.

스크립트 실행 결과의 url이 about:blank이거나 이미지 수가 0이면 페이지가 리셋된 것입니다. navigate부터 다시 합니다(diagnose.js와 2-bake-icon-fonts.js는 about:blank이면 reset:true를 돌려줍니다).

아이콘이 빠진다면 십중팔구 "아이콘 웹폰트"입니다. <img>도 배경 이미지도 아니라서 프록시로는 안 잡힙니다. 2-bake-icon-fonts.js가 이걸 이미지로 구워 해결합니다.

wsrv.nl 프록시는 한꺼번에 많은 이미지를 요청하면 일부를 놓쳐 결과가 들쭉날쭉합니다. 1-prep-images.js가 실패분을 한 번 더 시도하지만, 그래도 안 되는 까다로운 webp 등은 원본으로 되돌아가 캡처에선 빈칸이 됩니다. 그런 이미지가 중요하면 B 방식을 같이 씁니다.

가상 스크롤(virtualized list)을 쓰는 페이지는 화면 밖 항목이 DOM에 없어 일부가 빠질 수 있습니다. shadow DOM이나 iframe 안의 내용도 일부 누락될 수 있습니다.

captureId는 한 번만 씁니다. 무료 Figma 팀은 호출 제한이 있으니 org나 유료 시트 파일에서 작업하세요.
