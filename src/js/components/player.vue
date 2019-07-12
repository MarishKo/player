<template>
  <div class="song">
    <div class="song__container">
      <div class="song__disk">
        <div class="song__svg" ref="svgContainer">
          <svg id="mySVG"></svg>
        </div>

        <div class="song__disk_bg" :class="{'-played': controls.playState}">
          <div class="song__img--wrapp">
            <img class="song__img" :src="song.current.bg" :alt="song.current.title">
          </div>
          <span class="song__time">{{songTime}}</span>
        </div>
      </div>

      <canvas id="song__canvas" class="song__canvas" width="446" height="100"></canvas>

      <div class="song__controls">
        <div class="song__controls_rivets">
          <div class="song__controls_rivets_item song__controls_rivets_item--left"></div>
          <div class="song__controls_rivets_item song__controls_rivets_item--top"></div>
          <div class="song__controls_rivets_item song__controls_rivets_item--right"></div>
          <div class="song__controls_rivets_item song__controls_rivets_item--bottom"></div>
        </div>
        <div class="song__controls--wrapp">
          <button class="song__controls_btn song__controls_btn--prev"
                  @click="onPrevSongClick"
                  type="button">
            <i class="fa fa-fast-backward"></i>
          </button>
          <button class="song__controls_btn song__controls_btn--next"
                  @click="onNextSongClick"
                  type="button">
            <i class="fa fa-fast-forward"></i>
          </button>
          <button class="song__controls_btn song__controls_btn--ab"
                  type="button"
                  :class="{'-active': controls.repeat}"
                  @click="onClickRepeat">
            <i class="fa fa-repeat"></i>
          </button>
          <button class="song__controls_btn song__controls_btn--play"
                  :class="{'-active': controls.playState}"
                  type="button"
                  @click="playOrPauseSong">
            <i v-if="controls.playState" class="fa fa-pause"></i>
            <i v-else class="fa fa-play"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
  const svgNS = "http://www.w3.org/2000/svg";
  const r = 80;
  const circleLength = 2 * Math.PI * r;
  const timelineLength = 160;

  export default {
    name: 'player',
    data() {
      return {
        audio: new Audio(),
        drawVisual: null,
        sourceNode: null,
        songTime: '',
        flags: {
          one: {
            left: 174,
            top: -8,
          },
          two: {
            left: 178,
            top: -8,
          }
        }
      }
    },
    computed: {
      song() {
        return this.$store.state.song;
      },
      controls() {
        return this.$store.state.controls;
      },
    },
    methods: {
      /**
       * Задаем размеры svg с progress-bar
       */
      setSVGParams() {
        let svgContainer = document.getElementById("mySVG");
        if (svgContainer !== null) {
          svgContainer.style.width = `${r * 2 + 4}px`;
          svgContainer.style.height = `${r * 2 + 4}px`;
        }
      },
      /**
       * создаём AudioContext для получения данных о песне, и для визуализации
       */
      initAudioContext() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        this.analyser.smoothingTimeConstant = 0.85;
        this.analyser.fftSize = 256;
        this.jsNode = this.audioCtx.createScriptProcessor(1024, 1, 1);
        this.analyser.connect(this.jsNode);
        this.jsNode.connect(this.audioCtx.destination);
      },
      /**
       * Создаём сам медиа элемент
       */
      createMediaElementSource(audio) {
        this.sourceNode = this.audioCtx.createMediaElementSource(audio);
        this.sourceNode.connect(this.analyser);
        this.sourceNode.connect(this.audioCtx.destination);
      },
      /**
       * Инициализация текущей песни
       */
      initCurrentAudio() {
        new Promise((resolve, reject) => {
          this.audio.src = this.song.current.url;
          this.audio.onloadedmetadata = e => resolve(this.audio);
        }).then(audio => {
          this.$store.commit('setCurrentSong', {duration: audio.duration});

          if (this.sourceNode === null) {
            this.createMediaElementSource(audio);
          }

          this.audio.addEventListener('ended', this.onEndedMusic);
          this.createCircle();
        });
      },
      /**
       * Отрисовка аудио-процесса
       */
      drawAudioProcess() {
        this.audioCtx.resume();
        let bufferLengthAlt = this.analyser.frequencyBinCount,
          dataArrayAlt = new Uint8Array(bufferLengthAlt),
          canvas = document.getElementById('song__canvas'),
          canvasCtx = canvas.getContext("2d");

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        let drawAlt = () => {
          this.drawVisual = requestAnimationFrame(drawAlt);

          this.analyser.getByteFrequencyData(dataArrayAlt);

          canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

          let barWidth = (canvas.width / bufferLengthAlt) * 2.5,
            barHeight,
            x = 0;

          for (let i = 0; i < bufferLengthAlt; i++) {
            barHeight = dataArrayAlt[i];

            let hue = i / this.analyser.frequencyBinCount * 360;
            canvasCtx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
            canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
          }
          this.changePlayingTime();
        };
        drawAlt();
      },
      /**
       * Переключение паузы и проигрывания песни
       */
      playOrPauseSong() {
        if (this.controls.playState) {
          this.pauseSong();
        } else {
          this.playSong();
        }
      },
      /**
       * Проигрывание песни
       */
      playSong() {
        this.audio.play();
        this.createSVGCircle();
        this.drawAudioProcess();
        this.$store.commit('setSongPlayState', true);
      },
      /**
       * Пауза
       */
      pauseSong() {
        this.audio.pause();
        this.stopAndClearSongProcessAnimation();
        this.$store.commit('setSongPlayState', false);
      },
      /**
       * После окончания песни отчищаем анимацию и обновляем состояние
       */
      onEndedMusic() {
        this.$store.commit('setSongPlayState', false);
        this.stopAndClearSongProcessAnimation();
      },
      /**
       * отчищаем процесс и анимацию
       */
      stopAndClearSongProcessAnimation() {
        if (this.drawVisual !== null) {
          window.cancelAnimationFrame(this.drawVisual);
          this.audioCtx.suspend();
        }
      },
      /**
       * создание круга timeline песни
       */
      createCircle() {
        let svgCircle = document.createElementNS(svgNS, "circle");
        svgCircle.setAttributeNS(null, "id", "timecircle");
        svgCircle.setAttributeNS(null, "r", r);
        svgCircle.setAttributeNS(null, "cx", r + 2);
        svgCircle.setAttributeNS(null, "cy", r + 2);
        svgCircle.setAttributeNS(null, "fill", "none");
        svgCircle.setAttributeNS(null, "stroke", "#ffffff");
        svgCircle.setAttributeNS(null, "stroke-width", "2");
        document.getElementById("mySVG").appendChild(svgCircle);
        this.onClickTimeline(svgCircle);
      },
      /**
       * создание круга progress-bar
       */
      createSVGCircle() {
        let myCircleFill = document.createElementNS(svgNS, "path");
        myCircleFill.setAttributeNS(null, "id", "progress-bar");
        myCircleFill.setAttributeNS(null, "cx", r + 2);
        myCircleFill.setAttributeNS(null, "cy", r + 2);
        myCircleFill.setAttributeNS(null, "r", r);
        myCircleFill.setAttributeNS(null, "fill", "none");
        myCircleFill.setAttributeNS(null, "stroke", "#ffffff");
        myCircleFill.setAttributeNS(null, "stroke-width", "5");
        myCircleFill.setAttribute("d", `M ${r + 2},${r + 2} m 0,-${r} a ${r},${r} 0 1 1 0,${r * 2} a ${r},${r} 0 1 1 0,-${r * 2}`);
        myCircleFill.setAttribute('stroke-dashoffset', circleLength);
        myCircleFill.setAttribute('stroke-dasharray', circleLength + ',' + circleLength);
        document.getElementById("mySVG").appendChild(myCircleFill);
        //this.onClickTimeline(myCircleFill);
        this.trackLine = myCircleFill;
        //requestAnimationFrame(() => this.getFill());
      },
      /**
       * заполнение круга progress-bar
       */
      getFill() {
        let currentTime = Number(this.audio.currentTime.toFixed(3)),
          step = currentTime * circleLength / this.audio.duration;
        this.trackLine.setAttribute('stroke-dashoffset', circleLength - step);
        this.changePlayingTime();
        if (currentTime <= this.audio.duration) {
          requestAnimationFrame(() => this.getFill());
        }
      },
      /**
       * изменение времени проигрывания аудио в блоке плеера
       */
      changePlayingTime() {
        let currentTime = this.audio.currentTime,
          minutes = (currentTime / 60) < 10 ? '0' + Math.floor((currentTime / 60)) : Math.floor(currentTime / 60),
          seconds = Math.round(currentTime - (minutes * 60));
        if (seconds < 10) {
          seconds = '0' + seconds;
        }
        this.songTime = `${minutes}:${seconds}`;
      },
      /**
       * клик по timeline
       * @param elem
       */
      onClickTimeline(elem) {
        let _this = this;
        elem.addEventListener('click', (event) => {
          /**
           * (182, 0) -точка отсчета
           * находим длину отрезка
           * @type {number}
           */
          let a = Math.sqrt(Math.pow((r + 2 - event.offsetX), 2) + Math.pow((0 - event.offsetY), 2));
          /**
           * потом находим угол в градусах
           * @type {number}
           */
          let Alpha = Math.acos(((2 * Math.pow(r, 2)) - Math.pow(a, 2)) / (2 * r * r)) * 180 / Math.PI;
          if (event.offsetX < r + 2) {
            Alpha = timelineLength - Alpha;
          }
          /**
           * находим длину дуги
           * @type {number}
           */
          let L = Math.PI * r * Alpha / 180;
          /**
           * вычисляем время проигрывания песни, на которое кликнули
           * @type {number}
           */
          let newTime = L * _this.audio.duration / circleLength;
          if (this.controls.playState) {
            this.audio.currentTime = newTime;
            this.audio.play();
          }
        });
      },
      /**
       * При клике на кнопку повторения отрезка песни
       */
      onClickRepeat() {
        if (this.controls.repeat) {

        } else {

        }
        this.$store.commit('setSongRepeatState', !this.controls.repeat);
      },
      /**
       * Переключение на следующую песню
       */
      onNextSongClick() {
        let currentSongId = this.$store.state.songs.indexOf(this.$store.state.songs.filter(song => song.id === this.song.current.id)[0]);
        if (currentSongId >= 0) {
          this.changeCurrentSong(currentSongId < this.$store.state.songs.length - 1 ? this.$store.state.songs[currentSongId + 1] : this.$store.state.songs[0]);
          this.initCurrentAudio();
          this.playOrPauseSong();
        }
      },
      /**
       * Переключение на предыдущую песню
       */
      onPrevSongClick() {
        let currentSongId = this.$store.state.songs.indexOf(this.$store.state.songs.filter(song => song.id === this.song.current.id)[0]);
        if (currentSongId >= 0) {
          this.changeCurrentSong(currentSongId - 1 < 0 ? this.$store.state.songs[this.$store.state.songs.length - 1] : this.$store.state.songs[currentSongId - 1]);
          this.initCurrentAudio();
          this.playOrPauseSong();
        }
      },
      /**
       * Изменение текущей песни
       * @param song
       */
      changeCurrentSong(song) {
        this.$store.commit('setCurrentSong', song);
        this.initCurrentAudio();
        this.$store.commit('setSongPlayState', !this.controls.playState);
        this.stopAndClearSongProcessAnimation();
      },
    },
    mounted() {
      this.setSVGParams();
      this.initAudioContext();
      this.initCurrentAudio();
    }
  }
