// A 방식 3단계. 이미지 lazy 로드, CORS 프록시 교체, 폴백.
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// 하는 일
//   1. 페이지를 끝까지 스크롤해 lazy 이미지를 모두 로드한다.
//   2. 모든 img를 CORS 허용 프록시(wsrv.nl)로 바꾸고 crossorigin=anonymous를 단다.
//      그래야 capture.js가 캔버스로 읽을 수 있다.
//   3. 프록시가 실패한 이미지(naturalWidth가 0)는 원본 https로 되돌려 화면에는 보이게 한다.
//
// 반환값은 { url, total, proxyOk, reverted, loadedTotal } 이다.
//   proxyOk는 CORS가 열려 캡처에 정상 포함된 수.
//   reverted는 화면에는 보이지만 캡처에서는 빈칸일 수 있는 수.

async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1) 스크롤로 lazy 로드
  document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
  const h = document.body.scrollHeight;
  for (let y = 0; y < Math.min(h, 24000); y += 600) {
    window.scrollTo(0, y);
    await sleep(200);
  }
  window.scrollTo(0, 0);
  await sleep(800);

  // 2) CORS 프록시로 교체
  const proxy = (u) => 'https://wsrv.nl/?url=' + encodeURIComponent(u.replace(/^https?:\/\//, ''));
  const imgs = Array.from(document.querySelectorAll('img'));
  for (const img of imgs) {
    const orig = img.currentSrc || img.src;
    if (!orig || orig.startsWith('data:') || orig.includes('wsrv.nl')) continue;
    img.removeAttribute('srcset');
    img.setAttribute('crossorigin', 'anonymous');
    img.src = proxy(orig);
  }
  await sleep(700);
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 7000); }))));

  // 3) 실패분 원본 폴백
  let reverted = 0;
  imgs.forEach((i) => {
    if (i.src.includes('wsrv.nl') && !(i.complete && i.naturalWidth > 0)) {
      const m = i.src.match(/[?&]url=([^&]+)/);
      if (m) { i.removeAttribute('crossorigin'); i.src = 'https://' + decodeURIComponent(m[1]); reverted++; }
    }
  });
  await sleep(600);
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));

  return {
    url: location.href,
    total: imgs.length,
    proxyOk: imgs.filter((i) => i.src.includes('wsrv.nl') && i.naturalWidth > 0).length,
    reverted,
    loadedTotal: imgs.filter((i) => i.naturalWidth > 0).length,
  };
}
