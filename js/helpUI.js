// helpUI.js

let helpMode = "free";

window.initHelpUI = function () {
    const menuBtn = document.getElementById("menuBtn");
    const helpPanel = document.getElementById("helpPanel");

    menuBtn.addEventListener("click", () => {
        helpPanel.classList.toggle("open");     
        updateHelpContent();
    });

    document.addEventListener("click", (e) => {
        if (!helpPanel.contains(e.target) && e.target !== menuBtn) {
            helpPanel.classList.remove("open");
        }
    });
};

window.setHelpMode = function (mode) {
    if (helpMode !== mode) {
        helpMode = mode;
        updateHelpContent();
    }
};

function updateHelpContent() {
    const helpContent = document.getElementById("helpContent");

    if (helpMode === "free") {
        helpContent.innerHTML = `
            <h2>Free Play Mode</h2>
            <p> \u64CD\u4F5C\u8AAA\u660E : </p>
            <p>      \u6839\u64DA\u7BC4\u4F8B\u5F71\u7247\u5C0D\u61C9\u7684\u624B\u52E2\u4F86\u5F48\u594F\u97F3\u7B26 </p>

            <a href="https://www.youtube.com/watch?v=miIk106wNNI" target="_blank">
                    \u7BC4\u4F8B\u5F71\u7247
            </a>
        `;
    } else {
        helpContent.innerHTML = `
            <h2>MIDI Mode</h2>
            <p> \u64CD\u4F5C\u8AAA\u660E : </p>
            <p> \u8F38\u5165MIDI\u5F8C\uFF0C\u4EE5\u63E1\u76F4\u7B1B\u7684\u65B9\u5F0F\u8F15\u52D5\u624B\u6307\uFF0C\u4FBF\u53EF\u767C\u51FA\u97F3\u6A02 </p>
            <a href="https://www.youtube.com/watch?v=jxWi7-22Mpc" target="_blank">
                \u7BC4\u4F8B\u5F71\u7247
            </a>
        `;
    }
}