// 动效（两页共用）：各段滚进视口时分层浮现；站内换页时内容上移淡出；首页到底继续下滑（底部加深、箭头淡尽）进功能详解
// 标记类（js-motion / js-reveal / is-ready / is-arriving / is-loaded）由页头内联脚本加，这里只管滚动和换页
(function () {
  var root = document.documentElement;
  window.wtfmlMotion = 1;  // 告诉页头脚本这里跑起来了，滚动浮现的隐藏态可以留着

  // 1. 浮现：首屏入场开始后才开始看；同一批进来的段落按顺序错开（--i），首批让出页头一拍
  if (root.classList.contains('js-reveal')) {
    if (!('IntersectionObserver' in window)) root.classList.remove('js-reveal');
    else {
      var first = true;
      var io = new IntersectionObserver(function (es) {
        var n = first ? 1 : 0; first = false;
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.style.setProperty('--i', Math.min(n++, 4));
          e.target.classList.add('is-in'); io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      var start = function () { document.querySelectorAll('main > section, main > .quote, .next-page').forEach(function (el) { io.observe(el); }); };
      if (root.classList.contains('is-ready')) start(); else document.addEventListener('wtfml-ready', start);
    }
  }

  // 2. 站内换页（导航、了解更多、中 / EN、继续下滑）：内容上移淡出，500ms 后跳转；新页内容从下方升上来（样式见 site.css）
  var going = false;
  function go(href, how) {
    if (going) return;
    going = true;
    try { sessionStorage.setItem('wtfml-enter', how || '1'); } catch (e) {}
    root.classList.add('is-leaving');
    setTimeout(function () { location.href = href; }, how ? 160 : 500);  // 继续下滑过来时内容早已淡尽、下一页页头已清晰，稍停就走
  }
  // 冒泡到 document 才处理，lang.js 挂在链接上的监听先跑完（记住语言、带上锚点）
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;  // 新标签打开照浏览器默认
    if (a.origin !== location.origin || (a.pathname === location.pathname && a.search === location.search)) return;  // 外链、同页锚点不拦
    e.preventDefault(); go(a.href);
  });

  // 3. 到底继续下滑：滚动量累加成 --p，约半屏（最多 420px）蓄满。不画进度条：本页内容随 --p 上移淡去，
  //    功能详解的页头（同一套类名排在同一个位置）由虚到实淡入；全清晰时跳过去，新页页头不再入场，接得上。
  //    停手 0.6 秒后约 1 秒退回；往上滚清零
  var hint = document.querySelector('[data-next]');
  var p = 0, last = 0, raf = 0, prev = 0, pulled;
  function set(v) {
    p = Math.max(0, Math.min(1, v));
    // --p 不继承（见 site.css @property），只写在用到它的几块上：写在根上每帧要重算整页样式，点提示推满时掉到 40fps
    (pulled = pulled || document.querySelectorAll('body > :is(header, main, .next-page, footer), .next-ghost, .next-shade, .next-arrow')).forEach(function (el) { el.style.setProperty('--p', p.toFixed(3)); });
    root.classList.toggle('is-pulling', p > 0);
    if (p >= 1) go(hint.href, 'next');
  }
  // 后退回来（含 bfcache 恢复）时撤掉离场和蓄力
  addEventListener('pageshow', function () {
    going = false; root.classList.remove('is-leaving'); set(0);
  });
  if (!hint) return;

  // 下一页页头的影子：复制本页顶栏，「功能」标成当前页，下面一行功能详解的标题；只看不点，不进读屏
  var bar = document.querySelector('.topbar');
  if (bar) {
    var ghost = document.createElement('div'), head = document.createElement('header'), intro = document.createElement('div'), h1 = document.createElement('h1');
    ghost.className = 'next-ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
    head.className = 'page-head'; intro.className = 'wrap page-intro'; h1.textContent = hint.dataset.next;
    var copy = bar.cloneNode(true), cur = copy.querySelector('a[href="features.html"]');
    if (cur) cur.setAttribute('aria-current', 'page');
    intro.appendChild(h1); head.appendChild(copy); head.appendChild(intro); ghost.appendChild(head);
    var shade = document.createElement('div'); shade.className = 'next-shade';  // 底部加深
    document.body.appendChild(shade); document.body.appendChild(ghost);
  }
  // 点提示也走同一段：约 0.45 秒把 --p 推满
  hint.addEventListener('click', function (e) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // 新标签打开照浏览器默认
    e.preventDefault();
    var from = p, t0 = performance.now();
    (function step(t) {
      if (going) return;
      var k = Math.min(1, (t - t0) / 450); last = prev = t;
      set(from + (1 - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  });

  function atBottom() { return Math.ceil(scrollY + innerHeight) >= root.scrollHeight - 2; }
  function decay(t) {
    raf = 0;
    if (going || p <= 0) return;
    if (t - last > 600) set(p - (t - prev) / 1000);
    prev = t;
    raf = requestAnimationFrame(decay);
  }
  var armed = false, lastEv = 0;
  function add(dy) {
    if (going) return;
    var now = performance.now(), gap = now - lastEv; lastEv = now;
    if (dy < 0) { set(0); return; }
    if (!atBottom()) { armed = false; return; }  // 不在底部的滚动一概不算，正常浏览不会误触
    if (!armed) { if (gap < 200) return; armed = true; }  // 滚到底的那一下（含触控板惯性）不算，停一下再往下滑才蓄力
    last = prev = now;
    set(p + dy / Math.min(innerHeight * .5, 420));
    if (!raf && !going) raf = requestAnimationFrame(decay);
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
})();
