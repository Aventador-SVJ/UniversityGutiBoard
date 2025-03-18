import base64
import json
import os
import html
import hashlib
from flask import Flask, request, jsonify, render_template, abort
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Flaskアプリを作成
app = Flask(__name__, template_folder=os.path.abspath('templates'))
CORS(app)  # フロントエンドからのアクセスを許可
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db.sqlite'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ✅ 投稿データのモデル
class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

# ✅ コメントのデータモデル
class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

# ✅ いいね履歴を管理するモデル（1人1回のいいね制限）
class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_hash = db.Column(db.String(64), nullable=False)  # ユーザー識別用のハッシュ値

# ✅ データベース作成
with app.app_context():
    db.create_all()

# ✅ XSS対策: HTMLエスケープ関数
def sanitize_text(text):
    return html.escape(text)

# ✅ 投稿API
@app.route('/post', methods=['POST'])
def create_post():
    raw_data = request.get_data()
    try:
        decoded_data = base64.b64decode(raw_data).decode('utf-8')
        json_data = json.loads(decoded_data)

        if not json_data.get('text'):
            return jsonify({'error': 'テキストを入力してください'}), 400

        sanitized_text = sanitize_text(json_data['text'])
        new_post = Post(text=sanitized_text)
        db.session.add(new_post)
        db.session.commit()

        return jsonify({'message': '投稿完了！', 'post_id': new_post.id}), 201

    except Exception as e:
        return jsonify({'error': 'JSONデコードエラー', 'details': str(e)}), 400

# ✅ 投稿一覧を取得API
@app.route('/posts', methods=['GET'])
def get_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return jsonify([{'id': p.id, 'text': sanitize_text(p.text), 'likes': p.likes, 'created_at': str(p.created_at)} for p in posts])

# ✅ いいね機能（1人1回まで）
@app.route('/like/<int:post_id>', methods=['POST'])
def like_post(post_id):
    user_agent = request.headers.get('User-Agent', 'unknown')  # デバイス情報
    user_ip = request.remote_addr  # ユーザーのIPアドレス
    user_hash = hashlib.sha256((user_agent + user_ip).encode()).hexdigest()  # ユーザーごとの識別ID

    existing_like = Like.query.filter_by(post_id=post_id, user_hash=user_hash).first()
    if existing_like:
        return jsonify({'error': 'この投稿には既にいいねしています！'}), 400

    post = Post.query.get(post_id)
    if not post:
        return jsonify({'error': '投稿が見つかりません'}), 404

    post.likes += 1
    new_like = Like(post_id=post_id, user_hash=user_hash)
    db.session.add(new_like)
    db.session.commit()

    return jsonify({'message': 'いいねしました！', 'likes': post.likes})

# ✅ コメント投稿API
@app.route('/comment/<int:post_id>', methods=['POST'])
def create_comment(post_id):
    data = request.json
    if not data.get('text'):
        return jsonify({'error': 'コメントを入力してください'}), 400

    post = Post.query.get(post_id)
    if not post:
        return jsonify({'error': '投稿が見つかりません'}), 404

    sanitized_text = sanitize_text(data['text'])
    new_comment = Comment(post_id=post_id, text=sanitized_text)
    db.session.add(new_comment)
    db.session.commit()

    return jsonify({'message': 'コメントを追加しました！'})

# ✅ コメント一覧を取得API（XSS対策）
@app.route('/comments/<int:post_id>', methods=['GET'])
def get_comments(post_id):
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.desc()).all()
    return jsonify([{'id': c.id, 'text': sanitize_text(c.text), 'created_at': str(c.created_at)} for c in comments])

# ✅ ランキング機能（いいね数が多い順に取得）
@app.route('/ranking', methods=['GET'])
def ranking():
    posts = Post.query.order_by(Post.likes.desc()).limit(10).all()
    return jsonify([{'id': p.id, 'text': sanitize_text(p.text), 'likes': p.likes} for p in posts])

# ✅ `static`フォルダの直接アクセスをブロック
@app.route('/static/<path:filename>')
def block_static_access(filename):
    return abort(403)  # 403 Forbidden を返す

# ✅ アプリが動いているか確認用のルート
@app.route('/', methods=['GET'])
def home():
    return "🚀 Flask API は動作中！"


# ✅ Webページを表示するルート
@app.route('/board', methods=['GET'])
def board():
    return render_template('index.html')

# ✅ Flask を最後に実行
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
