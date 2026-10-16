// Keep reaction embeds optional and respect the reader's motion preference.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.mask-gif').forEach(figure => {
    const frame = figure.querySelector('iframe');
    const button = figure.querySelector('button');
    const message = figure.querySelector('.mask-gif-stopped');
    const source = frame.src;
    const title = frame.title;
    const setPlaying = playing => {
      frame.hidden = !playing;
      message.hidden = playing;
      if (playing) {
        if (frame.src !== source) frame.src = source;
      } else {
        frame.removeAttribute('src');
      }
      button.textContent = playing ? 'Hide GIF' : 'Play GIF';
      button.setAttribute('aria-label', `${playing ? 'Hide' : 'Play'} ${title}`);
    };
    if (reducedMotion.matches) setPlaying(false);
    button.addEventListener('click', () => setPlaying(frame.hidden));
    reducedMotion.addEventListener('change', event => {
      if (event.matches) setPlaying(false);
    });
  });
})();
