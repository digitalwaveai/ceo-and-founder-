const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav');

if (burger && nav) {
  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    });
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));


const buyPackageButtons = document.querySelectorAll('.buy-package');

buyPackageButtons.forEach((button) => {
  button.addEventListener('click', async () => {
    const packageName = button.dataset.package || 'выбранный пакет';
    const message = `Здравствуйте. Хочу купить ${packageName}`;

    try {
      await navigator.clipboard.writeText(message);
    } catch (error) {
      // Если браузер не разрешил копирование, ссылка всё равно откроет Telegram.
    }
  });
});

const introSection = document.querySelector('#intro');
const heroSection = document.querySelector('#hero');
const introAudio = document.querySelector('#intro-audio');
const introSoundHint = document.querySelector('.intro-sound-hint');
const introSoundButton = document.querySelector('.intro-sound-button');
const INTRO_AUDIO_START = 50;
const INTRO_AUDIO_END = 64;

if (introSection && heroSection && !window.location.hash && window.scrollY < 20) {
  document.body.classList.add('intro-active');

  let introIsLeaving = false;
  let audioStarted = false;
  let introAudioEnding = false;
  let audioFadeInterval = null;

  const fadeAudioIn = (targetVolume = 0.55, duration = 1400) => {
    if (!introAudio) return;

    window.clearInterval(audioFadeInterval);

    const startTime = performance.now();
    introAudio.volume = 0;

    audioFadeInterval = window.setInterval(() => {
      const progress = Math.min((performance.now() - startTime) / duration, 1);
      introAudio.volume = targetVolume * progress;

      if (progress >= 1) {
        window.clearInterval(audioFadeInterval);
      }
    }, 50);
  };

  const fadeAudioOut = (duration = 1900) => {
    if (!introAudio || introAudioEnding) return;
    introAudioEnding = true;

    window.clearInterval(audioFadeInterval);

    const startVolume = introAudio.volume || 0;
    const startTime = performance.now();

    audioFadeInterval = window.setInterval(() => {
      const progress = Math.min((performance.now() - startTime) / duration, 1);
      introAudio.volume = Math.max(startVolume * (1 - progress), 0);

      if (progress >= 1) {
        window.clearInterval(audioFadeInterval);
        introAudio.pause();
      }
    }, 50);
  };

  const hideSoundFallback = () => {
    if (introSoundHint) introSoundHint.classList.remove('visible');
    if (introSoundButton) introSoundButton.classList.remove('visible');
  };

  const showSoundFallback = () => {
    if (introSoundHint) introSoundHint.classList.add('visible');
    if (introSoundButton) introSoundButton.classList.add('visible');
  };

  const startMutedAutoplay = async () => {
    if (!introAudio) return false;

    try {
      introAudio.volume = 0;
      introAudio.muted = true;
      introAudio.currentTime = INTRO_AUDIO_START;
      await introAudio.play();
      return true;
    } catch (error) {
      return false;
    }
  };

  const tryUnmuteAutoplay = async () => {
    if (!introAudio || audioStarted) return true;

    try {
      // Попытка: сначала запускаем трек в разрешённом muted autoplay,
      // затем пробуем снять mute и плавно поднять громкость.
      if (introAudio.paused) {
        await startMutedAutoplay();
      }

      introAudio.muted = false;
      if (introAudio.currentTime < INTRO_AUDIO_START) {
        introAudio.currentTime = INTRO_AUDIO_START;
      }
      await introAudio.play();

      audioStarted = true;
      hideSoundFallback();
      fadeAudioIn(0.55, 1400);
      return true;
    } catch (error) {
      showSoundFallback();
      return false;
    }
  };

  const unlockSoundByUser = async () => {
    if (!introAudio || audioStarted) return;

    try {
      introAudio.muted = false;

      if (introAudio.currentTime < INTRO_AUDIO_START) {
        introAudio.currentTime = INTRO_AUDIO_START;
      }

      if (introAudio.paused) {
        introAudio.currentTime = INTRO_AUDIO_START;
        await introAudio.play();
      }

      audioStarted = true;
      hideSoundFallback();
      fadeAudioIn(0.55, 900);
    } catch (error) {
      showSoundFallback();
    }
  };

  const skipIntro = () => {
    if (introIsLeaving) return;
    introIsLeaving = true;

    document.body.classList.add('intro-leaving');
    fadeAudioOut(1900);

    window.setTimeout(() => {
      document.body.classList.remove('intro-active');
      heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      window.setTimeout(() => {
        document.body.classList.remove('intro-leaving');
      }, 1000);
    }, 700);
  };

  // 1) Сразу запускаем песню в muted-режиме, это обычно разрешают браузеры.
  startMutedAutoplay();

  // 2) Почти сразу пробуем снять mute и включить звук, чтобы музыка начиналась с первых секунд интро.
  const startAudioTimeout = window.setTimeout(tryUnmuteAutoplay, 120);

  const retryImmediateAudio = () => {
    if (!audioStarted && !introIsLeaving) {
      window.setTimeout(tryUnmuteAutoplay, 350);
      window.setTimeout(tryUnmuteAutoplay, 900);
    }
  };

  document.addEventListener('visibilitychange', retryImmediateAudio, { once: true });
  window.addEventListener('load', retryImmediateAudio, { once: true });

  // 3) Если браузер не даст автозвук — кнопка включит звук, но не перелистнёт экран.
  if (introSoundButton) {
    introSoundButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await unlockSoundByUser();
    });
  }

  introSection.addEventListener('click', async (event) => {
    if (event.target && event.target.closest && event.target.closest('.intro-sound-button')) return;
    if (!audioStarted) {
      await unlockSoundByUser();
    }
  });

  introSection.addEventListener('touchstart', async (event) => {
    if (event.target && event.target.closest && event.target.closest('.intro-sound-button')) return;
    if (!audioStarted) {
      await unlockSoundByUser();
    }
  }, { passive: true });

  const introTimeout = window.setTimeout(skipIntro, 13200);
}
