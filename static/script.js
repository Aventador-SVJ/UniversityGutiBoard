let currentSort = "latest"; // 初期は最新順

// ✅ 投稿を送信
async function submitPost() {
    let text = document.getElementById("postText").value;
    if (!text.trim()) { 
        alert("テキストを入力してください！"); 
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

    // ✅ タイトル変更
    document.getElementById("post-title").textContent = currentSort === "latest" ? "投稿一覧（最新順）" : "投稿一覧（ランキング順）";

    for (let post of posts) {
        let div = document.createElement("div");
        div.className = "post-container";
        div.innerHTML = `
            <p><strong>${post.text}</strong></p>
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

// ✅ いいねを送信
async function likePost(postId) {
    await fetch(`/like/${postId}`, { method: "POST" });
    loadPosts();
}

// ✅ コメントの表示/非表示を切り替える（1回目で確実に動作）
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
    
    commentDiv.innerHTML = comments.map(c => `<p class="comment-text">🗨 ${c.text}</p>`).join("");
    commentCount.innerText = comments.length;
}

// ✅ コメントを送信
async function submitComment(postId) {
    let text = document.getElementById(`commentText-${postId}`).value;
    if (!text.trim()) {
        alert("コメントを入力してください！");
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

// ✅ 初回読み込み
document.addEventListener("DOMContentLoaded", function () {
    loadPosts();
});
