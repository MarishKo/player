<template>
  <svg class="app__icon" :viewBox="svg.viewBox">
    <use :xlink:href="'#'+svg.id"/>
  </svg>
</template>
<script>
  export default {
    name: 'icon',
    data() {
      return {
        svg: {
          content: '',
          id: '',
          viewBox: '',
        },
      };
    },
    props: {
      name: {
        type: String,
        required: true
      },
    },
    created() {
      let icon = require('@src/assets/svg/' + this.name + '.svg');
      this.svg = icon.default;
    },
  };
</script>