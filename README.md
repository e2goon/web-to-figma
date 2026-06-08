# 웹페이지를 Figma로 복사하기 (web-to-figma)

CSR/SPA(React, Vue, Next CSR 등) 사이트를 포함해서, 이미지까지 같이 Figma로 옮기는 워크플로우입니다. Claude Code에 chrome-devtools MCP와 Figma MCP를 연결해서 동작합니다.

결과물은 두 가지 중에 고르면 됩니다.

첫째, 편집 가능한 레이어로 가져오기. 텍스트와 프레임, 이미지가 Figma 레이어로 들어옵니다. CSR도 잘 되지만 CORS가 막힌 일부 이미지는 빠질 수 있습니다.

둘째, 화면 그대로 스크린샷으로 가져오기. 페이지 전체를 이미지 한 장으로 넣습니다. 이미지는 전부 나오지만 레이어 편집은 안 됩니다.

## 설치

이 저장소는 Claude Code 플러그인 마켓플레이스 형태라서 Claude Code CLI와 Claude Desktop 둘 다에서 설치됩니다.

Claude Code(CLI)에서는 아래 두 줄을 실행합니다.

```
/plugin marketplace add e2goon/web-to-figma
/plugin install web-to-figma@web-to-figma-marketplace
```

Claude Desktop에서는 왼쪽 Customize에서 Plugins 탭으로 가서 Browse plugins를 누르고, 같은 마켓플레이스(e2goon/web-to-figma)를 추가한 뒤 web-to-figma를 설치합니다.

설치하면 /web-to-figma:web-to-figma 로 불러서 씁니다. 플러그인은 워크플로우만 담고 있고, 실제 캡처는 chrome-devtools MCP와 Figma MCP가 합니다. 설치 전에 아래 준비물을 먼저 맞춰 주세요.

## 어떤 상황에 쓰나

경쟁사나 참고 사이트를 Figma로 가져와서 분석하거나 벤치마크할 때 씁니다. 지금 운영 중인 사이트를 Figma에 올려두고 리디자인의 출발점으로 삼을 때도 좋습니다. 특정 화면의 레이아웃이나 간격, 구조를 뜯어보고 싶을 때, React 같은 CSR 사이트라서 일반적인 URL 변환 플러그인이 빈 페이지만 가져올 때도 유용합니다. 로그인한 뒤 화면이나 필터를 건 상태, 모달이 열린 상태처럼 URL만으로는 못 가는 화면을 잡을 때, 무료 플러그인의 횟수 제한이나 유료 벽에 막혔을 때도 이 방법으로 풉니다.

편집 가능한 레이어가 필요하면 A 방식을, 보이는 그대로의 이미지로 충분하면 B 방식을 쓰면 됩니다.

처음부터 디자인 시스템 컴포넌트로 깔끔하게 새로 그릴 거라면, 원본을 복제하는 이 방식보다 Figma의 use_figma로 다시 그리는 편이 낫습니다. 이건 이미 있는 사이트를 그대로 가져오는 데 맞춘 도구입니다.

## 왜 이렇게 하나

WebFetch나 curl은 CSR을 못 가져옵니다. 빈 HTML 껍데기만 받아서 내용이 안 들어옵니다.

Playwright MCP는 여기엔 잘 안 맞습니다. 헤드리스 브라우저 세션이 자주 닫히고, CSP 헤더를 제거하는 방식을 Claude Code 보안 분류기가 막습니다.

chrome-devtools MCP가 답입니다. 실제 Chrome을 띄우고 CDP의 evaluate_script가 페이지 main world에서 돌기 때문에 CSP를 그냥 넘어갑니다. 세션도 안 끊깁니다.

이미지에서 막히는 건 CORS 때문입니다. Figma의 capture.js는 이미지를 캔버스로 읽는데, CORS 헤더가 없는 다른 도메인 CDN 이미지는 읽지 못해서 빈칸으로 들어옵니다. 그래서 이미지 src를 CORS를 열어주는 프록시(wsrv.nl)로 바꿔치기하고, 프록시가 실패하면 원본으로 되돌립니다. 반면 스크린샷 방식은 브라우저가 이미 그린 화면을 통째로 뜨기 때문에 CORS와 상관없이 이미지가 다 나옵니다.

## 준비물

Claude Code(CLI)가 있어야 합니다.

chrome-devtools MCP를 설치합니다. 설치 뒤에 Claude Code를 완전히 껐다가 다시 켜야 도구가 잡힙니다.

