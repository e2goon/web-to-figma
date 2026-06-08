// B 방식 2단계. 스크린샷 전 이미지 로드 (스크롤만).
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// 스크린샷은 브라우저가 이미 렌더한 화면을 뜨므로 CORS와 무관하다.
// 따라서 프록시 교체 없이 스크롤로 lazy 이미지만 모두 로드하면 된다.
//
// 반환값은 { total, loaded } 이다.

async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
  const h = document.body.scrollHeight;
  for (let y = 0; y < Math.min(h, 24000); y += 600) {
    window.scrollTo(0, y);
    await sleep(200);
  }
  window.scrollTo(0, 0);
  await sleep(1000);
  const imgs = Array.from(document.querySelectorAll('img'));
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 2500); }))));
  return { total: imgs.length, loaded: imgs.filter((i) => i.naturalWidth > 0).length };
}
