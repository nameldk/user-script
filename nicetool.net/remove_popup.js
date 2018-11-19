// ==UserScript==
// @name         移除弹窗
// @namespace    https://github.com/nameldk/user-script
// @version      0.1.0
// @description  移除需要支付的弹窗；使可以使用开发者工具。
// @author       nameldk
// @match        http://www.nicetool.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var timer = setInterval(function(){
        if (window.devtoolsDetector) {
            window.devtoolsDetector=null;
            delete window.devtoolsDetector;
        }
        if ($('#layui-m-layer0').length) {
            $('#layui-m-layer0').remove();
            window.clearInterval(timer);
        }
    }, 1000);
})();