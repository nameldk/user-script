// ==UserScript==
// @name         链接直接打开
// @namespace    https://github.com/nameldk/user-script
// @version      0.1
// @description  直接打开链接，避免站内拦截。
// @author       nameldk
// @match        https://*.zhihu.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const debug = 0;
    const log = debug ? console.log : function () {
    };

    const configList = [
        {
            "host": "zhihu.com",
            "selector": "a[href^=\"https://link.zhihu.com/\"]",
            "replace": "https://link.zhihu.com/?target="
        }
    ];


    function forEachArray(arrayLike, cb) {
        if (arrayLike) {
            Array.prototype.forEach.call(arrayLike, el => cb(el));
        }
    }

    function processLink(elAncestor, selector, replace) {
        log('run:processLink');
        if (elAncestor) {
            forEachArray(
                elAncestor.querySelectorAll(selector),
                ele => {
                    ele.setAttribute('href', decodeURIComponent(ele.getAttribute('href').replace(replace, '')));
                    ele.setAttribute('target', '_blank');
                    ele.addEventListener('click', function (e) {
                        e.stopPropagation();
                    });
                }
            )
        }
    }

    function observer(item) {
        const targetNode = document;
        const config = {childList: true, subtree: true};
        const callback = function (mutationsList) {
            for (const mutation of mutationsList) {
                if (mutation.addedNodes.length) {
                    forEachArray(mutation.addedNodes, ele => processLink(ele, item.selector, item.replace));
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    setTimeout(function () {
        let item;
        configList.forEach(function (config) {
            if (location.href.indexOf(config.host) > -1) {
                item = config;
            }
        });
        if (item) {
            processLink(document, item.selector, item.replace);
            observer(item);
        }
    }, 500);
})();