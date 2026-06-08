// A 방식 3단계 (브라우저에서 실행하는 스크립트). Figma capture.js 주입.
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// CDP eval은 페이지 main world에서 실행돼 페이지 CSP의 적용을 받지 않으므로 inline eval이 통한다.
// Playwright처럼 CSP 헤더를 제거할 필요가 없다.
//
// 반환값은 { hasFn, bytes } 이다. hasFn이 true면 window.figma.captureForDesign 준비 완료.
//
// 드물게 in-page fetch가 페이지 connect-src CSP에 걸리면 capture.js 본문을 함수에 직접 인라인해서 eval 한다.

async () => {
  const res = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js');
  const src = await res.text();
  (0, eval)(src);
  return { hasFn: !!(window.figma && window.figma.captureForDesign), bytes: src.length };
}
