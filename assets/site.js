// 咩了脱敏（Baafold）官网 v4 —— 少量交互。系统判断和“允许动效”在 <head> 里内联（data-os、html.anim）。
// 规则：交互规范 193:2 / 194:2；没有任何跟随鼠标的效果；减少动态效果时不播入场动效、视频不自动播放。
(function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = function () { return window.matchMedia("(max-width: 767px)").matches; };

  // 弹窗：Esc、点空白处、× 都能关；关闭后焦点回到打开它的按钮（<dialog> 自带）
  function bindDialog(dlg, onClose) {
    dlg.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) { dlg.close(); return; }
      if (e.target !== dlg) return;
      // 演示弹窗铺满全屏，点到它本身就是点在空白处；二维码弹窗点在框外（遮罩）才关
      var r = dlg.getBoundingClientRect();
      var outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (dlg.classList.contains("demo") || outside) dlg.close();
    });
    if (onClose) dlg.addEventListener("close", onClose);
  }

  // ---------------------------------------------------------------- 下载 / 问作者：先弹微信二维码
  var qr = $("#qr");
  if (qr && qr.showModal) {
    var note = $("[data-qr-note]", qr), noteDefault = note.textContent;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-qr]");
      if (!a) return;
      e.preventDefault();
      note.textContent = a.getAttribute("data-qr-note") || noteDefault;
      if ($("#demo") && $("#demo").open) $("#demo").close();
      qr.showModal();
    });
    bindDialog(qr);
  }

  // ---------------------------------------------------------------- 顶栏：在顶部透明；滚动后跟随正在它下面的区块（.ink 或 data-nav="dark" 为墨蓝，其余为浅色）
  var bar = $("[data-topbar]"), barOpen = false, setBar = function () {};
  if (bar) {
    var blocks = $$('main > section, main.doc-page, body > footer, [data-nav]');
    var under = null, seen = [];
    var toneOf = function (el) { return el.classList.contains("ink") || el.getAttribute("data-nav") === "dark" ? "dark" : "light"; };
    // 同一条中线上有嵌套的区块时取最里面那个
    var innermost = function (list) {
      return list.filter(function (a) { return !list.some(function (b) { return b !== a && a.contains(b); }); }).pop() || null;
    };
    var pick = function () { // 没有 IntersectionObserver 时按位置算
      var y = bar.offsetHeight / 2;
      return innermost(blocks.filter(function (b) { var r = b.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
    };
    setBar = function () {
      if (!window.IntersectionObserver) under = pick() || under;
      bar.classList.toggle("is-top", window.scrollY < 8 && !barOpen);
      bar.classList.toggle("is-open", barOpen);
      if (barOpen) bar.setAttribute("data-tone", "dark");
      else if (under) bar.setAttribute("data-tone", toneOf(under));
    };
    var io = null;
    var watch = function () {
      if (!window.IntersectionObserver) return;
      if (io) io.disconnect();
      seen = [];
      var mid = Math.round(bar.offsetHeight / 2);
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var i = seen.indexOf(e.target);
          if (e.isIntersecting && i < 0) seen.push(e.target);
          if (!e.isIntersecting && i >= 0) seen.splice(i, 1);
        });
        under = innermost(blocks.filter(function (b) { return seen.indexOf(b) >= 0; })) || under;
        setBar();
      }, { rootMargin: -mid + "px 0px " + -(window.innerHeight - mid - 1) + "px 0px" });
      blocks.forEach(function (b) { io.observe(b); });
    };
    under = pick();
    watch();
    setBar();
    window.addEventListener("scroll", setBar, { passive: true });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(watch, 150); });
  }

  // ---------------------------------------------------------------- 手机顶栏菜单（展开时顶栏和菜单统一实心墨蓝，不跟随区块）
  var menuBtn = $("[data-menu]"), menu = $("#m-menu");
  if (menuBtn && menu) {
    var setMenu = function (open) {
      barOpen = open;
      setBar();
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    };
    menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
    window.addEventListener("resize", function () { if (!mobile()) setMenu(false); });
  }

  // ---------------------------------------------------------------- 分段控件（手机：价格卡、会员卡）：左右方向键切换
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.classList.toggle("is-on", on);
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });

  // ---------------------------------------------------------------- 创始价倒计时：北京时间 2026-12-31 24:00，人人同一个截止时间；过期整块隐藏
  var dl = $("[data-deadline]");
  if (dl) {
    var end = new Date(dl.getAttribute("data-deadline")).getTime();
    var clocks = $$("[data-clock]");
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    var tick = function () {
      var left = end - Date.now();
      if (!(left > 0)) { document.documentElement.classList.add("is-over"); return false; }
      var s = Math.floor(left / 1000);
      var v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
      clocks.forEach(function (c) {
        $("[data-d]", c).textContent = String(v.d);
        $("[data-h]", c).textContent = pad(v.h);
        $("[data-m]", c).textContent = pad(v.m);
        $("[data-s]", c).textContent = pad(v.s);
      });
      return true;
    };
    if (tick()) { var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000); }
  }

  // ---------------------------------------------------------------- 手机长列表：只露前几项，“展开全部 N 项”
  $$("[data-more-btn]").forEach(function (btn) {
    var wrap = btn.closest("[data-more-wrap]") || btn.previousElementSibling;
    btn.addEventListener("click", function () {
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      var first = $("[data-more] .more__in > *", wrap);
      if (first) { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
    });
  });

  // ---------------------------------------------------------------- 首页入场动效：进视口播一次（html.anim 只在允许动效时存在）
  if (document.documentElement.classList.contains("anim")) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.35, rootMargin: "0px 0px -10% 0px" });
    $$("[data-anim]").forEach(function (el) { io.observe(el); });
  }

  // ---------------------------------------------------------------- 看演示（自己服务器上的视频，自己的控件）
  var demo = $("#demo");
  if (demo && demo.showModal) {
    var video = $("[data-video]", demo), vc = $("[data-vc]", demo), seek = $("[data-vc-seek]", demo);
    var sound = $("[data-sound]", demo);
    var fmt = function (t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); };
    var sync = function () {
      vc.classList.toggle("is-paused", video.paused);
      vc.classList.toggle("is-muted", video.muted);
      $("[data-vc-play]", demo).setAttribute("aria-label", video.paused ? "播放" : "暂停");
      $("[data-vc-mute]", demo).setAttribute("aria-label", video.muted ? "打开声音" : "静音");
      sound.hidden = !(video.muted && !video.paused);
    };
    video.addEventListener("loadedmetadata", function () { $("[data-vc-dur]", demo).textContent = fmt(video.duration); });
    video.addEventListener("timeupdate", function () {
      $("[data-vc-cur]", demo).textContent = fmt(video.currentTime);
      var p = video.duration ? video.currentTime / video.duration : 0;
      seek.value = String(Math.round(p * 1000));
      seek.style.setProperty("--p", (p * 100).toFixed(2) + "%");
    });
    ["play", "pause", "volumechange"].forEach(function (ev) { video.addEventListener(ev, sync); });
    seek.addEventListener("input", function () { if (video.duration) video.currentTime = seek.value / 1000 * video.duration; });
    $("[data-vc-play]", demo).addEventListener("click", function () { video.paused ? video.play() : video.pause(); });
    video.addEventListener("click", function () { video.paused ? video.play() : video.pause(); });
    var unmute = function () { video.muted = false; if (video.paused) video.play(); };
    $("[data-vc-mute]", demo).addEventListener("click", function () { video.muted ? unmute() : (video.muted = true); });
    sound.addEventListener("click", unmute);
    $("[data-vc-full]", demo).addEventListener("click", function () {
      var st = $(".demo__stage", demo);
      if (document.fullscreenElement) document.exitFullscreen();
      else if (st.requestFullscreen) st.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-demo]")) return;
      demo.showModal();
      video.muted = true;
      video.preload = "auto";
      // 默认静音自动播放、点一下出声；减少动态效果时不自动播放
      if (!reduce) { var p = video.play(); if (p && p.catch) p.catch(sync); }
      sync();
    });
    bindDialog(demo, function () { video.pause(); });
  }

  // ---------------------------------------------------------------- 教程视频：先只显示封面和播放钮，点了才加载 B 站播放器
  var player = $("[data-player]");
  var loadPlayer = function (t) {
    if (!player) return false;
    var bv = player.getAttribute("data-bv");
    var stage = $(".player__stage", player);
    if (!bv) { $("[data-player-msg]", player).hidden = false; return false; }
    var src = "https://player.bilibili.com/player.html?bvid=" + encodeURIComponent(bv) + "&autoplay=1&high_quality=1&danmaku=0" + (t ? "&t=" + t : "");
    var old = $("iframe", stage);
    if (old) { old.src = src; return true; }
    $("[data-play]", player).classList.add("is-loading");
    var f = document.createElement("iframe");
    f.src = src;
    f.title = "B 站播放器";
    f.allow = "autoplay; fullscreen; picture-in-picture";
    f.allowFullscreen = true;
    f.referrerPolicy = "no-referrer";
    f.addEventListener("load", function () { $(".cover", stage).remove(); $("[data-play]", player).remove(); });
    stage.appendChild(f);
    return true;
  };
  if (player) $("[data-play]", player).addEventListener("click", function () { loadPlayer(0); });
  $$("[data-seek]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      $$(".chap").forEach(function (c) { c.classList.toggle("is-on", c.getAttribute("data-seek") === el.getAttribute("data-seek")); });
      if (loadPlayer(Number(el.getAttribute("data-seek"))) && player) player.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      else if (el.classList.contains("chap")) {
        var step = document.getElementById(el.getAttribute("data-step"));
        if (step) { step.open = true; step.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
      }
    });
  });
  var firstChap = $(".chap");
  if (firstChap) firstChap.classList.add("is-on");

  // ---------------------------------------------------------------- 文章页 / 隐私说明：手机上折叠（一次只展开一步），电脑上全部展开
  var folds = $$(".step, .sec");
  if (folds.length) {
    var applyFold = function () {
      var m = mobile();
      folds.forEach(function (d, i) { d.open = !m || i === (d.classList.contains("step") ? 1 : 0); });
    };
    applyFold();
    var wasMobile = mobile();
    window.addEventListener("resize", function () { if (mobile() !== wasMobile) { wasMobile = mobile(); applyFold(); } });
    folds.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!mobile() || !d.open || !d.classList.contains("step")) return;
        folds.forEach(function (o) { if (o !== d && o.classList.contains("step")) o.open = false; });
      });
    });
    $$("summary", document).forEach(function (s) {
      s.addEventListener("click", function (e) { if (!mobile() && s.parentElement.matches(".step, .sec")) e.preventDefault(); });
    });
  }

  // ---------------------------------------------------------------- 手机目录抽屉
  var tocBtn = $("[data-toc]");
  if (tocBtn) {
    var wrap = tocBtn.parentElement;
    var setToc = function (open) { wrap.classList.toggle("is-open", open); tocBtn.setAttribute("aria-expanded", open ? "true" : "false"); };
    tocBtn.addEventListener("click", function () { setToc(!wrap.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && wrap.classList.contains("is-open")) { setToc(false); tocBtn.focus(); } });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) setToc(false); });
  }

  // ---------------------------------------------------------------- “本页”高亮当前一节
  var onpage = $("[data-onpage]");
  if (onpage && "IntersectionObserver" in window) {
    var links = $$("a", onpage);
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var mark = function (id) { links.forEach(function (a) { if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }); };
    var seen = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen[en.target.id] = en.isIntersecting; });
      var cur = targets.filter(function (t) { return t && seen[t.id]; })[0];
      if (cur) mark(cur.id);
    }, { rootMargin: "-80px 0px -55% 0px" });
    targets.forEach(function (t) { if (t) spy.observe(t); });
    mark(targets[0] && targets[0].id);
  }
})();