```
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

Figma MCP는 로그인이 필요합니다. 무료(Starter) 팀 파일은 MCP 호출 횟수 제한에 걸리니, 가능하면 org나 유료 시트가 있는 파일에서 작업하세요. 무료 팀밖에 없으면 org에 새 파일을 만들어 작업한 뒤 나중에 옮기면 됩니다.

## 쓰는 법

### A 방식: 편집 레이어와 이미지

대상 Figma 파일의 fileKey가 필요합니다. URL의 figma.com/design/(fileKey)/... 에서 뽑습니다. 사용자가 브라우저에서 원하는 페이지로 직접 옮긴 다음 "캡처해줘"라고 하는 방식이 제일 편합니다.

1. generate_figma_design(fileKey)로 captureId를 받습니다. 한 번 쓰면 끝이라 페이지마다 새로 받습니다.
2. chrome-devtools navigate_page(url)로 이동합니다. 이미 이동했으면 list_pages로 현재 URL만 확인합니다.
3. evaluate_script로 scripts/1-prep-images.js를 실행합니다. 스크롤로 lazy 이미지를 다 띄우고, 모든 img를 wsrv.nl 프록시와 crossorigin으로 바꾸고, 실패분은 원본으로 되돌립니다.
4. evaluate_script로 scripts/2-inject-capture.js를 실행해서 capture.js를 주입합니다.
5. evaluate_script로 scripts/3-run-capture.js를 실행합니다. CAPTURE_ID를 받은 값으로 바꿉니다. Runtime.callFunctionOn timed out이 떠도 전송은 성공한 경우가 많으니 6번에서 확인합니다.
6. generate_figma_design(fileKey, captureId)를 status가 completed가 될 때까지 반복합니다. 최대 열 번 정도 보고, 끝나면 node-id가 옵니다.
7. get_screenshot(fileKey, nodeId)로 결과를 확인합니다.

### B 방식: 풀페이지 스크린샷

1. chrome-devtools navigate_page(url) 또는 현재 페이지를 씁니다.
2. evaluate_script로 scripts/B-scroll-only.js를 실행합니다. 스크린샷은 CORS와 무관하니 스크롤만 합니다.
3. take_screenshot({ fullPage: true, filePath: 'shot.png' })로 찍습니다.
4. upload_assets(fileKey, count:1)로 받은 submitUrl에 PNG를 올립니다.

```
curl -s -X POST "<submitUrl>" -F "file=@shot.png;type=image/png"
```

이러면 image fill 프레임이 파일에 자동으로 놓입니다. 이미지는 10MB 이하여야 합니다.

## 트리거 문구

"이 사이트 피그마로 캡처해줘"나 "URL 피그마로 복사"라고 하면 A 방식으로 갑니다. "캡처" 또는 "이거 캡처해줘"라고 하면 chrome-devtools가 띄운 Chrome의 현재 페이지를 캡처합니다. 이때는 항상 list_pages로 URL을 먼저 확인합니다. "스크린샷으로"나 "이미지로만"이라고 하면 B 방식입니다. URL을 여러 개 주면 각 URL마다 이동, 이미지 준비, 주입, 캡처, 폴링을 반복합니다.

## 알아둘 점

페이지를 이동하면(SPA 라우트 변경) DOM이 초기화됩니다. 그러면 CORS 이미지 교체부터 다시 해야 합니다.

capture.js가 띄우는 기본 재캡처 버튼은 CORS 교체를 안 합니다. 그 버튼으로 누르면 이미지가 또 빈칸으로 나오니, 반드시 이 워크플로우로 돌려야 이미지가 삽니다.

captureId는 한 번만 씁니다. 페이지마다 새로 받으세요.

가상 스크롤을 쓰는 페이지는 화면 밖 요소가 DOM에 없어서 일부가 빠질 수 있습니다.

webp에 복잡한 쿼리가 붙은 이미지는 wsrv.nl이 못 가져오기도 합니다. 그런 건 원본으로 되돌아가서 캡처에는 빈칸이 됩니다. 이미지가 다 필요하면 B 방식을 같이 쓰세요.

무료 Figma 팀은 호출 제한이 있으니 org나 유료 시트 파일에서 작업하세요.

## 구성

```
web-to-figma/
  .claude-plugin/
    plugin.json          플러그인 매니페스트
    marketplace.json     마켓플레이스 카탈로그
  skills/
    web-to-figma/
      SKILL.md           스킬 정의
      scripts/
        1-prep-images.js     스크롤과 CORS 프록시 교체, 폴백 (A 방식)
        2-inject-capture.js  capture.js 주입
        3-run-capture.js     captureForDesign 실행
        B-scroll-only.js     스크린샷 전 이미지 로드 (B 방식)
  README.md
```

각 스크립트는 chrome-devtools의 evaluate_script function 인자에 그대로 넣습니다.

## English

web-to-figma copies any website, including client-side-rendered (CSR/SPA) apps with their images, into a Figma file. It runs through Claude Code with the chrome-devtools and Figma MCP servers.

WebFetch and curl only see the empty HTML shell of a CSR app, so the content never arrives. Playwright MCP is a poor fit here because its headless sessions keep closing and its CSP-header-stripping pattern gets blocked by the Claude Code safety classifier. The reliable driver is chrome-devtools MCP. It runs a real Chrome, and CDP evaluate_script runs in the page main world, so it steps past CSP without stripping anything and the session stays open.

The remaining problem is CORS. Figma capture.js reads each image through a canvas, so cross-origin CDN images without CORS headers come back blank. The fix is to swap every img to a CORS-enabled proxy (wsrv.nl) and fall back to the original URL when the proxy fails. A full-page screenshot does not have this problem because the browser has already painted the pixels.

There are two modes. Mode A produces editable Figma layers: get a captureId from generate_figma_design, navigate with chrome-devtools, run prep-images (scroll, proxy swap, fallback), inject capture.js, call window.figma.captureForDesign, then poll generate_figma_design until it reports completed. Mode B produces a flat screenshot: navigate, scroll to load images, take_screenshot with fullPage, then POST the PNG through upload_assets.

Use it to benchmark or redesign a live site, to import CSR sites that ordinary URL-to-Figma tools fail on, or to capture states a bare URL cannot reach such as a logged-in, filtered, or modal-open screen. Pick Mode A when you need editable layers and Mode B when a faithful image is enough.

You need Claude Code, chrome-devtools MCP (claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest, then restart), and a connected Figma MCP. Prefer an org or paid-seat file because free Starter teams hit an MCP call limit.

A few things to keep in mind. Re-run the CORS swap after any in-app navigation, since SPA route changes reset the DOM. The captureId is single use per page. Virtualized lists may drop off-screen items. Some webp images fail the proxy and fall back to the original, which appears blank in Mode A, so run Mode B alongside if you need every image. A CDP Runtime.callFunctionOn timeout on the capture call usually still submits, so verify by polling instead of assuming it failed.
