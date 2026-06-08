---
name: web-to-figma
description: >
  웹페이지를 Figma로 가져옵니다. CSR/SPA(React, Vue, Next CSR)도 됩니다. 방식은 두 가지입니다.
  A 방식은 chrome-devtools MCP와 Figma capture.js로 편집 가능한 레이어와 이미지를 만들고, CORS 프록시로
  다른 도메인 이미지를 살립니다. B 방식은 풀페이지 스크린샷을 이미지로 넣습니다. 사용자가 웹페이지나 URL을
  Figma로 복제, 복사, 가져오기, 캡처, 스크린샷하려 할 때 씁니다. 트리거 문구는 "이 사이트 피그마로",
  "캡처해줘", "URL 피그마로 복사", "website to figma" 입니다.
---

# web-to-figma

CSR 사이트도 이미지까지 Figma로 가져옵니다. 배경과 쓰는 상황은 저장소 README(https://github.com/e2goon/web-to-figma)를 참고하세요.

## 준비물

chrome-devtools MCP를 설치하고(claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest) 세션을 다시 켭니다. Figma MCP(plugin:figma:figma)를 연결합니다. 무료 Starter 팀은 호출 제한이 있으니 org나 유료 시트 파일에서 작업합니다.

도구가 deferred 상태면 다음으로 불러옵니다.
select:mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__evaluate_script,mcp__chrome-devtools__list_pages,mcp__plugin_figma_figma__generate_figma_design,mcp__plugin_figma_figma__upload_assets,mcp__plugin_figma_figma__get_screenshot

## 방식 선택

A 방식은 편집 레이어와 이미지를 만듭니다. CSR에 잘 맞고 권장합니다. capture.js와 CORS 프록시를 씁니다.
B 방식은 풀페이지 스크린샷입니다. 이미지는 전부 나오지만 납작한 이미지입니다.

## A 방식 절차

1. generate_figma_design(fileKey)로 captureId를 받습니다. 한 번만 씁니다.
2. chrome-devtools navigate_page(url)로 이동합니다. 사용자가 이미 이동했으면 list_pages로 URL만 확인합니다.
3. evaluate_script에 scripts/1-prep-images.js를 넣습니다. 스크롤과 CORS 프록시 교체, 폴백을 합니다.
4. evaluate_script에 scripts/2-inject-capture.js를 넣어 capture.js를 주입합니다.
5. evaluate_script에 scripts/3-run-capture.js를 넣습니다. CAPTURE_ID를 받은 값으로 바꿉니다. Runtime.callFunctionOn timed out이 떠도 전송은 성공한 경우가 많으니 폴링으로 확인합니다.
6. generate_figma_design(fileKey, captureId)를 completed가 될 때까지 반복하면 node-id가 옵니다.
7. get_screenshot(fileKey, nodeId)로 확인합니다.

## B 방식 절차

1. navigate_page(url) 또는 현재 페이지를 씁니다.
2. evaluate_script에 scripts/B-scroll-only.js를 넣습니다.
3. take_screenshot({ fullPage: true, filePath: 'shot.png' })로 찍습니다.
4. upload_assets(fileKey, count:1)로 받은 submitUrl에 PNG를 올립니다. curl -s -X POST "(submitUrl)" -F "file=@shot.png;type=image/png"

## 운영

"캡처"는 현재 페이지를 A 방식으로 잡습니다. 이때 list_pages로 URL을 먼저 확인합니다. "스크린샷으로"는 B 방식, "URL 캡처"는 이동부터 합니다. 페이지를 이동하면 CORS 교체부터 다시 합니다. capture.js 기본 재캡처 버튼은 CORS 교체를 안 하니 이 워크플로우로 돌려야 이미지가 삽니다. captureId는 페이지마다 새로 받습니다. 가상 스크롤은 일부 누락됩니다. webp 일부는 프록시가 실패해 원본으로 돌아가 빈칸이 되니, 이미지가 다 필요하면 B 방식을 같이 씁니다.
