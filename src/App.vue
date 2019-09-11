<template>
  <div class="app">
    <router-view></router-view>
  </div>
</template>
<script>
  export default {
    name:'App'
  }
</script>
<style lang="scss">
  body, html {
    margin: 0;
    padding: 0;
  }
  body {
    min-height: 100vh;
    display: flex;
    font-family: Arial, sans-serif;
  }
  .app {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #000000;
    color: #ffffff;
  }
</style>