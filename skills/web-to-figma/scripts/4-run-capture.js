// A 방식 4단계 (브라우저에서 실행하는 스크립트). 캡처 실행 (captureForDesign).
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
// CAPTURE_ID를 generate_figma_design으로 받은 값으로 치환한다.
//
// 반환값은 { submitted, result } 또는 { submitted:false, error } 이다.
//
// CDP의 Runtime.callFunctionOn timed out이 떠도 서버 전송은 성공한 경우가 많다.
// 에러로 단정하지 말고 generate_figma_design(fileKey, captureId) 폴링으로 실제 상태를 확인한다.

async () => {
  const CID = 'CAPTURE_ID';
  if (!(window.figma && window.figma.captureForDesign)) {
    const res = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js');
    (0, eval)(await res.text());
  }
  try {
    const result = await window.figma.captureForDesign({
      captureId: CID,
      endpoint: 'https://mcp.figma.com/mcp/capture/' + CID + '/submit',
      selector: 'body',
    });
    return { submitted: true, result };
  } catch (e) {
    return { submitted: false, error: String((e && e.message) || e) };
  }
}
