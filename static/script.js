let currentSort = "latest"; // 初期は最新順

// ✅ XSS（クロスサイトスクリプティング）対策：入力値をエスケープする関数
function escapeHTML(str) {
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ✅ 禁止ワードリスト（危険なスクリプトやSQL攻撃を防ぐ）
const forbiddenWords = [
    "<script", "<iframe", "<img", "<link", "<meta",
    "javascript:", "onerror=", "onload=", "document.cookie",
    "fetch(", "XMLHttpRequest", "$.ajax(",
    "eval(", "Function(", "setTimeout(", "setInterval(",
    "' OR 1=1 --", "' DROP TABLE", "' UNION SELECT",
    "console.log", "window.alert", "window.location", "debugger"
];

// ✅ 投稿・コメントに禁止ワードが含まれていないかチェック
function containsForbiddenWords(text) {
    return forbiddenWords.some(word => text.toLowerCase().includes(word));
}

// ✅ 投稿を送信
async function submitPost() {
    let text = document.getElementById("postText").value;
    if (!text.trim()) { 
        alert("テキストを入力してください！"); 
        return; 
    }
    if (containsForbiddenWords(text)) {
        alert("禁止された単語が含まれています！");
        return;
    }

    let jsonData = JSON.stringify({ text });
    let base64Data = btoa(unescape(encodeURIComponent(jsonData)));

    await fetch("/post", {
        method: "POST",
        headers: { "Content-Type": "application/base64" },
        body: base64Data
    });

    document.getElementById("postText").value = "";
    loadPosts();
}

// ✅ 投稿一覧を取得（並び替えに対応）
async function loadPosts() {
    let endpoint = currentSort === "latest" ? "/posts" : "/ranking";
    let response = await fetch(endpoint);
    let posts = await response.json();
    let postsDiv = document.getElementById("posts");
    postsDiv.innerHTML = "";

    document.getElementById("post-title").textContent = currentSort === "latest" ? "投稿一覧（最新順）" : "投稿一覧（ランキング順）";

    for (let post of posts) {
        let div = document.createElement("div");
        div.className = "post-container";
        div.innerHTML = `
            <p><strong>${escapeHTML(post.text)}</strong></p>
            <p>👍 ${post.likes}</p>
            <button class="like-button" onclick="likePost(${post.id})">いいね</button>
            
            <button class="toggle-button" onclick="toggleComments(${post.id})">コメント (<span id="comment-count-${post.id}">0</span>) を見る</button>

            <div class="comment-container" id="comments-${post.id}" style="display: none;">
                <h4>コメントを書く</h4>
                <textarea id="commentText-${post.id}" class="comment-input" placeholder="コメントを書く"></textarea>
                <button class="comment-button" onclick="submitComment(${post.id})">コメントする</button>
                <h4>コメント一覧</h4>
                <div id="comment-list-${post.id}" class="comment-list"></div>
            </div>
        `;
        postsDiv.appendChild(div);

        loadComments(post.id);
    }
}

// ✅ いいねを送信（1人1回まで）
async function likePost(postId) {
    let response = await fetch(`/like/${postId}`, { 
        method: "POST",
        headers: { "User-Agent": navigator.userAgent }  // ユーザー識別用
    });

    let result = await response.json();
    if (response.status !== 200) {
        alert(result.error);  // すでにいいねしている場合はアラートを表示
    } else {
        loadPosts();  // 投稿一覧を再読み込み
    }
}

// ✅ コメントの表示/非表示を切り替える
function toggleComments(postId) {
    let commentDiv = document.getElementById(`comments-${postId}`);
    if (commentDiv.style.display === "block") {
        commentDiv.style.display = "none";
    } else {
        commentDiv.style.display = "block";
        loadComments(postId);
    }
}

// ✅ コメントを取得
async function loadComments(postId) {
    let response = await fetch(`/comments/${postId}`);
    let comments = await response.json();
    let commentDiv = document.getElementById(`comment-list-${postId}`);
    let commentCount = document.getElementById(`comment-count-${postId}`);
    
    commentDiv.innerHTML = comments.map(c => `<p class="comment-text">🗨 ${escapeHTML(c.text)}</p>`).join("");
    commentCount.innerText = comments.length;
}

// ✅ コメントを送信
async function submitComment(postId) {
    let text = document.getElementById(`commentText-${postId}`).value;
    if (!text.trim()) {
        alert("コメントを入力してください！");
        return;
    }
    if (containsForbiddenWords(text)) {
        alert("禁止された単語が含まれています！");
        return;
    }

    let jsonData = JSON.stringify({ text });

    await fetch(`/comment/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonData
    });

    document.getElementById(`commentText-${postId}`).value = "";
    loadComments(postId);
}

// ✅ 並び替えを切り替える（最新順 ⇄ ランキング順）
function toggleSort() {
    currentSort = currentSort === "latest" ? "ranking" : "latest";
    document.querySelector(".sort-button").textContent = currentSort === "latest" ? "ランキング順で表示" : "最新順で表示";
    loadPosts();
}

// ✅ 開発者ツールが開かれたかどうかをチェックする関数
function detectDevTools() {
    let devtools = false;
    const threshold = 160; // 閾値（幅 or 高さの違い）

    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        devtools = true;
    }

    return devtools;
}

// ✅ PCかスマホかを判定
function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}


// ✅ PCのみに開発者ツールの検知を適用
if (!isMobile()) {
    setInterval(function () {
        if (detectDevTools()) {
            console.clear();
            console.log("開発者ツールが検出されました。");
            window.open('', '_self', '');  // ✅ ページを閉じる
            window.close();
        }
    }, 2000);
}

// ✅ 右クリックメニューを無効化
document.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

// ✅ 開発者ツールのキーボードショートカットを無効化
document.addEventListener('keydown', function(event) {
    if (
        event.key === "F12" || 
        (event.ctrlKey && event.shiftKey && event.key === "I") || 
        (event.ctrlKey && event.shiftKey && event.key === "J") || 
        (event.ctrlKey && event.key === "U") || 
        (event.ctrlKey && event.key === "S") || 
        (event.ctrlKey && event.key === "H") || 
        (event.ctrlKey && event.key === "A" && event.shiftKey)
    ) {
        event.preventDefault();
        window.open('', '_self', '');  // ✅ ページを閉じる
        window.close();
    }
});

// ✅ コンソールをクリア（隠しスクリプトを防ぐ）
setInterval(function () {
    console.clear();
}, 1000);

// ✅ 初回読み込み
document.addEventListener("DOMContentLoaded", function () {
    loadPosts();
});
