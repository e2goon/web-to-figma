// A 방식 1단계 (브라우저에서 실행하는 스크립트).
// 모든 이미지를 "캡처해도 빈칸이 안 되도록" 준비한다.
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// 하는 일 (순서대로)
//   1. 페이지를 맨 아래까지 스크롤한다. 스크롤해야 비로소 불러오는(lazy) 이미지가 많기 때문이다.
//      스크롤하면 내용이 더 길어지는 페이지도 있어서, 높이가 더 안 늘어날 때까지 반복한다.
//   2. 화면의 모든 <img>를 CORS를 열어주는 프록시(wsrv.nl) 주소로 바꾼다.
//      Figma capture.js는 이미지를 캔버스로 "읽어서" 가져가는데, 다른 도메인 이미지는
//      CORS 허락이 없으면 못 읽어 빈칸이 된다. 프록시가 그 허락을 대신 붙여준다.
//   3. 프록시는 한꺼번에 많은 이미지를 요청하면 일부를 놓치기도 한다(들쭉날쭉). 실패한 것만 한 번 더 시도한다.
//   4. 그래도 실패한 이미지는 원본 주소로 되돌린다. 화면에는 보이되, 캡처에서는 빈칸일 수 있다.
//   5. CSS 배경 이미지(background-image)도 다른 도메인이면 같은 프록시로 바꾼다.
//
// 반환값 { url, total, proxyOk, retried, reverted, loadedTotal, bgSwapped }
//   proxyOk     = CORS가 열려 캡처에 정상 포함될 이미지 수
//   reverted    = 화면엔 보이지만 캡처에선 빈칸일 수 있는 수 (대개 추적 픽셀이나 까다로운 webp)
//   loadedTotal = 실제로 로드된 이미지 수
//
// 참고: 아이콘이 "이미지"가 아니라 "아이콘 전용 글꼴"로 그려진 사이트도 많다.
//       그건 여기서 못 잡으니 다음 단계(2-bake-icon-fonts.js)가 처리한다.

async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const proxy = (u) => 'https://wsrv.nl/?url=' + encodeURIComponent(u.replace(/^https?:\/\//, ''));

  // 1) 높이를 따라가며 끝까지 스크롤 (lazy 이미지 로드)
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
  await sleep(800);

  // 2) 모든 img를 CORS 프록시로 교체
  const proxify = (img, orig) => {
    img.removeAttribute('srcset');
    img.setAttribute('crossorigin', 'anonymous');
    img.src = proxy(orig);
  };
  const imgs = Array.from(document.querySelectorAll('img'));
  for (const img of imgs) {
    const orig = img.currentSrc || img.src;
    if (!orig || orig.startsWith('data:') || orig.includes('wsrv.nl')) continue;
    proxify(img, orig);
  }
  await sleep(800);
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 8000); }))));

  // 3) 실패한 것만 한 번 더 시도 (프록시가 한꺼번에 많으면 일부를 놓친다)
  let retried = 0;
  for (const img of imgs) {
    if (img.src.includes('wsrv.nl') && img.naturalWidth > 0) continue;
    const cur = img.currentSrc || img.src;
    if (!cur || cur.startsWith('data:')) continue;
    const m = cur.match(/[?&]url=([^&]+)/);
    proxify(img, m ? 'https://' + decodeURIComponent(m[1]) : cur);
    retried++;
  }
  await sleep(1000);
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 9000); }))));

  // 4) 그래도 실패하면 원본으로 폴백 (화면엔 보이게)
  let reverted = 0;
  imgs.forEach((i) => {
    if (i.src.includes('wsrv.nl') && !(i.complete && i.naturalWidth > 0)) {
      const m = i.src.match(/[?&]url=([^&]+)/);
      if (m) { i.removeAttribute('crossorigin'); i.src = 'https://' + decodeURIComponent(m[1]); reverted++; }
    }
  });
  await sleep(700);
  await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));

  // 5) CSS 배경 이미지도 다른 도메인이면 프록시로 교체 (요소에 직접 걸린 것만)
  const host = location.hostname;
  const urlRe = /url\((['"]?)(https?:\/\/[^'")]+)\1\)/g;
  let bgSwapped = 0;
  for (const el of document.querySelectorAll('*')) {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none' || !bg.includes('url(')) continue;
    let changed = false;
    urlRe.lastIndex = 0;
    const next = bg.replace(urlRe, (whole, _q, u) => {
      try { if (new URL(u).hostname === host) return whole; } catch { return whole; }
      changed = true;
      return 'url("' + proxy(u) + '")';
    });
    if (changed) { el.style.backgroundImage = next; bgSwapped++; }
  }
  await sleep(1500);

  window.scrollTo(0, 0);
  return {
    url: location.href,
    total: imgs.length,
    proxyOk: imgs.filter((i) => i.src.includes('wsrv.nl') && i.naturalWidth > 0).length,
    retried,
    reverted,
    loadedTotal: imgs.filter((i) => i.naturalWidth > 0).length,
    bgSwapped,
  };
}
