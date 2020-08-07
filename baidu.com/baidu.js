// ==UserScript==
// @name         百度优化
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  百科,知道
// @author       You
// @match        https://baike.baidu.com/item/*
// @match        https://zhidao.baidu.com/question/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const fromMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i);
    const isBaike = location.href.indexOf('baike.baidu.com/item/') > 0;
    const isZhidao = location.href.indexOf('zhidao.baidu.com/question/') > 0;

    function removeIt(s) {
        Array.from(document.querySelectorAll(s)).forEach(el => el.remove())
    }

    function processRemove(mRemoveSelectorList) {
        mRemoveSelectorList.forEach(s => removeIt(s));
    }

    function processAllow(mAllowSelectorList) {
        mAllowSelectorList.forEach(item => {
            let sParent = item[0],
                cList = item[1],
                elParent = document.querySelector(sParent);
            if (elParent && elParent.childElementCount) {
                Array.from(elParent.children).forEach(elChild => {
                    let match = 0;
                    cList.forEach(selector => {
                        if (elChild.matches(selector)) {
                            match = 1;
                        }
                    });
                    if (!match)
                        elChild.remove();
                });
            }
        });
    }


    function m_baike() {
        let mRemoveSelectorList = ['.super-layer-promote', '.yitiao-content', '.yitiao-title', '.qtqy-container'];
        let mAllowSelectorList = [
            ['.BK-after-content-wrapper', ['.AC-baike-starMap', '.bottomMenu', '.bottomMenu', '.copyright', '.bottom-logo']]
        ]; // [parent, [allow-children]]

        processRemove(mRemoveSelectorList);
        processAllow(mAllowSelectorList);
    }

    function pc_baike() {
        let pcRemoveSelectorList = ['#side_box_unionAd', '.right-ad', '#side-share', '#fc_guess_like_new'];
        processRemove(pcRemoveSelectorList);
    }

    function m_zhidao() {
        let removeList = ['[id^=wgt-]', '#feed-recommend', '.wgt-recommend-answer-container.ec-ad'];
        processRemove(removeList);
    }


    function m() {
        if (isBaike) m_baike();
        if (isZhidao) m_zhidao();
    }

    function pc() {
        if (isBaike) pc_baike();
    }

    setTimeout(fromMobile ? m : pc, 1500);
})();
