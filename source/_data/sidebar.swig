<!-- hitokoto -->

<div id="hitokoto_wrap">
    <div id="hitokoto_text"></div>
    <div id="hitokoto_from"></div>
</div>

<script>
    let hitokoto_wrap = document.getElementById("hitokoto_wrap");
    let hitokoto_text = document.getElementById('hitokoto_text');
    let hitokoto_from = document.getElementById('hitokoto_from');
    
    async function loadHitokoto() {
        // Fetch API
        // 调用一言接口 根据需求配置参数
        fetch('https://international.v1.hitokoto.cn?c=a&c=d')
        .then(response => response.json())
        .then(data => {
            hitokoto_text.innerText = data.hitokoto;
            hitokoto_from.innerText = "——" + data.from;
        })
        .catch(console.error)
    }
    loadHitokoto();

    hitokoto_wrap.addEventListener("click", async function(e) {
        loadHitokoto();
        
        // 复制一言内容到剪贴板
        // 去除字符串前后空格
        let content = (hitokoto_text.innerText + hitokoto_from.innerText).trim();
        // Clipboard API
        navigator.clipboard.writeText(content)
        .then(() => console.log("Copied to clipboard: " + content))
        .catch(console.error)
    });
</script>