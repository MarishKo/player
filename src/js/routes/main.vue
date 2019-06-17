<template>
  <player v-if="songs.length > 0" />
</template>

<script>
  import songs from '@src/assets/songs.json';
  import player from '@js/components/player.vue';

  export default {
    name: 'mainPage',
    created() {
      this.getSongsList();
    },
    components: {
      player,
    },
    computed: {
      songs() {
        return this.$store.state.songs;
      }
    },
    methods: {
      getSongsList() {
        this.$store.commit('setSongsList', songs);
        this.$store.commit('setCurrentSong', songs[1]);
      }
    }
  };
</script>