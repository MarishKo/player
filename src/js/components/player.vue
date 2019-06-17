<template>
  <div class="song">
    <div class="song__container">
      <div class="song__disk">
        <svg class="song__svg" id="mySVG"></svg>
        <div class="song__disk_bg" :class="{'-played': song.playState}">
          <img class="song__img" :src="song.current.bg" :alt="song.current.title">
        </div>
      </div>

      <div class="song__controls">
        <button class="song__controls_btn song__controls_btn--next" type="button">next</button>
        <button class="song__controls_btn song__controls_btn--prev" type="button">prev</button>
        <button class="song__controls_btn song__controls_btn--list" type="button">list</button>
        <button class="song__controls_btn song__controls_btn--play" :class="{'-played': song.playState}" type="button"
                @click="playOrPauseSong">play/pause
        </button>
      </div>
    </div>
  </div>
</template>
<script>
  const svgNS = "http://www.w3.org/2000/svg";
  const r = 180;
  const circleLength = 2 * Math.PI * r;
  const timelineLength = 360;

  export default {
    name: 'player',
    data() {
      return {
        audio: new Audio(),
        songTime: ''
      }
    },
    computed: {
      song() {
        return this.$store.state.song;
      }
    },
    methods: {
      setSVGParams() {
        let svgContainer = document.getElementById("mySVG");
        if (svgContainer !== null) {
          svgContainer.style.width = `${r * 2 + 4}px`;
          svgContainer.style.height = `${r * 2 + 4}px`;
        }
      },
      setAudioDuration() {
        new Promise((resolve, reject) => {
          this.audio.src = this.song.current.url;
          this.audio.onloadedmetadata = e => resolve(this.audio);
        }).then(audio => {
          this.$store.commit('setCurrentSong', {duration: audio.duration});
          this.createCircle();
        });
      },
      playOrPauseSong() {
        if (this.song.playState) {
          this.audio.pause();
        } else {
          this.audio.play();
          this.audio.addEventListener('ended', this.onEndedMusic);
          this.createSVGCircle();
        }
        this.$store.commit('setSongPlayState', !this.song.playState);
      },
      onEndedMusic() {
        this.$store.commit('setSongPlayState', false);
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
        this.onClickTimeline(myCircleFill);
        this.trackLine = myCircleFill;
        requestAnimationFrame(() => this.getFill());
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
          if (this.song.playState) {
            this.audio.currentTime = newTime;
            this.audio.play();
          }
        });
      },
    },
    created() {
      this.setAudioDuration();
    },
    mounted() {
      this.setSVGParams();
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
      align-items: flex-end;
      box-sizing: border-box;
      background: #613828;
      margin: 50px;
      border-radius: 10px;
    }
    &__disk {
      width: 364px;
      height: 364px;
      border-radius: 50%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      &_bg {
        position: absolute;
        width: 98%;
        height: 98%;
        border-radius: 50%;
        background-color: #222;
        background: linear-gradient(#222, #222, #444, #222, #222);
        display: flex;
        align-items: center;
        justify-content: center;
        &:after {
          content: '';
          width: 20px;
          height: 20px;
          left: 50%;
          top: 50%;
          position: absolute;
          margin-left: -10px;
          z-index: 1;
          background: #222;
          border-radius: 50%;
          margin-top: -10px;
          box-shadow: inset 0px 0px 6px 0px #ffffff;
        }
        &.-played {
          animation: spinDisc 2s linear 0.3s infinite forwards;
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
      position: absolute;
      max-width: 176px;
      border-radius: 50%;
      opacity: 0.3;
    }
    &__controls {
      padding: 20px 10px;
      border: 1px solid #ffffff;
      border-radius: 5px;
      margin-top: 20px;
      width: 364px;
      text-align: center;
      background: #5f536d;
      display: flex;
      justify-content: center;
      &_btn {
        width: 50px;
        height: 50px;
        border: 1px solid #180f25;
        border-radius: 5px;
        font-size: 8px;
        cursor: pointer;
        padding: 0;
        margin: 0;
        box-shadow: 0 2px 6px rgba(0, 0, 31, 0.75);
        position: relative;
        box-sizing: border-box;
        margin-right: 10px;
        color: #ffffff;
        background: #180f25;
        outline: none;
        &:after {
          content: "";
          position: absolute;
          top: 0px;
          left: -1px;
          right: -1px;
          width: 100%;
          height: inherit;
          border-radius: inherit;
          background-color: #3b2954;
          transform: translateY(-12px);
          transition-duration: 125ms;
          transition-delay: 125ms;
          border: 1px solid #180f25;
        }
        &--play {
          background: #441111;
          margin-left: auto;
          &:after {
            background: #731010;
          }
          &.-played {
            box-shadow: 0 2px 7px 0px rgba(0,0,31,.5);
            &:after {
              transform: translateY(-6px);
            }
          }
        }
      }
    }
  }
</style>
