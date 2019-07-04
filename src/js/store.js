import Vuex from 'vuex';


export default function () {
  return new Vuex.Store({
    namespaced: true,
    state: {
      songs: [],
      song: {
        current: {
          id: 0,
          duration: 0,
          bg: './assets/img/6284055448_e0d5c1af67_o.jpg',
          title: '',
          url: '',
          singer: ''
        },
      },
      controls: {
        playState: false,
        repeat: false,
      },
    },
    mutations: {
      setSongsList(state, data) {
        state.songs = data;
      },
      setCurrentSong(state, data) {
        state.song.current = Object.assign({}, state.song.current, data);
      },
      setSongPlayState(state, data) {
        state.controls.playState = data;
      },
      setSongRepeatState(state, data) {
        state.controls.repeat = data;
      }
    }
  });
}