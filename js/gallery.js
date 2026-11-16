// 详解页截图：每段一组 figure。有 JS 时一张大图 + 一列标签（缩略图 + 图注）切换，点大图放大看 2 倍图；
// 没有 JS 时 figure 照常排开、图注都在，点图直接打开 2 倍图。只动 transform / opacity
(function () {
  var en = document.documentElement.lang === 'en';
  var T = en ? { shots: ' screenshots', prev: 'Previous', next: 'Next', close: 'Close', box: 'Screenshot viewer' }
             : { shots: ' 截图', prev: '上一张', next: '下一张', close: '关闭', box: '截图放大' };
  var ease = 'cubic-bezier(.16, 1, .3, 1)';

  document.querySelectorAll('.detail').forEach(function (sec) {
    var items = [].slice.call(sec.querySelectorAll('.g-item'));
    if (!items.length) return;
    var cur = 0, tabs = [];
    function show(i, dir) {
      if (i === cur && items[i].classList.contains('is-on')) return;
      var old = items[cur];
      if (old && old !== items[i] && old.classList.contains('is-on')) {
        old.classList.remove('is-on'); old.classList.add('is-out'); old.setAttribute('aria-hidden', 'true'); old.inert = true;
        old.style.setProperty('--gd', -dir);
        setTimeout(function () { if (!old.classList.contains('is-on')) old.classList.remove('is-out'); }, 420);
      }
      cur = i;
      var f = items[i];
      f.classList.remove('is-out'); f.style.setProperty('--gd', dir || 0); f.classList.add('is-on');
      f.removeAttribute('aria-hidden'); f.inert = false;
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
    }
    sec.gShow = show;
    items.forEach(function (f, i) {
      f.querySelector('.g-zoom').addEventListener('click', function (e) {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // 新标签打开照浏览器默认
        e.preventDefault(); open(sec, items, i);
      });
    });
    if (items.length < 2) return;

    // 标签：图注挪进标签里，和缩略图一起；方向键切换（自动激活），Home / End 到头尾
    var list = document.createElement('div');
    list.className = 'g-tabs'; list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', sec.querySelector('h2').textContent + T.shots);
    list.style.setProperty('--n', items.length);
    items.forEach(function (f, i) {
      var b = document.createElement('button'), im = new Image(), s = document.createElement('span');
      b.type = 'button'; b.className = 'g-tab'; b.setAttribute('role', 'tab');
      b.id = sec.id + '-tab-' + i; f.id = sec.id + '-shot-' + i;
      b.setAttribute('aria-controls', f.id); f.setAttribute('role', 'tabpanel'); f.setAttribute('aria-labelledby', b.id);
      im.className = 'g-thumb'; im.alt = ''; im.width = 112; im.height = 76; im.loading = 'lazy'; im.src = f.dataset.thumb;
      s.textContent = f.querySelector('figcaption').textContent;
      b.appendChild(im); b.appendChild(s); list.appendChild(b); tabs.push(b);
      b.addEventListener('click', function () { show(i, i > cur ? 1 : -1); });
      // 指上去或聚焦就先把大图要来，点下去时多半已经到了
      var warm = function () { var w = new Image(); w.src = f.querySelector('.shot').currentSrc || f.querySelector('.shot').src; };
      b.addEventListener('pointerenter', warm, { once: true }); b.addEventListener('focus', warm, { once: true });
      if (i) { f.setAttribute('aria-hidden', 'true'); f.inert = true; }
    });
    list.addEventListener('keydown', function (e) {
      var n = items.length, k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      var to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : k ? (cur + k + n) % n : -1;
      if (to < 0) return;
      e.preventDefault(); show(to, k || (to > cur ? 1 : -1)); tabs[to].focus();
    });
    sec.appendChild(list);
    sec.classList.add('is-tabbed');
    show(0, 0);
  });

  // —— 放大层：<dialog> 自带焦点圈定和 Esc；从页面上那张图的位置放大出来，关的时候缩回去 ——
  var box, img, cap, count, prevB, nextB, at = null;
  function build() {
    box = document.createElement('dialog');
    box.className = 'lb'; box.setAttribute('aria-label', T.box);
    box.innerHTML =
      '<figure class="lb-fig"><img class="lb-img" alt="" width="1120" height="760"><figcaption><span class="lb-cap"></span><span class="lb-count"></span></figcaption></figure>' +
      '<button type="button" class="lb-btn lb-prev"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg></button>' +
      '<button type="button" class="lb-btn lb-next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg></button>' +
      '<button type="button" class="lb-btn lb-close" autofocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11m0-11-11 11"/></svg></button>';
    img = box.querySelector('.lb-img'); cap = box.querySelector('.lb-cap'); count = box.querySelector('.lb-count');
    prevB = box.querySelector('.lb-prev'); nextB = box.querySelector('.lb-next');
    prevB.setAttribute('aria-label', T.prev); nextB.setAttribute('aria-label', T.next);
    box.querySelector('.lb-close').setAttribute('aria-label', T.close);
    prevB.onclick = function () { step(-1); }; nextB.onclick = function () { step(1); };
    box.querySelector('.lb-close').onclick = shut;
    box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lb-fig')) shut(); });  // 点图外空白处关
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    box.addEventListener('cancel', function (e) { e.preventDefault(); shut(); });  // Esc 也走缩回去的动画
    box.addEventListener('close', function () { box.classList.remove('is-closing'); document.documentElement.classList.remove('lb-open'); });
    document.body.appendChild(box);
  }
  function load(i) {
    var f = at.items[i], s = f.querySelector('.shot'), hi = new Image(), want = f.querySelector('.g-zoom').href;
    at.i = i;
    img.src = s.currentSrc || s.src; img.alt = s.alt;  // 先放页面上已有的那张，2 倍图到了再换
    hi.src = want;
    (hi.decode ? hi.decode() : Promise.resolve()).then(function () { if (at && at.items[at.i] === f) img.src = want; }, function () {});  // 先在后台解码好再换，换的那一帧不卡
    cap.textContent = f.querySelector('figcaption').textContent;
    var many = at.items.length > 1;
    count.textContent = many ? (i + 1) + ' / ' + at.items.length : '';
    prevB.hidden = nextB.hidden = !many;
  }
  function from(i) {  // 页面上对应那张图的位置，算出放大层里的图要从哪里、缩成多大开始
    var s = at.items[i].querySelector('.shot').getBoundingClientRect(), r = img.getBoundingClientRect();
    if (!s.width || !r.width) return null;
    return 'translate(' + (s.left + s.width / 2 - r.left - r.width / 2) + 'px,' + (s.top + s.height / 2 - r.top - r.height / 2) + 'px) scale(' + s.width / r.width + ')';
  }
  function open(sec, items, i) {
    if (!box) build();
    at = { sec: sec, items: items, i: i };
    load(i);
    box.classList.remove('is-closing');
    box.showModal();
    document.documentElement.classList.add('lb-open');
    var t = from(i);
    if (t) img.animate([{ transform: t }, { transform: 'none' }], { duration: 560, easing: ease });
  }
  function step(d) {
    if (!at || at.items.length < 2) return;
    var n = at.items.length, i = (at.i + d + n) % n;
    load(i);
    if (at.sec.gShow) at.sec.gShow(i, d);  // 页面上的标签跟着换，关掉时缩回到对的那张
    img.animate([{ opacity: .2, transform: 'translateX(' + d * 36 + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: ease });
  }
  function shut() {
    if (!box.open || box.classList.contains('is-closing')) return;
    box.classList.add('is-closing');
    var t = from(at.i), done = function () { box.close(); img.getAnimations().forEach(function (a) { a.cancel(); }); };
    if (t) img.animate([{ transform: 'none' }, { transform: t }], { duration: 380, easing: ease, fill: 'forwards' }).onfinish = done;
    else done();
  }
})();
