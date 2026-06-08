// B 방식 2단계 (브라우저에서 실행하는 스크립트). 스크린샷 전에 이미지만 다 로드한다.
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// 스크린샷은 브라우저가 이미 그린 화면을 뜨므로 CORS와 무관하다.
// 따라서 프록시 교체 없이 스크롤로 lazy 이미지만 모두 띄우면 된다.
// 스크롤하면 내용이 더 길어지는 페이지가 있어서, 높이가 더 안 늘어날 때까지 반복한다.
//
// 반환값 { total, loaded }

async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });

  let lastH = 0, stable = 0;
  for (let pass = 0; pass < 60; pass++) {
    const h = document.body.scrollHeight;
    for (let y = window.scrollY; y < h; y += 500) { window.scrollTo(0, y); await sleep(150); }
    window.scrollTo(0, h);
    await sleep(500);
    const newH = document.body.scrollHeight;
    if (newH === lastH) { if (++stable >= 3) break; } else stable = 0;
    lastH = newH;
  }
  window.scrollTo(0, 0);
  await sleep(1000);

  const imgs = Array.from(document.querySelectorAll('img'));
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 2500); }))));
  return { total: imgs.length, loaded: imgs.filter((i) => i.naturalWidth > 0).length };
}
