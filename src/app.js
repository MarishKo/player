import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';

Vue.use(VueRouter);
Vue.use(Vuex);

//Global components import
import IconComponent from '@js/components/ui/icon.vue';

Vue.component('icon', IconComponent);

import { AppRouter } from '@js/router.js';
import AppStore from '@js/store.js';

import AppVue from '@src/App.vue';

class App {
  constructor() {
    this.Router = AppRouter;
    this.Store = new AppStore();
    this.Vue = new Vue({
      router: this.Router,
      store: this.Store,
      render: h => h(AppVue),
    });
  }
}

global.app = new App;

app.Vue.$mount('#app');