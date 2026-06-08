// A 방식 2단계 (브라우저에서 실행하는 스크립트). 아이콘 "웹폰트"를 이미지로 바꾼다.
// chrome-devtools evaluate_script의 function 인자에 그대로 넣는다.
//
// 왜 필요한가
//   많은 사이트가 아이콘을 그림이 아니라 "아이콘 전용 글꼴(아이콘 폰트)"의 글자로 그린다.
//   예: <i> 요소에 ::before { content: "\e900"; font-family: 아이콘폰트 } 를 걸어서 표시.
//   이런 아이콘은 <img>도 background-image도 아니라서 1단계 프록시로는 안 잡힌다.
//   게다가 Figma에는 그 아이콘 폰트가 없어서, 그대로 가져가면 네모(□)나 빈칸으로 들어간다.
//
// 무엇을 하나
//   캡처 직전에, 각 아이콘 글자를 그 폰트로 캔버스에 직접 그려 PNG로 만든 다음
//   진짜 <img>로 끼워 넣는다. 원래 아이콘 글자(::before/::after)는 숨긴다.
//   그러면 capture.js가 이 <img>를 평범한 이미지 레이어로 가져간다.
//
// 아이콘인지 판단
//   ::before / ::after의 content 한 글자가 사설영역(PUA, U+E000~U+F8FF)에 있거나,
//   글꼴 이름이 아이콘 폰트처럼 보이면(icon, awesome, material 등) 굽는다.
//
// 반환값 { baked, skipped, fonts }
//   baked  = 이미지로 구운 아이콘 수
//   fonts  = 발견된 아이콘 글꼴 이름과 개수
//   baked가 0이면 이 사이트엔 아이콘 폰트가 없는 것이니 그냥 다음 단계로 넘어가면 된다.
//
// 한계: content가 글자(ligature)인 일부 아이콘 폰트(예: 일부 Material Icons 설정)는 못 가려낼 수 있다.
//       그런 경우 빠진 아이콘은 B 방식(스크린샷)으로 보완한다.

async () => {
  if (location.href === 'about:blank') return { reset: true, url: location.href };
  try { await document.fonts.ready; } catch {}

  const dpr = Math.max(2, window.devicePixelRatio || 1);
  const strip = (s) => (s || '').replace(/^["']|["']$/g, '');
  const looksIcon = (ff) => /icon|fontello|material|glyph|fa-|awesome|feather|ionicon/i.test(ff);

  // 구운 아이콘의 원래 글자는 숨긴다 (Figma에서 네모로 안 나오게)
  if (!document.getElementById('__baked_icon_style')) {
    const style = document.createElement('style');
    style.id = '__baked_icon_style';
    style.textContent = '[data-baked-icon]::before,[data-baked-icon]::after{content:""!important;display:none!important}';
    document.head.appendChild(style);
  }

  const fonts = {};
  let baked = 0, skipped = 0;

  const bake = (el, pseudo) => {
    if (el.querySelector('img[data-baked="1"]')) return; // 이미 구운 요소는 건너뜀
    const cs = getComputedStyle(el, pseudo);
    const raw = cs.content;
    if (!raw || raw === 'none' || raw === 'normal') return;
    const ch = strip(raw);
    if (!ch) return;
    const cp = ch.codePointAt(0);
    const ff = cs.fontFamily || '';
    const isIcon = (cp >= 0xe000 && cp <= 0xf8ff) || looksIcon(ff);
    if (!isIcon) return;

    const size = parseFloat(cs.fontSize) || 24;
    const weight = cs.fontWeight || '400';
    const color = cs.color || '#000';
    const font = `${weight} ${size}px ${ff}`;

    // 글자 크기 측정 → 캔버스 크기 결정
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font;
    const m = probe.measureText(ch);
    const w = Math.ceil(Math.max(m.width || size, size));
    const ascent = m.actualBoundingBoxAscent || size * 0.8;
    const descent = m.actualBoundingBoxDescent || size * 0.2;
    const h = Math.ceil(Math.max(ascent + descent, size));

    // 선명하게 굽기 위해 devicePixelRatio만큼 확대해서 그린다
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * dpr));
    cv.height = Math.max(1, Math.ceil(h * dpr));
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, w / 2, h / 2);

    let url;
    try { url = cv.toDataURL('image/png'); } catch (e) { skipped++; return; }

    el.setAttribute('data-baked-icon', '');
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'icon';
    img.setAttribute('data-baked', '1');
    img.style.width = w + 'px';
    img.style.height = h + 'px';
    img.style.display = 'inline-block';
    img.style.verticalAlign = 'middle';
    if (pseudo === '::before') el.insertBefore(img, el.firstChild);
    else el.appendChild(img);

    fonts[ff] = (fonts[ff] || 0) + 1;
    baked++;
  };

  for (const el of document.querySelectorAll('*')) { bake(el, '::before'); bake(el, '::after'); }
  await new Promise((r) => setTimeout(r, 500));

  return { baked, skipped, fonts };
}
