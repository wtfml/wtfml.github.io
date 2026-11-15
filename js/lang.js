// 语言切换：记住选择（读写失败就当没选过），带上锚点跳到另一语言的同一页
document.querySelectorAll('[data-lang]').forEach(function (a) {
  a.addEventListener('click', function () {
    try { localStorage.setItem('wtfml-lang', a.dataset.lang); } catch (e) {}
    a.href = a.href.split('#')[0] + location.hash;
  });
});
