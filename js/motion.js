// 首页动效：各段滚进视口时浮现一次；到底后继续下滑蓄满圆环，磨砂淡出进功能详解页
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. 浮现：隐藏态只在这里加上 js-reveal 后才生效，JS 失效时内容照常可见
  var items = document.querySelectorAll('.hero ~ main > .feature, .hero ~ main > .quote');
  if (items.length && !reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-reveal');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  // 2. 到底继续下滑：滚动量累加到圆环上，约 1.2 屏蓄满；停手 0.6 秒后约 1 秒退回；往上滚清零
  var hint = document.querySelector('[data-next]');
  if (!hint) return;
  var p = 0, last = 0, raf = 0, going = false, prev = 0;
  var veil = document.createElement('div');
  veil.className = 'leave-veil'; veil.setAttribute('aria-hidden', 'true');
  document.body.appendChild(veil);

  function atBottom() { return Math.ceil(scrollY + innerHeight) >= root.scrollHeight - 2; }
  function set(v) {
    p = Math.max(0, Math.min(1, v));
    hint.style.setProperty('--p', p.toFixed(3));
    if (p >= 1) go();
  }
  function decay(t) {
    raf = 0;
    if (going || p <= 0) return;
    if (t - last > 600) set(p - (t - prev) / 1000);
    prev = t;
    raf = requestAnimationFrame(decay);
  }
  function add(dy) {
    if (going) return;
    if (dy < 0) { set(0); return; }
    if (!atBottom()) return;  // 不在底部的滚动一概不算，正常浏览不会误触
    last = prev = performance.now();
    set(p + dy / (innerHeight * 1.2));
    if (!raf && !going) raf = requestAnimationFrame(decay);
  }
  function go() {
    if (going) return;
    going = true;
    try { sessionStorage.setItem('wtfml-enter', '1'); } catch (e) {}
    if (reduce) { location.href = hint.href; return; }
    root.classList.add('is-leaving');
    setTimeout(function () { location.href = hint.href; }, 500);
  }

  addEventListener('wheel', function (e) {
    add(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1));
  }, { passive: true });
  var ty = null;
  addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', function (e) {
    if (ty === null) return;
    var y = e.touches[0].clientY; add(ty - y); ty = y;
  }, { passive: true });
  hint.addEventListener('click', function (e) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // 新标签打开照浏览器默认
    e.preventDefault(); go();
  });
  // 后退回来（含 bfcache 恢复）时撤掉模糊和蓄力
  addEventListener('pageshow', function () {
    going = false; root.classList.remove('is-leaving'); set(0);
  });
})();
