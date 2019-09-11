<template>
  <div class="song">
    <div class="song__container">
      <div class="song__disk">
        <div class="song__disk_bg" :class="{'-played': controls.playState}">
          <div class="song__img--wrapp">
            <img class="song__img" :src="song.current.bg" :alt="song.current.title">
          </div>
          <span class="song__time">{{songTime}}</span>
        </div>
      </div>

      <h2 class="song__title">{{song.current.title}}</h2>

      <div class="song__controls">
        <button class="song__controls_btn song__controls_btn--prev"
                @click="onPrevSongClick"
                type="button">
          <i class="fa fa-fast-backward"></i>
        </button>
        <button class="song__controls_btn song__controls_btn--play"
                :class="{'-active': controls.playState}"
                type="button"
                @click="playOrPauseSong">
          <i v-if="controls.playState" class="fa fa-pause"></i>
          <i v-else class="fa fa-play"></i>
        </button>
        <button class="song__controls_btn song__controls_btn--next"
                @click="onNextSongClick"
                type="button">
          <i class="fa fa-fast-forward"></i>
        </button>
        <button class="song__controls_btn song__controls_btn--ab"
                type="button"
                @click="changeABState"
                :class="{'-active': repeatABState === 2}">
          <i class="fa">A/B</i>
        </button>
      </div>

      <div class="song__visual">
        <canvas id="song__canvas" class="song__canvas" width="350" height="120"></canvas>
        <div class="song__progress">
          <div class="song__progress_fill"
               :style="{width: trackLineWidth + 'px'}"></div>
          <div v-if="repeatABState !== 0" class="song__progress_flags">
            <div v-show="repeatABState !== 0"
                 :style="{left: flagAPosition + 'px'}"
                 class="song__progress_flags_item song__progress_flags_item--a">
              <i class="fa fa-flag"></i>
              <span>A</span>
            </div>
            <div v-show="repeatABState === 2"
                 :style="{left: flagBPosition + 'px'}"
                 class="song__progress_flags_item song__progress_flags_item--b">
              <i class="fa fa-flag"></i>
              <span>B</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
  const trackWidth = 350;

  export default {
    name: 'player',
    data() {
      return {
        audio: new Audio(),
        drawVisual: null,
        sourceNode: null,
        songTime: '',
        trackLineWidth: 0,
        repeatABState: 0,
        songStartTime: 0,
        songEndTime: 0,
      }
    },
    computed: {
      song() {
        return this.$store.state.song;
      },
      controls() {
        return this.$store.state.controls;
      },
      flagAPosition() {
        return this.songStartTime !== 0 ? this.songStartTime * trackWidth / this.audio.duration : 0;
      },
      flagBPosition() {
        return this.songEndTime !== 0 ? this.songEndTime * trackWidth / this.audio.duration : 0;
      }
    },
    methods: {
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

          this.trackLineWidth = 0;
          this.songTime = '';
          this.songEndTime = audio.duration;
          this.repeatABState = 0;

          this.audio.addEventListener('ended', this.onEndedMusic);
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
          this.checkSongTime();

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
            canvasCtx.fillStyle = 'hsla(' + hue + ', 100%, 50%, 50%)';
            canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
          }
          this.fillProgress();
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
      fillProgress() {
        let currentTime = Number(this.audio.currentTime.toFixed(3)),
          step = currentTime * trackWidth / this.audio.duration;

        if (currentTime <= this.audio.duration) {
          this.trackLineWidth = step;
          this.changePlayingTime();
        }
      },
      /**
       * Применение режима повтора кусочка песни
       * repeatAB state state 0-выключен, 1-выбор точки А, 2-выбор точки B
       */
      changeABState() {
        switch (this.repeatABState) {
          case 0:
            this.songStartTime = this.audio.currentTime;
            this.repeatABState = 1;
            break;
          case 1:
            this.songEndTime = this.audio.currentTime;
            this.repeatABState = 2;
            this.playSong();
            break;
          case 2:
            this.songStartTime = 0;
            this.songEndTime = this.audio.duration;
            this.repeatABState = 0;
            break;
        }
      },
      /**
       * Проверка условий воспроизведени:
       * повтор песен, повтор одной песни, режим a/b, рандомное переключение песен
       */
      checkSongTime() {
        if (this.audio.currentTime >= this.songEndTime) {
          if (this.repeatABState !== 0) {
            //если включен режим A/B,
            if (this.repeatABState === 2) {
              //если выбран и флаг А и флаг В и песня доиграла до конца отрезка, то воспроизводим нужный отрезок заново
              this.audio.currentTime = this.songStartTime;
            } else {
              //если был выбран только флаг A, но песня доиграла, то обнуляем выбор кнопки A/B
              this.songStartTime = 0;
              this.repeatABState = 0;
              this.songEndTime = this.audio.duration;
            }
          }
        }
      },
    },
    mounted() {
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
      min-width: 300px;
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: stretch;
      box-sizing: border-box;
      background: #000000;
      margin: 100px;
      border-radius: 10px;
      position: relative;
      box-shadow: 1px 1px 8px 0 #18608a;
      flex-direction: column;
      &:after {
        content: '';
        position: absolute;
        top: 15px;
        bottom: 15px;
        left: 15px;
        right: 15px;
        border: 2px solid #25405d;
        border-radius: 10px;
        box-shadow: inset 1px 1px 8px 0 #18608a;
      }
    }
    &__disk {
      width: 90px;
      height: 90px;
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
        border: 2px solid #545151;
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
    &__title {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: 300;
      color: rgba(white, 0.65);
    }
    &__img {
      min-width: 70px;
      min-height: 70px;
      max-width: 70px;
      border-radius: 50%;
      opacity: .4;
      flex: 0 0 auto;
      &--wrapp {
        position: absolute;
        width: 90px;
        height: 90px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
      }
    }
    &__controls {
      display: flex;
      padding: 5px 0;
      position: relative;
      justify-content: space-between;
      margin-bottom: 10px;
      &_btn {
        height: 50px;
        border: 2px solid #25405d;
        border-radius: 10px;
        font-size: 8px;
        cursor: pointer;
        padding: 0;
        margin: 0 10px 0 0;
        position: relative;
        box-sizing: border-box;
        color: rgba(white, 0.8);
        background: transparent;
        outline: none;
        z-index: 1;
        flex: 1 1 50px;
        &:last-child {
          margin-right: 0;
        }
        .fa {
          font-size: 12px;
          text-shadow: 1px 1px 8px #ffffff;
        }
        &.-active {
          background-color: rgba(#25405d, 0.5);
        }
      }
    }
    &__visual {
      margin-top:10px;
    }
    &__progress {
      height: 15px;
      width: 350px;
      border: 2px solid #545151;
      position: relative;
      box-sizing: border-box;
      border-radius: 2px;

      &_fill {
        background: #25405d;
        height: 100%;
        width: 0;
      }

      &_flags {
        &_item {
          position: absolute;
          bottom: 0px;
          border-left: 1px solid rgba(white, 0.5);
          i {
            position: absolute;
            left: -2px;
            bottom: 100%;
          }
          span {
            position: relative;
            top: -20px;
            color: black;
            font-size: 9px;
            left: 3px;
            font-weight: bold;
          }
        }
      }
    }
    &__canvas {
      background-color: #000;
    }
  }
</style>
