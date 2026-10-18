# mointo

mointo は、ブラウザー上で動作するアニメーションペイントアプリです。

## 主な機能

- ペン・消しゴム・塗りつぶしなどのペイント機能
- 再生・ループ・オニオンスキン表示などのアニメーション機能
- クリップの移動・回転・拡大縮小などの動画編集機能
- 画像の読み込み、プロジェクトの保存・読み込み（`.moiproj`）
- GIF、APNG、PNG連番（ZIP）への書き出し

## 必要な環境

- Node.js（npmを含む）
- Rustツールチェーン
- `wasm-pack`

## 開発環境の起動

リポジトリのルートで以下を実行します。

```sh
cd frontend
npm install
npm run dev
```

Viteの開発サーバーが起動し、ターミナルに表示されたURLからアプリを開けます。

起動にはWebAssemblyモジュールが必要です。生成していない場合は下記のWebAssemblyのビルドを行ってください。

## WebAssemblyのビルド

描画・プロジェクト処理にはRust製WebAssemblyモジュールを使います。Rustソースを変更した場合や、生成済みモジュールがない場合は、`frontend`ディレクトリで次を実行してください。

```sh
npm run wasm
```

このコマンドは`wasm-pack`で`wasm`クレートをビルドし、生成物を`frontend/src/core/wasm`に出力します。

## 本番ビルド

```sh
cd frontend
npm run build
```

生成された静的ファイルは`frontend/dist`に出力されます。ローカルで本番ビルドを確認するには次を実行します。

```sh
npm run preview
```

## Docker

リポジトリルートにあるDockerfileを使ってビルド・起動できます。

```sh
docker build -t mointo .
docker run --rm -p 8080:80 mointo
```

起動後、`http://localhost:8080`を開きます。

## npmスクリプト

| コマンド             | 説明                            |
| -------------------- | ------------------------------- |
| `npm run dev`        | 開発サーバーを起動              |
| `npm run build`      | 本番用フロントエンドをビルド    |
| `npm run preview`    | 本番ビルドをローカルで配信      |
| `npm run typecheck`  | TypeScriptの型を確認            |
| `npm run lint:check` | Biomeでコードをチェック         |
| `npm run lint:fix`   | Biomeで自動修正可能な問題を修正 |
| `npm run wasm`       | Rust/WASMモジュールをビルド     |
