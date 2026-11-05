/* Keep portfolio videos as normal links until a visitor asks to play one. */
(function () {
  'use strict';
  document.querySelectorAll('a[data-video-id]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var id = link.getAttribute('data-video-id');
      if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
      var player = link.closest('.hire-player, .vph-th');
      if (!player) return;
      event.preventDefault();
      if (player.tagName === 'A') {
        var container = document.createElement('div');
        container.className = player.className;
        player.replaceWith(container);
        player = container;
      }
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.title = link.getAttribute('data-video-title') || 'ZeeKay Editz video editing sample';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(frame);
      frame.focus();
    });
  });
})();
