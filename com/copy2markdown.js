    // ==UserScript==
    // @name         复制为Markdown格式
    // @namespace    https://github.com/nameldk/user-script
    // @version      0.1
    // @description  复制网页内容为Markdown格式。点击右上角copy按钮开始选择内容，点击鼠标或按Enter进行复制，按Esc取消选择。按钮可以拖动。
    // @author       nameldk
    // @require      https://unpkg.com/turndown/dist/turndown.js
    // @require      https://unpkg.com/jquery@3.3.1/dist/jquery.min.js
    // @match        https://*/*
    // @match        http://*/*
    // @grant        none
    // ==/UserScript==

    (function () {
        'use strict';

        const CLASS_HINT = "_myhint_";
        let $body = $("body");
        let $curElement = null;
        let $btn = $('<div style="position: fixed;width: 50px;padding-top: 2px;height: 24px;top: 10%;right: 1%;background: #0084ff;color: #fff;text-align: center;border-radius: 5px;z-index: 10000;cursor: pointer;opacity: 0.1;">copy</div>');
        let turndownService = new TurndownService();
        let isHold = 0,
            isDrag = 0;

        function addStyle(css) {
            $body.append('<style type="text/css">' + css + '</style>');
        }

        function showHint($this) {
            $this.addClass(CLASS_HINT);
        }

        function hideHint($this) {
            $this.removeClass(CLASS_HINT);
        }

        function handleMouseover(e) {
            let $target = $(e.target);
            $curElement = $target;
            showHint($target);
        }

        function handleMouseout(e) {
            let $target = $(e.target);
            hideHint($target);
        }

        function handleKeyup(e) {
            if (e.which === 13) {
                process(e);
                return false;
            } else if (e.which === 27) {
                disable();
            }
        }

        function handleClick(e) {
            process(e);
            return false;
        }

        function process(e) {
            if ($curElement && $curElement.length) {
                e.preventDefault();
                copyIt($curElement);
                disable();
                showTips();
            }
        }

        function showTips() {
            let $t = $('<div style="position: fixed;width: 80px;padding-top: 2px;height: 24px;top: 10px;right: 50%;background: #68af02;color: #fff;text-align: center;border-radius: 5px;margin-left: 300px;z-index: 10000;">复制成功</div>');
            $body.prepend($t);
            setTimeout(function () {
                $t.remove();
            }, 1000);
        }

        function copyIt($curElement) {
            if ($curElement && $curElement.length) {
                let html = $curElement.html();
                html = html.replace(/(<img.+?src=")\/(.+?)"/gi, "$1" + document.location.origin + "/$2\"");
                let markdown = turndownService.turndown(html);
                markdown = markdown.replace(/<img.+?>/g, "");
                copyToClipboard(markdown);
            }
        }


        function copyToClipboard(text) {
            const input = document.createElement('textarea');
            input.style.position = 'fixed';
            input.style.opacity = 0;
            input.value = text;
            document.body.appendChild(input);
            input.select();
            let res = document.execCommand('Copy');
            document.body.removeChild(input);
            return res;
        }

        function enable() {
            $(document).on("mouseover", handleMouseover)
                .on("mouseout", handleMouseout)
                .on("click", handleClick)
                .on("keyup", handleKeyup);
        }

        function disable() {
            if ($curElement && $curElement.length) {
                hideHint($curElement);
                $curElement = null;
            }

            $(document).off("mouseover", handleMouseover)
                .off("mouseout", handleMouseout)
                .off("click", handleClick)
                .off("keyup", handleKeyup);

            $btn.show();
        }

        function initBtn() {
            let topDiff = 0,
                leftDiff = 0;
            $btn.on("click", function () {
                if (isDrag) {
                    return false;
                }
                enable();
                $(this).hide();
            }).on("mouseover", function () {
                $(this).css("opacity", 1);
            }).on("mouseout", function () {
                $(this).css("opacity", 0.1);
            }).on("mousedown", function (e) {
                isHold = 1;
                leftDiff = e.pageX - $btn.offset().left;
                topDiff = e.pageY - $btn.offset().top;
            }).on("mouseup", function () {

            }).on("mousemove", function (e) {
                if (isHold) {
                    isDrag = 1;
                }
                if (isDrag) {
                    $btn.css({
                        "top": e.pageY - topDiff - document.documentElement.scrollTop,
                        "left": e.pageX - leftDiff,
                        "right": "auto"
                    });
                }
            });
            $body.on("mouseup", function () {
                setTimeout(function () {
                    isHold = 0;
                    isDrag = 0;
                }, 0);
            });
        }

        function init() {
            addStyle("." + CLASS_HINT + "{border:1px solid blue}");
            $body.prepend($btn);
            initBtn();
        }

        init();
    })();