// 선택 단계 (브라우저에서 실행하는 스크립트). 무엇이 빠질지 미리 진단한다.
// 페이지를 바꾸지 않고 읽기만 한다. "아이콘이 안 나와요" 같은 상황에서 원인을 알려준다.
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// 결과 보는 법
//   imgCount / imgHosts : <img>가 몇 개이고 어느 도메인에서 오는지.
//                         (t.co, analytics.* 같은 1x1 추적 픽셀은 무시해도 된다)
//   iconFontPseudo      : 아이콘 "웹폰트"로 그린 아이콘 수. 0보다 크면 2-bake-icon-fonts.js를 돌려야 한다.
//   iconFonts           : 어떤 아이콘 글꼴이 쓰였는지.
//   bgImages            : CSS 배경 이미지 수. bgCrossSample이 있으면 다른 도메인이라 프록시 교체가 필요하다.
//   shadowRoots/iframes : 이 안의 내용은 캡처에서 일부 빠질 수 있다.

async () => {
  if (location.href === 'about:blank') return { reset: true, url: location.href };
  try { await document.fonts.ready; } catch {}

  const host = location.hostname;
  const strip = (s) => (s || '').replace(/^["']|["']$/g, '');
  const looksIcon = (ff) => /icon|fontello|material|glyph|fa-|awesome|feather|ionicon/i.test(ff);
  const urlRe = /url\((['"]?)(https?:\/\/[^'")]+)\1\)/g;

  const imgs = Array.from(document.querySelectorAll('img'));
  const imgHosts = {};
  imgs.forEach((i) => { try { const h = new URL(i.currentSrc || i.src).hostname; imgHosts[h] = (imgHosts[h] || 0) + 1; } catch {} });

  let iconFontPseudo = 0;
  const iconFonts = {};
  let bgImages = 0;
  const bgCross = new Set();

  for (const el of document.querySelectorAll('*')) {
    const elBg = getComputedStyle(el).backgroundImage;
    if (elBg && elBg !== 'none' && elBg.includes('url(')) {
      bgImages++;
      let m; urlRe.lastIndex = 0;
      while ((m = urlRe.exec(elBg))) { try { if (new URL(m[2]).hostname !== host) bgCross.add(m[2]); } catch {} }
    }
    for (const p of ['::before', '::after']) {
      const cs = getComputedStyle(el, p);
      const c = cs.content;
      if (!c || c === 'none' || c === 'normal') continue;
      const ch = strip(c);
      if (!ch) continue;
      const cp = ch.codePointAt(0);
      const ff = cs.fontFamily || '';
      if ((cp >= 0xe000 && cp <= 0xf8ff) || looksIcon(ff)) { iconFontPseudo++; iconFonts[ff] = (iconFonts[ff] || 0) + 1; }
    }
  }

  let shadowRoots = 0;
  document.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) shadowRoots++; });

  return {
    url: location.href,
    imgCount: imgs.length,
    imgHosts,
    iconFontPseudo,
    iconFonts,
    bgImages,
    bgCrossSample: [...bgCross].slice(0, 8),
    shadowRoots,
    iframes: document.querySelectorAll('iframe').length,
  };
}
