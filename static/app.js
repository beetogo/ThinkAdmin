;(async () => {

    /*! 项目应用根路径 */
    window.appRoot = (function (script) {
        return '/' + script.src.split('/').slice(3, -2).join('/') + '/';
    })(document.querySelector('script[type=module][src*="app.js"]'));

    /*! 模块加载请求处理 */
    const options = {
        moduleCache: {
            vue: Vue, less: less
        }, getFile(url) {
            if (!(/^(https?:)?\/\//)) {
                url = (appRoot + url).replace(/\/+.?\/+/g, '/');
            }
            return fetch(url).then(res => {
                if (res.ok) {
                    return {getContentData: binary => binary ? res.arrayBuffer() : res.text()};
                } else if (res.status === 404) {
                    return `<template><el-empty description="${res.status}，${res.statusText}">${url}</el-empty></template>`;
                } else {
                    throw Object.assign(new Error(url + ' ' + res.statusText), {res});
                }
            });
        }, addStyle(style) {
            const before = document.head.getElementsByTagName('style')[0] || null;
            const object = Object.assign(document.createElement('style'), {textContent: style});
            document.head.insertBefore(object, before);
        },
    };

    const {loadModule} = window['vue3-sfc-loader'];
    const loadVue = (vuePath) => loadModule(vuePath, options);
    // const loadVueFile = (vuePath) => () => loadVue(vuePath);

    const router = VueRouter.createRouter({
        routes: [], history: VueRouter.createWebHashHistory(),
    });

    // 创建后台主路由
    router.addRoute({
        name: 'layout', path: '/', component: () => {
            return loadVue('/static/template/layout.vue');
        }, children: [
            {path: '/', redirect: '/static/template/login.vue'},
        ]
    });

    // 动态注销路由
    router.afterEach(function (to) {
        let name = to.fullPath.replace(/[.\/]+/g, '_');
        if (router.hasRoute(name)) router.removeRoute(name)
        if (loading) loading = loading.close(), null;
    });

    // 动态注册路由
    let loading = null;
    router.beforeEach(function (to, fr, next) {
        let name = to.fullPath.replace(/[.\/]+/g, '_');
        if (router.hasRoute(name)) {
            console.log('loadPage', to.fullPath)
            loading = ElementPlus.ElLoading.service({
                lock: true, text: 'Loading', background: 'rgba(0, 0, 0, 0.3)',
            });
            next();
        } else {
            // 删除页面缓存
            delete options.moduleCache[to.fullPath];
            // 登录页面处理
            if (to.fullPath === '/static/template/login.vue') {
                router.addRoute({name: name, path: to.fullPath, component: () => loadVue(to.fullPath)})
            } else {
                // 动态注册路由并触发新路由
                router.addRoute('layout', {name: name, path: to.fullPath, component: () => loadVue(to.fullPath)});
            }
            next({name: name});
        }
    });

    // 创建 Vue 应用
    const app = Vue.createApp({});

    // 定义全局缓存，加载字体组件
    app.cache = {loadOpt: options, loadVue: loadVue};
    app.cache.icons = await loadVue("/static/plugs/core/vue.element.icons.js");
    for (let i in app.cache.icons) app.component(i, app.cache.icons[i]);

    // 注册 getApp 获取应用
    window.getApp = () => app;

    // 绑定 data-route 路由处理
    document.addEventListener('click', function (event) {
        event.path.some(function (ele) {
            if (ele.dataset && ele.dataset.route) {
                router.push(ele.dataset.route);
                return true;
            }
        });
    });

    // 应用组件及路由
    app.use(ElementPlus).use(router).mount(document.body);

})().catch(ex => console.error(ex));