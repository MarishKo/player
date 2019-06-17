import Router from 'vue-router';

export const AppRouter = new Router({
  mode: 'history',
  routes: [{
    path: '/',
    component: () => import(/* webpackChunkName: "route/main" */ './routes/main.vue')
  }]
});