</script>
<style lang="scss">
  .song {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-size: cover;
    &__container {
      padding: 50px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      background: #3c2400;
      margin: 100px;
      border-radius: 10px;
      position: relative;
      flex-direction: column;
      &:after {
        content: '';
        position: absolute;
        top: 20px;
        bottom: 20px;
        left: 20px;
        right: 20px;
        border: 2px solid #503704;
        border-radius: 10px;
        box-shadow: inset 1px 1px 8px 0 #000;;
      }
    }
    &__disk {
      width: 164px;
      height: 164px;
      border-radius: 50%;
      position: absolute;
      top: -50px;
      left: -50px;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      &_bg {
        position: absolute;
        width: 98%;
        height: 98%;
        border-radius: 50%;
        background-color: #000;
        background: linear-gradient(#000, #000, #333, #000000, #000);
        display: flex;
        align-items: center;
        justify-content: center;
        &.-played {
          //animation: spinDisc 2s linear 0.3s infinite forwards;
        }
      }
      @keyframes spinDisc {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    }
    &__svg {
      position: absolute;
      top: 0px;
      left: 0px;
    }
    &__img {
      min-width: 100px;
      min-height: 100px;
      max-width: 160px;
      border-radius: 50%;
      opacity: .4;
      flex: 0 0 auto;
      &--wrapp {
        position: absolute;
        width: 100px;
        height: 100px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
      }
    }
    &__controls {
      padding: 20px;
      margin-top: 20px;
      position: relative;
      &--wrapp {
        width: 364px;
        text-align: center;
        background: #8f6002;
        display: flex;
        justify-content: center;
        box-shadow: 4px 4px 0 #6d4601 inset;
        border-left: 2px solid #906310;
        border-top: 2px solid #906310;
        padding: 20px 20px 15px;
        position: relative;
        border-radius: 10px;
      }
      &_rivets {
        position: absolute;
        background-color: #B1811D;
        border-radius: 15px;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, 0.5);

        &_item {
          position: absolute;
          top: 6px;
          left: 8px;
          background-color: #8f6002;
          width: 16px;
          border-radius: 50%;
          height: 16px;
          box-shadow: 1px 1px 0 #6d4601;
          &--top {
            left: auto;
            right: 7px;
          }
          &--bottom {
            top: auto;
            bottom: 5px;
          }
          &--right {
            left: auto;
            top: auto;
            right: 7px;
            bottom: 5px;
          }
          &:after, &:before {
            position: absolute;
            content: '';
            width: 1px;
            height: 6px;
            top: 5px;
            left: 8px;
            background-color: #482e00;
          }
          &:after {
            transform: rotate(45deg);
          }
          &:before {
            transform: rotate(-45deg);
          }
        }
      }
      &_btn {
        width: 50px;
        height: 50px;
        border: 1px solid #6d4601;
        border-radius: 50%;
        font-size: 8px;
        cursor: pointer;
        padding: 0;
        margin: 0 10px 0 0;
        box-shadow: 0 2px 6px rgba(0, 0, 31, .75);
        position: relative;
        box-sizing: border-box;
        color: rgba(255, 255, 255, 0.5);
        background: #6d4601;
        outline: none;
        z-index: 1;
        .fa {
          transform: translate(0px, -8px);
          transition: transform 0.6s ease;
          font-size: 12px;
          text-shadow: 1px 1px 8px black;
        }
        &:after {
          content: "";
          position: absolute;
          top: 0;
          left: -1px;
          right: -1px;
          width: 100%;
          height: inherit;
          border-radius: inherit;
          background-color: #fdac03;
          transform: translateY(-10px);
          transition-duration: 125ms;
          transition: transform .6s ease;
          border: 1px solid #825403;
          z-index: -1;
          box-shadow: inset 0px 0px 20px #382500;
        }
        &:active, &.-active {
          box-shadow: 0 2px 7px 0px rgba(0, 0, 31, .5);
          color: rgba(255, 255, 255, 0.8);
          .fa {
            transform: translate(0px, -2px);
            transition: transform 0.6s ease;
          }
          &:after {
            transform: translateY(-6px);
            transition: transform 0.6s ease;
          }
        }
        &--play {
          background: #441111;
          margin-left: auto;
          &:after {
            background: #731010;
          }
        }
      }
    }
    &__canvas {
      border: 1px solid black;
      margin-top: 10px;
    }
  }
</style>
