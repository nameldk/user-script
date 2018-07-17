    // ==UserScript==
    // @name         复制为Markdown格式
    // @namespace    https://github.com/nameldk/user-script
    // @version      0.2.2
    // @description  复制网页内容为Markdown格式。点击右上角copy按钮开始选择内容，点击鼠标或按Enter进行复制，按Esc取消选择。按钮可以拖动。
    // @author       nameldk
    // @require      https://unpkg.com/turndown/dist/turndown.js
    // @match        https://*/*
    // @match        http://*/*
    // @grant        none
    // ==/UserScript==

    (function () {
        'use strict';

        const CLASS_HINT = "_myhint_";
        let $curElement = null;
        let $btn = document.createElement("div");
        let turndownService = new TurndownService();
        let isHold = 0,
            isDrag = 0;

        function addStyle(css) {
            let s = document.createElement("style");
            s.type = "text/css";
            s.textContent = css;
            document.body.prepend(s);
        }

        function showHint($this) {
            $this.classList.add(CLASS_HINT);
        }

        function hideHint($this) {
            $this.classList.remove(CLASS_HINT);
        }

        function handleMouseover(e) {
            let $target = e.target;
            $curElement = $target;
            showHint($target);
        }

        function handleMouseout(e) {
            let $target = e.target;
            hideHint($target);
        }

        function handleKeyup(e) {
            if (e.keyCode === 13) {
                process(e);
                return false;
            } else if (e.keyCode === 27) {
                disable();
            }
        }

        function handleClick(e) {
            process(e);
            return false;
        }

        function process(e) {
            if ($curElement) {
                e.preventDefault();
                copyIt($curElement);
                disable();
                showTips();
            }
        }

        function showTips() {
            let t = document.createElement("div");
            t.style.position = "fixed";
            t.style.width = "80px";
            t.style.height = "24px";
            t.style.lineHeight = "24px";
            t.style.top = "10px";
            t.style.right = "50%";
            t.style.background = "#68af02";
            t.style.fontSize = "14px";
            t.style.color = "#fff";
            t.style.textAlign = "center";
            t.style.borderRadius = "5px";
            t.style.marginLeft = "300px";
            t.style.zIndex = 10000;
            t.innerHTML = "复制成功";

            document.body.prepend(t);
            setTimeout(function () {
                document.body.removeChild(t);
            }, 1000);
        }

        function copyIt($curElement) {
            if ($curElement) {
                let html = $curElement.innerHTML;
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
            document.addEventListener("mouseover", handleMouseover);
            document.addEventListener("mouseout", handleMouseout);
            document.addEventListener("click", handleClick);
            document.addEventListener("keyup", handleKeyup);
        }

        function disable() {
            if ($curElement) {
                hideHint($curElement);
                $curElement = null;
            }

            document.removeEventListener("mouseover", handleMouseover);
            document.removeEventListener("mouseout", handleMouseout);
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keyup", handleKeyup);

            $btn.style.display = "block";
        }

        function initBtn() {
            let topDiff = 0,
                leftDiff = 0;

            $btn.style.position = "fixed";
            $btn.style.width = "44px";
            $btn.style.height = "22px";
            $btn.style.lineHeight = "22px";
            $btn.style.top = "14%";
            $btn.style.right = "1%";
            $btn.style.background = "#0084ff";
            $btn.style.fontSize = "14px";
            $btn.style.color = "#fff";
            $btn.style.textAlign = "center";
            $btn.style.borderRadius = "6px";
            $btn.style.zIndex = 10000;
            $btn.style.cursor = "pointer";
            $btn.style.opacity = 0.1;
            $btn.innerHTML = "copy";

            $btn.addEventListener("click", function () {
                if (isDrag) {
                    return false;
                }
                enable();
                this.style.display = "none";
            });

            $btn.addEventListener("mouseover", function (e) {
                this.style.opacity = 1;
            });

            $btn.addEventListener("mouseout", function () {
                this.style.opacity = 0.1;
            });

            $btn.addEventListener("mousedown", function (e) {
                isHold = 1;
                leftDiff = e.pageX - this.offsetLeft;
                topDiff = e.pageY - this.offsetTop;

                $btn.onmousemove = function (e) {
                    if (isHold) {
                        isDrag = 1;
                    }
                    if (isDrag) {
                        this.style.top = (e.pageY - topDiff) + "px";
                        this.style.left = (e.pageX - leftDiff) + "px";
                        this.style.right = "auto";
                    }
                };
            });

            document.addEventListener("mouseup", function () {
                setTimeout(function () {
                    isHold = 0;
                    isDrag = 0;
                    $btn.onmousemove = null;
                }, 0);
            });
        }

        function init() {
            if (!document.body) {
                console.warn("no body");
                return;
            }
            addStyle("." + CLASS_HINT + "{border:1px solid blue}");
            document.body.prepend($btn);
            initBtn();
        }

        init();
    })();