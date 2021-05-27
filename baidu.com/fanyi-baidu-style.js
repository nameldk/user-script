// ==UserScript==
// @name         调整样式
// @namespace    https://github.com/nameldk/user-script
// @version      0.1
// @description  调整百度翻译页面样式
// @author       nameldk
// @match        https://fanyi.baidu.com/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let style = `<style>
    .dictionary-wrap .query-video{max-width:800px; max-height:600px;}
    .my-narrow {height: 310px;}
    .my-narrow .trans-right {top: 180px; left: -483px;}
</style>`;

    if (window.$) {
        $('body').append(style);

        !function processSize() {
            let $window = $(window);
            let $translateMain = $('.translate-main');
            let fn = () => {$translateMain.toggleClass('my-narrow', $window.width() < 1111);};
            $window.resize(fn);
            $(fn);
        }();
    }
})();